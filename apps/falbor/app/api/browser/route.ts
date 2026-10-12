import { NextResponse } from 'next/server';
import Browserbase from '@browserbasehq/sdk';
import { chromium } from 'playwright-core';
import { withSecurity } from '~/lib/security';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { browserSessions } from '~/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { handleAuthError } from '~/lib/auth/auth-helpers';

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CONCURRENT_SESSIONS = 5;

const browserPost = withSecurity(async ({ request }) => {
  try {
    const userId = await getUserId(request as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, sessionId, url, selector, text } = await request.json();

    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;

    if (!apiKey) {
      return NextResponse.json({ error: 'BROWSERBASE_API_KEY is missing' }, { status: 400 });
    }

    const now = new Date();

    if (action === 'start') {
      if (!projectId) {
        return NextResponse.json({ error: 'BROWSERBASE_PROJECT_ID is missing in .env' }, { status: 400 });
      }

      // Check session quota
      const activeSessionsList = await db
        .select()
        .from(browserSessions)
        .where(and(eq(browserSessions.userId, userId), gt(browserSessions.expiresAt, now)));

      if (activeSessionsList.length >= MAX_CONCURRENT_SESSIONS) {
        return NextResponse.json({ error: 'Concurrent browser session quota exceeded (Max 5)' }, { status: 429 });
      }

      const bb = new Browserbase({ apiKey });
      const session = await bb.sessions.create({ projectId, keepAlive: true });

      // Wait for session to initialize by briefly connecting
      const browser = await chromium.connectOverCDP(`wss://connect.browserbase.com?apiKey=${apiKey}&sessionId=${session.id}`);
      await browser.close();

      const connectUrl = await bb.sessions.debug(session.id);

      // Record session ownership in database
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await db.insert(browserSessions).values({
        id: session.id,
        userId,
        expiresAt,
      });

      return NextResponse.json({
        sessionId: session.id,
        debugUrl: connectUrl.debuggerUrl
      });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required for browser actions' }, { status: 400 });
    }

    // Verify session ownership
    const [dbSession] = await db
      .select()
      .from(browserSessions)
      .where(and(eq(browserSessions.id, sessionId), eq(browserSessions.userId, userId)))
      .limit(1);

    if (!dbSession) {
      return NextResponse.json({ error: 'Forbidden: Browser session access denied or not found' }, { status: 403 });
    }

    // Check if session has expired
    if (dbSession.expiresAt < now) {
      // Clean up expired session
      await db.delete(browserSessions).where(eq(browserSessions.id, sessionId));
      try {
        const bb = new Browserbase({ apiKey });
        bb.sessions.update(sessionId, { status: 'REQUEST_RELEASE' }).catch(() => {});
      } catch {}
      return NextResponse.json({ error: 'Session has expired' }, { status: 410 });
    }

    // Connect to the active Browserbase session
    const browser = await chromium.connectOverCDP(`wss://connect.browserbase.com?apiKey=${apiKey}&sessionId=${sessionId}`);
    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    let result = 'Success';

    if (action === 'goto' && url) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      result = `Navigated to ${url}`;
    } else if (action === 'click' && selector) {
      await page.click(selector);
      result = `Clicked element ${selector}`;
    } else if (action === 'type' && selector && text) {
      await page.fill(selector, text);
      result = `Typed into ${selector}`;
    } else if (action === 'extract') {
      result = await page.evaluate(() => document.body.innerText);
    } else if (action === 'scroll') {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      result = 'Scrolled down';
    }

    // Disconnect without killing the browser
    await browser.close();

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('Browser API Error');
    if ((error as any).status) return handleAuthError(error);
    return NextResponse.json({ error: 'Browser action failed' }, { status: 500 });
  }
});

export async function POST(request: Request) {
  return browserPost({ request, context: { env: process.env as any } });
}
