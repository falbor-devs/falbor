'use client';

import React, { useState } from 'react';
import type { Message } from 'ai';
import { classNames } from '~/utils/classNames';
import { Messages } from '../messages/Messages.client';
import type { ProviderInfo } from '~/types/model';

interface LiveMessagesDrawerProps {
  messages: Message[];
  isStreaming?: boolean;
  append?: (message: Message) => void;
  chatMode?: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research';
  setChatMode?: (mode: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research') => void;
  model?: string;
  provider?: ProviderInfo;
  addToolResult?: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
}

export function LiveMessagesDrawer({
  messages,
  isStreaming,
  append,
  chatMode,
  setChatMode,
  model,
  provider,
  addToolResult = () => {},
}: LiveMessagesDrawerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="w-full flex flex-col items-center z-30" data-interactive="true">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-4 py-2 rounded-t-xl border border-b-0 border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-md"
      >
        <span className="i-ph:chats-circle-duotone text-indigo-500 text-base" />
        <span>Live Messages & MCP Stream</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono">
          {messages.length}
        </span>
        <span className={classNames('text-xs transition-transform duration-200', isOpen ? 'rotate-180' : '')}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          className="w-full max-w-chat h-[400px] rounded-b-xl rounded-t-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
          data-scrollable="true"
        >
          <div className="flex-1 p-4 overflow-y-auto" data-scrollable="true">
            {messages.length === 0 ? (
              <div className="text-zinc-400 italic text-center py-12 text-xs font-mono">
                No active chat messages to display yet.
              </div>
            ) : (
              <Messages
                className="flex flex-col w-full"
                messages={messages}
                isStreaming={isStreaming}
                append={append}
                chatMode={chatMode}
                setChatMode={setChatMode}
                provider={provider}
                model={model}
                addToolResult={addToolResult}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
