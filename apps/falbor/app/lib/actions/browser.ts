'use server';

import { Browserbase } from '@browserbasehq/sdk';
import { db } from '~/lib/db';
import { users } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';

const bb = process.env.BROWSERBASE_API_KEY ? new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
}) : null;

export async function createBrowserSession(projectId?: string) {
  if (!bb) {
    throw new Error('BROWSERBASE_API_KEY is not configured');
  }

  const pId = projectId || process.env.BROWSERBASE_PROJECT_ID;
  if (!pId) {
    throw new Error('BROWSERBASE_PROJECT_ID is not configured');
  }

  try {
    let contextId: string | undefined = undefined;
    const authUser = await getAuthUserDetails();
    let user: any = null;
    
    if (authUser) {
      user = await db.query.users.findFirst({ where: eq(users.email, authUser.email) });
      if (user) {
        const stats = (user.stats as any) || {};
        if (stats.browserContextId) {
          contextId = stats.browserContextId;
        } else {
          // Create a new context and save it
          const newContext = await bb.contexts.create({ projectId: pId });
          contextId = newContext.id;
          stats.browserContextId = contextId;
          await db.update(users).set({ stats }).where(eq(users.id, user.id));
        }
      }
    }

    let session;
    try {
      session = await bb.sessions.create({
        projectId: pId,
        keepAlive: true,
        browserSettings: {
          viewport: { width: 1280, height: 720 },
          context: contextId ? { id: contextId } : undefined
        }
      });
    } catch (err: any) {
      if (err.message?.includes('Context ID not found') && user) {
        console.log('Context ID not found, recreating it for user...', user.id);
        const newContext = await bb.contexts.create({ projectId: pId });
        contextId = newContext.id;
        const stats = (user.stats as any) || {};
        stats.browserContextId = contextId;
        await db.update(users).set({ stats }).where(eq(users.id, user.id));
        
        session = await bb.sessions.create({
          projectId: pId,
          keepAlive: true,
          browserSettings: {
            viewport: { width: 1280, height: 720 },
            context: { id: contextId }
          }
        });
      } else {
        throw err;
      }
    }

    let debugUrl = `https://browserbase.com/inspect?sessionId=${session.id}`;
    try {
      const debugInfo = await bb.sessions.debug(session.id);
      if (debugInfo && debugInfo.debuggerFullscreenUrl) {
        debugUrl = debugInfo.debuggerFullscreenUrl;
      }
    } catch (e) {
      console.error('Failed to get debug URLs', e);
    }

    return {
      id: session.id,
      connectUrl: session.connectUrl,
      debugUrl
    };
  } catch (error: any) {
    console.error('Failed to create Browserbase session', error);
    throw new Error(error.message || 'Failed to create session');
  }
}

export async function endBrowserSession(sessionId: string) {
  if (!bb) throw new Error('BROWSERBASE_API_KEY is not configured');
  try {
    await bb.sessions.update(sessionId, { status: 'REQUEST_RELEASE' });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to end Browserbase session', error);
    return { success: false, error: error.message };
  }
}

export async function getSessionDetails(sessionId: string) {
  if (!bb) throw new Error('BROWSERBASE_API_KEY is not configured');
  
  try {
    const session = await bb.sessions.retrieve(sessionId);
    return session;
  } catch (error: any) {
    console.error('Failed to retrieve Browserbase session', error);
    throw new Error(error.message || 'Failed to retrieve session');
  }
}

export async function connectToBrowserbaseSession(sessionId: string) {
  const { chromium } = require('playwright-core');
  const browser = await chromium.connectOverCDP(`wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`);
  const contexts = browser.contexts();
  const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
  return { browser, context };
}

export async function navigateSession(sessionId: string, url: string, tabIndex: number = 0) {
  try {
    const { browser, context } = await connectToBrowserbaseSession(sessionId);
    
    try {
      const pages = context.pages();
      const page = pages[tabIndex] || await context.newPage();
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } finally {
      await browser.close();
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to navigate via Playwright', err);
    throw new Error(err.message || 'Failed to navigate session');
  }
}

export async function switchTab(sessionId: string, tabIndex: number) {
  try {
    const { browser, context } = await connectToBrowserbaseSession(sessionId);
    try {
      const pages = context.pages();
      const page = pages[tabIndex];
      if (page) {
        await page.bringToFront();
      }
    } finally {
      await browser.close();
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to switch tab', err);
    return { success: false, error: err.message };
  }
}

export async function getSessionTabs(sessionId: string) {
  if (!bb) return { success: false, tabs: [], error: 'API key not configured' };
  try {
    const debugInfo = await bb.sessions.debug(sessionId);
    const tabs = debugInfo.pages.map((p, idx) => ({
      id: idx, // Keep index as ID for now to match agent logic
      pageId: p.id,
      url: p.url,
      title: p.title || 'Untitled',
      debuggerFullscreenUrl: p.debuggerFullscreenUrl,
    }));
    return { success: true, tabs };
  } catch (err: any) {
    console.error('Failed to get session tabs', err);
    return { success: false, tabs: [], error: err.message };
  }
}
