'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChat, type Message } from '@ai-sdk/react';

export function WorkspaceVibeView({ workspaceId }: { workspaceId?: string }) {
  const chatId = `workspace-vibe-${workspaceId || 'default'}`;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getInitialMessages = (): Message[] => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(chatId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  };

  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading } = useChat({
    api: '/api/chat',
    id: chatId,
    initialMessages: getInitialMessages(),
    body: {
      chatMode: 'build',
      workspaceId,
      contextOptimization: true,
      maxLLMSteps: 10,
      allowBuild: true,
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(chatId, JSON.stringify(messages));
    }
  }, [messages, chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearChat = () => {
    localStorage.removeItem(chatId);
    setMessages([]);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-falbor-elements-background">
      {hasMessages && (
        <div className="w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 custom-scrollbar flex flex-col gap-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={m.role === 'user'
                ? 'self-end max-w-[80%] bg-purple-600 text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed'
                : 'self-start max-w-[80%] bg-white dark:bg-[#111114] border border-[#D6D6D6] dark:border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-gray-800 dark:text-gray-200 leading-relaxed shadow-sm'
              }
            >
              <div className="whitespace-pre-wrap">{typeof m.content === 'string' ? m.content : ''}</div>
            </div>
          ))}
          {isLoading && (
            <div className="self-start flex items-center gap-2 text-sm text-gray-400 px-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Centered input area */}
      <div className={`w-full max-w-3xl px-4 ${hasMessages ? 'pb-6' : 'flex flex-col items-center gap-6'}`}>
        {!hasMessages && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/10 mb-4">
              <i className="i-ph:lightning-duotone text-3xl text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Vibe Coding</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md">
              Describe what you want to build and the AI will create it instantly.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative flex items-end gap-3 bg-white dark:bg-[#111114] border border-[#D6D6D6] dark:border-white/10 rounded-2xl shadow-lg px-4 py-3">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="Describe what you want to build..."
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none leading-relaxed max-h-40 overflow-y-auto custom-scrollbar"
              style={{ minHeight: '24px' }}
            />
            <div className="flex items-center gap-2 shrink-0">
              {hasMessages && (
                <button
                  type="button"
                  onClick={clearChat}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Clear chat"
                >
                  <i className="i-ph:trash text-base" />
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-8 h-8 flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              >
                <i className="i-ph:paper-plane-right-fill text-sm" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
