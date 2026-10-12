'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import classNames from 'classnames';
import { createBrowserSession, navigateSession, getSessionTabs, switchTab, endBrowserSession } from '~/lib/actions/browser';

export function WorkspaceBrowserView({ workspaceId }: { workspaceId: string }) {
  const isBrowserOpen = useStore(aiSidebarStore.isBrowserOpen);
  const sessionId = useStore(aiSidebarStore.activeBrowserSessionId);
  const debugUrl = useStore(aiSidebarStore.activeBrowserDebugUrl);
  const activeTabId = useStore(aiSidebarStore.activeBrowserTabId);

  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('https://google.com');
  const [navigating, setNavigating] = useState(false);

  const [userTier, setUserTier] = useState<string>('free');

  useEffect(() => {
    fetch('/api/user/credits')
      .then((r) => r.json())
      .then((d) => {
        if (d.subscriptionTier) setUserTier(d.subscriptionTier.toLowerCase());
      })
      .catch(console.error);
  }, []);

  const isBrowserAllowed = userTier !== 'free';

  const [tabs, setTabs] = useState<{ id: number, url: string, title: string, debuggerFullscreenUrl?: string }[]>([]);
  const tabPollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sessionId) {
      // Poll for tabs every 3 seconds
      tabPollInterval.current = setInterval(async () => {
        const res = await getSessionTabs(sessionId);
        if (res.success && res.tabs) {
          setTabs(res.tabs);
          // If active tab doesn't exist anymore, fallback
          const activeId = aiSidebarStore.activeBrowserTabId.get();
          const activeTab = res.tabs.find((t: any) => t.id === activeId);
          if (!activeTab && res.tabs.length > 0) {
            aiSidebarStore.activeBrowserTabId.set(res.tabs[0]?.id || 0);
            if (res.tabs[0]?.debuggerFullscreenUrl) {
              aiSidebarStore.activeBrowserDebugUrl.set(res.tabs[0].debuggerFullscreenUrl);
            }
          }
        }
      }, 3000);
    } else {
      setTabs([]);
      if (tabPollInterval.current) clearInterval(tabPollInterval.current);
    }
    return () => {
      if (tabPollInterval.current) clearInterval(tabPollInterval.current);
    };
  }, [sessionId]);

  const handleSwitchTab = async (id: number) => {
    if (!sessionId) return;
    aiSidebarStore.activeBrowserTabId.set(id);
    await switchTab(sessionId, id);
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      setUrlInput(tab.url);
      if (tab.debuggerFullscreenUrl) {
        aiSidebarStore.activeBrowserDebugUrl.set(tab.debuggerFullscreenUrl);
      }
    }
  };

  const startSession = async () => {
    setLoading(true);
    try {
      const res = await createBrowserSession();
      aiSidebarStore.activeBrowserSessionId.set(res.id);
      aiSidebarStore.activeBrowserDebugUrl.set(res.debugUrl);
      aiSidebarStore.activeBrowserTabId.set(0);

      if (urlInput) {
        await navigateSession(res.id, urlInput, 0);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
    setLoading(false);
  };

  const stopSession = async () => {
    if (sessionId) {
      await endBrowserSession(sessionId);
    }
    aiSidebarStore.activeBrowserSessionId.set(null);
    aiSidebarStore.activeBrowserDebugUrl.set(null);
    aiSidebarStore.activeBrowserTabId.set(0);
    setTabs([]);
  };

  const handleNavigate = async () => {
    if (!sessionId || !urlInput) return;

    let finalUrl = urlInput;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
      setUrlInput(finalUrl);
    }

    setNavigating(true);
    try {
      await navigateSession(sessionId, finalUrl, activeTabId);
    } catch (err: any) {
      console.error(err);
      alert('Navigation failed: ' + err.message);
    }
    setNavigating(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black rounded-lg border border-gray-300 dark:border-gray-800 overflow-hidden">
      {sessionId ? (
        <button
          onClick={stopSession}
          className="text-xs px-3 py-1 rounded-md bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400 transition-colors"
        >
          <i className="i-ph:stop-bold mr-1" />
          End Session
        </button>
      ) : (
        <button
          onClick={startSession}
          disabled={loading}
          className="text-xs px-3 py-1 rounded-md bg-[#0099ff]/20 text-[#0099ff] transition-colors disabled:opacity-50"
        >
          {loading ? <i className="i-ph:spinner-bold animate-spin mr-1" /> : <i className="i-ph:play-bold mr-1" />}
          Start Browser
        </button>
      )}
      {tabs.length > 0 && (
        <div className="flex items-center gap-1 px-2 pt-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSwitchTab(tab.id)}
              className={classNames(
                "flex items-center gap-2 px-3 py-1.5 text-xs rounded-t-lg border border-b-0 max-w-[150px] transition-colors truncate",
                activeTabId === tab.id
                  ? "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 font-medium z-10 relative shadow-sm"
                  : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800/80"
              )}
            >
              <i className="i-ph:browser shrink-0" />
              <span className="truncate">{tab.title || 'New Tab'}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 bg-white dark:bg-black flex flex-col items-center justify-center relative overflow-hidden group">
        {!sessionId ? (
          <div className="text-gray-400 flex flex-col items-center gap-4 p-6 text-center">
            <div className="text-center max-w-sm">
              <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-1">
                {isBrowserAllowed ? 'Click Start Session to get started' : 'Browser View — Pro Feature'}
              </h3>
              <p className="text-xs text-gray-500">
                {isBrowserAllowed
                  ? 'Start a session to interact with the web alongside your AI.'
                  : 'Browser View allows the AI Agent to interact with a real browser on your behalf. Available on Pro and higher plans.'}
              </p>
            </div>
            {isBrowserAllowed ? (
              <button
                onClick={startSession}
                disabled={loading}
                className="mt-2 px-4 py-1.5 bg-[#0099ff]/20 text-[#0099ff] rounded-md transition-colors flex items-center gap-2 font-medium text-xs"
              >
                {loading ? <i className="i-ph:spinner-bold animate-spin" /> : <i className="i-ph:play-bold" />}
                {loading ? 'Starting...' : 'Start Session'}
              </button>
            ) : (
              <a
                href={`/workspace/${workspaceId}/upgrade`}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all text-xs flex items-center gap-2"
              >
                <i className="i-ph:sparkle-fill" />
                Upgrade to Pro
              </a>
            )}
          </div>
        ) : (
          <>
            <iframe
              src={debugUrl || ''}
              title="Browser Interactive Stream"
              className="w-full h-full border-0 bg-white"
              allow="autoplay; fullscreen; clipboard-read; clipboard-write; pointer-lock"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
            />
            {/* Fallback overlay in case of iframe auth issues */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={`https://browserbase.com/sessions/${sessionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black/70 hover:bg-black/90 text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-2 shadow-lg backdrop-blur-sm"
              >
                <i className="i-ph:arrow-square-out" />
                Open Externally (If Stuck)
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}