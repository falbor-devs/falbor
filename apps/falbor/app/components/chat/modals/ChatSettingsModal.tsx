import React, { useState } from 'react';
import { DialogRoot, Dialog, DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { SetupButton } from '~/components/ui/setup/SetupButton';
import { classNames } from '~/utils/classNames';
import { AnalyticsTab } from '~/components/@settings/tabs/chat/AnalyticsTab';
import { ChatSettingsTab } from '~/components/@settings/tabs/chat/ChatSettingsTab';
import { DomainTab } from '~/components/@settings/tabs/chat/DomainTab';
import TemplateTab from '~/components/@settings/tabs/chat/Template';
import TestingTab from '~/components/@settings/tabs/chat/Testing';
import { Badge } from '../../ui';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSettingsModal({ isOpen, onClose }: ChatSettingsModalProps) {
  const [activeTab, setActiveTab] = useState('chat');

  const enableAnalytics = () => {
    onClose();

    const agentPrompt = `
# Add Falbor Analytics

Set up the Falbor Analytics SDK directly in my project without requiring an NPM package. Please follow these instructions carefully.

## 1. Create the SDK File
Create a new utility file at \`lib/falbor-analytics.ts\` (or \`src/lib/falbor-analytics.ts\` depending on the project structure) and paste the exact code below into it.

\`\`\`typescript
export interface AnalyticsOptions {
  projectId: string;
  endpoint?: string;
  environment?: string;
  options?: {
    enableAutoTracking?: boolean;
    debugMode?: boolean;
  };
}

export interface AnalyticsEvent {
  projectId: string;
  event: string;
  path: string;
  referrer: string;
  url: string;
  timestamp: number;
  properties?: Record<string, any>;
}

class FalborAnalytics {
  private config: AnalyticsOptions | null = null;
  private initialized = false;
  private defaultEndpoint = 'https://analytics.falbor.xyz/api/event';

  init(config: AnalyticsOptions) {
    this.config = config;
    this.initialized = true;

    if (this.config.options?.debugMode) {
      console.log('[Falbor Analytics] Initialized with config:', this.config);
    }

    if (this.config.options?.enableAutoTracking) {
      this.setupAutoTracking();
    }

    return this;
  }

  private setupAutoTracking() {
    if (typeof window === 'undefined') return;

    this.track('pageview');

    const originalPushState = history.pushState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      window.dispatchEvent(new Event('pushstate'));
    };

    const originalReplaceState = history.replaceState;

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('replacestate'));
    };

    const handleRouteChange = () => {
      this.track('pageview');
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('pushstate', handleRouteChange);
    window.addEventListener('replacestate', handleRouteChange);
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.initialized || !this.config) {
      console.warn('[Falbor Analytics] SDK not initialized. Call init() first.');
      return;
    }

    if (typeof window === 'undefined') return;

    const endpoint = this.config.endpoint || this.defaultEndpoint;

    const payload: AnalyticsEvent = {
      projectId: this.config.projectId,
      event: eventName,
      path: window.location.pathname,
      referrer: document.referrer,
      url: window.location.href,
      timestamp: Date.now(),
      properties,
    };

    if (this.config.options?.debugMode) {
      console.log(\`[Falbor Analytics] Tracking Event: \${eventName}\`, payload);
    }

    try {
      fetch(endpoint, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (this.config.options?.debugMode) {
        console.error('[Falbor Analytics] Error sending event:', error);
      }
    }
  }
}

export const analytics = new FalborAnalytics();

export function initFalborAnalytics(config: AnalyticsOptions) {
  return analytics.init(config);
}

export default analytics;
\`\`\`

## 2. Environment Setup
Check the environment variables. Ensure that the following key can be securely injected:
- \`FALBOR_PROJECT_ID\` (If unavailable, use a placeholder and instruct the user to configure it)

## 3. App Integration
Import and initialize this utility file in the main layout or app entry point (e.g., \`app/layout.tsx\` or \`pages/_app.tsx\`) so that auto-tracking begins immediately on load.

\`\`\`javascript
import { initFalborAnalytics } from '@/lib/falbor-analytics';

if (typeof window !== 'undefined') {
  initFalborAnalytics({
    projectId:
      process.env.FALBOR_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FALBOR_PROJECT_ID ||
      'demo-project',
    options: {
      enableAutoTracking: true,
      debugMode: process.env.NODE_ENV === 'development',
    },
  });
}
\`\`\`
`;

    const event = new CustomEvent('falbor:externalChatMessage', {
      detail: agentPrompt,
    });

    window.dispatchEvent(event);
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog
        showCloseButton={true}
        onClose={onClose}
        className="!w-[90vw] !max-w-[1200px] p-0 overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333]"
      >
        <div className="flex h-[800px] w-full">
          <div className="w-[240px] bg-[#F9F6F9] dark:bg-[#111] p-4 flex flex-col gap-2 shrink-0">
            <h3 className="text-lg font-medium text-black/80 dark:text-gray-400 px-2">
              Settings Chat
            </h3>
            <button
              onClick={() => setActiveTab('chat')}
              className={classNames(
                'flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors',
                activeTab === 'chat'
                  ? 'bg-[#F0EDF0] dark:bg-indigo-900/20 text-black dark:text-white'
                  : 'text-[#73737B] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222]',
              )}
            >
              <div className="i-ph:gear w-4 h-4 mr-2" />
              Chat
            </button>

            <button
              onClick={() => setActiveTab('domain')}
              className={classNames(
                'flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors font-medium',
                activeTab === 'domain'
                  ? 'bg-[#F0EDF0] dark:bg-indigo-900/20 text-black dark:text-white'
                  : 'text-[#73737B] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222]',
              )}
            >
              <div className="i-ph:globe-simple w-4 h-4 mr-2" />
              <span>Domain & SEO</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={classNames(
                'flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors font-medium',
                activeTab === 'analytics'
                  ? 'bg-[#F0EDF0] dark:bg-indigo-900/20 text-black dark:text-white'
                  : 'text-[#73737B] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222]',
              )}
            >
              <div className="i-ph:chart-line-up w-4 h-4 mr-2" />

              <span>Analytics</span>

              <Badge variant="secondary" className="ml-2">
                Soon
              </Badge>
            </button>

            <button
              onClick={() => setActiveTab('template')}
              className={classNames(
                'flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors font-medium',
                activeTab === 'template'
                  ? 'bg-[#F0EDF0] dark:bg-indigo-900/20 text-black dark:text-white'
                  : 'text-[#73737B] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222]',
              )}
            >
              <div className="i-ph:paint-brush w-4 h-4 mr-2" />
              <span>Template</span>
            </button>

            <button
              onClick={() => setActiveTab('testing')}
              className={classNames(
                'flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors font-medium',
                activeTab === 'testing'
                  ? 'bg-[#F0EDF0] dark:bg-indigo-900/20 text-black dark:text-white'
                  : 'text-[#73737B] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222]',
              )}
            >
              <div className="i-ph:flask w-4 h-4 mr-2" />
              <span>Testing</span>
            </button>
          </div>

          {}
          <div className="flex-1 min-w-0 p-3 bg-[#F9F6F9] dark:bg-[#111]">
            <div className="w-full h-full p-6 border rounded-lg bg-white dark:bg-[#1a1a1a] flex flex-col overflow-hidden">
              {activeTab === 'chat' && <ChatSettingsTab />}

              {activeTab === 'domain' && <DomainTab />}

              {activeTab === 'analytics' && (
                <AnalyticsTab onEnableAnalytics={enableAnalytics} />
              )}

              {activeTab === 'template' && <TemplateTab />}
              
              {activeTab === 'testing' && <TestingTab />}
            </div>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}