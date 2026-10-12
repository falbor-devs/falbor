'use client';

import { v4 } from 'uuid';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { canvasActions } from '~/lib/stores/canvasStore';
import { isUiTool, uiSchemas } from './schema';

// Ids from the model are scoped per run so an old "inspect" status is never reused by a later message.
let runScope = v4();
export const beginUiRun = () => {
    runScope = v4();
};

const scoped = (id: string) => `${runScope}:${id}`;

const faviconFor = (url: string) => {
    try {
        return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
    } catch {
        return undefined;
    }
};

/** Applies a model-emitted UI tool call to the store. Returns true if it was a UI tool. */
export function applyUiCall(name: string, rawArgs: unknown): boolean {
    if (!isUiTool(name)) return false;

    const parsed = uiSchemas[name].safeParse(rawArgs);
    if (!parsed.success) {
        console.error(`[agent-ui] 🚨 CRITICAL ERROR: Invalid ${name} arguments!`, parsed.error.flatten(), 'Raw args:', rawArgs);
        // Force the error to show in the server terminal via a quick fetch if needed, 
        // but it'll definitely show in the browser console.
        fetch('/api/intelligence/chat', { method: 'POST', body: JSON.stringify({ errorLog: parsed.error.flatten() }) }).catch(() => {});
        return true;
    }
    console.log(`[agent-ui] ✅ Tool called successfully: ${name}`, parsed.data);
    const args: any = parsed.data;

    switch (name) {
        case 'ui_status': {
            const id = args.id ? scoped(args.id) : v4();
            const existing = aiSidebarStore.events.get().find((e) => e.id === id);
            const state = args.state ?? 'active';
            if (state === 'active') {
                aiSidebarStore.settleActive({ except: id, types: ['status', 'progress'] });
            }
            aiSidebarStore.upsertEvent({
                id,
                type: 'status',
                title: args.label ?? existing?.title ?? 'Working',
                status: state,
                ...(args.detail ? { details: [args.detail] } : {}),
            });
            break;
        }
        case 'ui_button':
            aiSidebarStore.addEvent({
                id: v4(),
                type: 'button',
                title: args.label,
                action: args.prompt,
                status: 'pending',
            });
            break;
        case 'ui_progress': {
            const id = args.id ? scoped(args.id) : v4();
            aiSidebarStore.upsertEvent({
                id,
                type: 'progress',
                title: args.label,
                progressValue: args.value,
                status: args.value >= 100 ? 'completed' : 'active',
            });
            break;
        }
        case 'ui_options':
            aiSidebarStore.resolvePending(['options']);
            aiSidebarStore.addEvent({
                id: v4(),
                type: 'options',
                title: args.question,
                details: args.options,
                recommended: args.recommended,
                status: 'pending',
            });
            break;
        case 'ui_links':
            aiSidebarStore.addEvent({
                id: v4(),
                type: 'links',
                title: 'Sources',
                links: args.links.map((l: any) => ({ url: l.url, title: l.title, favicon: faviconFor(l.url) })),
                status: 'completed',
            });
            break;
        case 'ui_widget': {
            const id = args.id ? scoped(args.id) : v4();
            aiSidebarStore.upsertEvent({
                id,
                type: 'widget',
                title: args.title ?? 'Live Visual Preview',
                html: args.html,
                status: 'completed',
            });
            break;
        }
        case 'ui_canvas_focus': {
            canvasActions.focus(args.x, args.y);
            break;
        }
        case 'ui_canvas_draw': {
            canvasActions.draw(args.id, args.type, args.x, args.y, args.content, args.label);
            
            // Automatically drop a 'Locate on Canvas' button in the chat
            aiSidebarStore.addEvent({
                id: v4(),
                type: 'button',
                title: 'Locate on Canvas',
                action: `LOCAL:CANVAS_LOCATE:${args.x}:${args.y}`,
                status: 'pending',
            });
            break;
        }
        case 'ui_browser_session': {
            const id = args.id ? scoped(args.id) : v4();
            aiSidebarStore.upsertEvent({
                id,
                type: 'browser',
                title: args.title ?? 'Browser Use Cloud Session',
                status: args.isFinished ? 'completed' : 'active',
                browserSession: {
                    url: args.url,
                    liveStreamUrl: args.liveStreamUrl,
                    recordingUrl: args.recordingUrl,
                    statusText: args.statusText ?? 'Live browser session running...',
                    actionText: args.actionText,
                    isFinished: args.isFinished ?? false,
                },
            });
            break;
        }
        case 'ui_cursor_click': {
            if (typeof window !== 'undefined') {
                const targetStr = (args.target || '').toLowerCase().trim();

                // Trigger animated visual cursor indicator
                const cursorEl = document.createElement('div');
                cursorEl.className = 'fixed w-6 h-6 z-[999999] pointer-events-none transition-all duration-700 ease-out text-blue-500 transform -translate-x-1/2 -translate-y-1/2';
                cursorEl.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 filter drop-shadow"><path d="M3 3l7 18 3-7 7-3L3 3z"/></svg>`;
                cursorEl.style.left = '50%';
                cursorEl.style.top = '50%';
                document.body.appendChild(cursorEl);

                let targetBtn: HTMLElement | null = null;
                if (targetStr.includes('canvas')) {
                    targetBtn = document.querySelector('a[href*="/canvas"]') || Array.from(document.querySelectorAll('a, button')).find(el => el.textContent?.toLowerCase().includes('canvas')) as HTMLElement;
                } else if (targetStr.includes('vibe')) {
                    targetBtn = document.querySelector('a[href*="/vibe"]') || Array.from(document.querySelectorAll('a, button')).find(el => el.textContent?.toLowerCase().includes('vibe')) as HTMLElement;
                } else if (targetStr.includes('sources')) {
                    targetBtn = document.querySelector('a[href*="/sources"]') || Array.from(document.querySelectorAll('a, button')).find(el => el.textContent?.toLowerCase().includes('sources')) as HTMLElement;
                } else if (targetStr.includes('settings')) {
                    targetBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.toLowerCase().includes('settings') || el.querySelector('.i-ph\\:gear')) as HTMLElement;
                } else {
                    targetBtn = document.querySelector(args.target) || Array.from(document.querySelectorAll('button, a')).find(el => el.textContent?.toLowerCase().includes(targetStr)) as HTMLElement;
                }

                if (targetBtn) {
                    const rect = targetBtn.getBoundingClientRect();
                    cursorEl.style.left = `${rect.left + rect.width / 2}px`;
                    cursorEl.style.top = `${rect.top + rect.height / 2}px`;

                    setTimeout(() => {
                        targetBtn?.click();
                        setTimeout(() => cursorEl.remove(), 800);
                    }, 500);
                } else {
                    setTimeout(() => cursorEl.remove(), 1000);
                }
            }
            break;
        }
        case 'ui_google_ads_fill': {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('google_ads_fill', { detail: args }));
            }
            break;
        }
    }
    return true;
}