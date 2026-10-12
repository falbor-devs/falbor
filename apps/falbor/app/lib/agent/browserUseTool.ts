import { tool } from 'ai';
import { z } from 'zod';
import { connectToBrowserbaseSession } from '../actions/browser';

export function createBrowserUseTools(browserSessionId?: string, browserActiveTabId?: number) {
  let currentTabId = browserActiveTabId !== undefined ? browserActiveTabId : 0;

  const checkSession = () => {
    if (!browserSessionId) {
      throw new Error('No active browser session. Ask the user to click "Start Browser" in the Browser View first.');
    }
  };

  const executeOnPage = async <T>(
    requestedTabId: number | undefined, 
    action: (page: any) => Promise<T>
  ): Promise<T> => {
    checkSession();
    if (requestedTabId !== undefined) {
      currentTabId = requestedTabId;
    }
    const { browser, context } = await connectToBrowserbaseSession(browserSessionId!);
    try {
      const pages = context.pages();
      const index = currentTabId < pages.length ? currentTabId : (pages.length > 0 ? pages.length - 1 : 0);
      const page = pages[index] || await context.newPage();
      return await action(page);
    } finally {
      await browser.close(); // Disconnects CDP, doesn't kill the session
    }
  };

  return {
    browser_navigate: tool({
      description: 'Navigate to a specific URL in the browser session.',
      parameters: z.object({ 
        url: z.string().url(),
        tabId: z.number().optional().describe('The index of the tab to navigate in. Defaults to the current tab.')
      }),
      execute: async ({ url, tabId }) => {
        try {
          await executeOnPage(tabId, async (page) => {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
          });
          return { success: true, url, message: `Navigated to ${url}` };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }
    }),
    browser_click: tool({
      description: 'Click an element on the current page.',
      parameters: z.object({ 
        selector: z.string().describe('CSS selector of the element to click'),
        tabId: z.number().optional()
      }),
      execute: async ({ selector, tabId }) => {
        try {
          await executeOnPage(tabId, async (page) => {
            await page.locator(selector).first().click();
          });
          return { success: true, message: `Clicked element: ${selector}` };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }
    }),
    browser_type: tool({
      description: 'Type text into an input field on the current page.',
      parameters: z.object({ 
        selector: z.string().describe('CSS selector of the input field'), 
        text: z.string(),
        pressEnter: z.boolean().optional().describe('Set to true to press Enter after typing. Useful for submitting search forms or chat inputs.'),
        tabId: z.number().optional()
      }),
      execute: async ({ selector, text, pressEnter, tabId }) => {
        try {
          await executeOnPage(tabId, async (page) => {
            const el = page.locator(selector).first();
            await el.click();
            await page.keyboard.insertText(text);
            if (pressEnter) {
              await page.keyboard.press('Enter');
            }
          });
          return { success: true, message: `Typed "${text}" into ${selector}${pressEnter ? ' and pressed Enter' : ''}` };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }
    }),
    browser_get_elements: tool({
      description: 'Get a list of all interactive elements (buttons, links, inputs) on the page to help you find the correct CSS selector. If it returns empty, the page might be loading; try calling it again.',
      parameters: z.object({ tabId: z.number().optional() }),
      execute: async ({ tabId }) => {
        try {
          return await executeOnPage(tabId, async (page) => {
            // Wait a moment for SPA rendering/animations to finish before scanning
            await page.waitForTimeout(1500);
            const elements = await page.evaluate(() => {
              function getInteractives(root: Document | ShadowRoot) {
                let els = Array.from(root.querySelectorAll('button, a, input, textarea, select, [role="button"], [role="textbox"], [contenteditable="true"]'));
                const allElements = Array.from(root.querySelectorAll('*'));
                for (const el of allElements) {
                  if (el.shadowRoot) {
                    els = els.concat(getInteractives(el.shadowRoot));
                  }
                }
                return els;
              }
              const interactives = getInteractives(document);
              
              let counter = 0;
              return interactives.filter((el: any) => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
              }).map((el: any) => {
                const id = ++counter;
                el.setAttribute('data-ai-id', id.toString());
                
                let tag = el.tagName.toLowerCase();
                let text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().substring(0, 60);
                if (!text && el.type === 'submit') text = 'Submit';
                
                return { tag, text: text || '<no text>', selector: `[data-ai-id="${id}"]` };
              }).filter((e: any) => e.text !== '<no text>' || e.tag === 'input' || e.tag === 'textarea' || e.tag === 'div' || e.tag === 'p');
            });
            return { success: true, elements };
          });
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }
    }),
    browser_new_tab: tool({
      description: 'Open a new tab and optionally navigate to a URL.',
      parameters: z.object({ url: z.string().url().optional() }),
      execute: async ({ url }) => {
        try {
          checkSession();
          const { browser, context } = await connectToBrowserbaseSession(browserSessionId!);
          try {
            const page = await context.newPage();
            if (url) {
              await page.goto(url, { waitUntil: 'domcontentloaded' });
            }
            const pages = context.pages();
            const newTabId = pages.indexOf(page);
            currentTabId = newTabId; // Remember the newly created tab for subsequent actions!
            return { success: true, tabId: newTabId, message: `Opened new tab (ID: ${newTabId})` };
          } finally {
            await browser.close();
          }
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }
    }),
    browser_read: tool({
      description: 'Read and extract text content from the current page.',
      parameters: z.object({ 
        selector: z.string().optional().describe('Optional CSS selector to read specific content. If omitted, reads the body.'),
        tabId: z.number().optional()
      }),
      execute: async ({ selector, tabId }) => {
        try {
          return await executeOnPage(tabId, async (page) => {
            const content = await page.locator(selector || 'body').innerText();
            return { success: true, data: content.substring(0, 5000) }; // Limit size
          });
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }
    }),
  };
}