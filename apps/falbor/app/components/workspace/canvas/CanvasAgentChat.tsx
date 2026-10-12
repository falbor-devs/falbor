'use client';

import React, { useEffect, useState, useRef } from 'react';
import classNames from 'classnames';
import { useChat, type Message } from '@ai-sdk/react';

const AgentMessageContent = ({ content, append, isStreaming, toolInvocations }: { content: string, append: any, isStreaming: boolean, toolInvocations?: any[] }) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});

  // Check if it's currently generating JSON so we can hide messy raw syntax
  const isGeneratingJson = isStreaming && (content.includes('{') || content.includes('<falborArtifact'));
  
  // Extract any embedded JSON question blocks.
  const questions: any[] = [];
  const jsonMatches = content.match(/\{\s*"question"[\s\S]*?\]\s*\}/g);
  
  if (jsonMatches) {
    for (const m of jsonMatches) {
      try {
        const parsed = JSON.parse(m);
        if (parsed.question && Array.isArray(parsed.options)) {
          questions.push(parsed);
        }
      } catch(e) {}
    }
  }

  // Strip all XML tags (<falborArtifact>, <falborAction>, etc) to leave clean text.
  let cleanText = content.replace(/<[^>]+>/g, '').trim();
  
  // Strip the JSON blocks from the clean text
  if (jsonMatches) {
    for (const m of jsonMatches) {
      cleanText = cleanText.replace(m, '').trim();
    }
  }

  // Hide partial JSON objects while they are streaming in
  if (isStreaming) {
    cleanText = cleanText.replace(/\{\s*"question"[\s\S]*/, '').trim();
  }

  // Also clean up any loose markdown artifact leftovers
  cleanText = cleanText.replace(/## \d+\. [^\n]+/g, '').trim();

  const handleOptionToggle = (qIndex: number, opt: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [qIndex]: opt
    }));
  };

  const handleSubmit = () => {
    // Collect all answers
    const answers = questions.map((q, i) => {
      const selected = selectedOptions[i];
      return selected ? `For "${q.question}", I select: ${selected}` : null;
    }).filter(Boolean);

    if (answers.length > 0) {
      append({ role: 'user', content: answers.join('\n\n') });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {cleanText && <div className="whitespace-pre-wrap leading-relaxed">{cleanText}</div>}
      
      {!cleanText && toolInvocations && toolInvocations.length > 0 && (
        <div className="flex flex-col gap-2">
          {toolInvocations.map((tool, idx) => (
            <div key={idx} className="text-sm p-3 rounded-xl bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 self-start border border-purple-100 dark:border-purple-900/30 flex items-center gap-2 shadow-sm">
              <i className="i-ph:wrench-duotone text-lg text-purple-500" />
              <span>Agent ran tool: <strong>{tool.toolName}</strong></span>
              {tool.state === 'result' && <i className="i-ph:check-circle-fill text-green-500 ml-auto" />}
              {tool.state === 'call' && <i className="i-ph:circle-notch animate-spin text-purple-400 ml-auto" />}
            </div>
          ))}
        </div>
      )}

      {questions.map((q, idx) => (
        <div key={idx} className="border border-purple-200 dark:border-purple-900/30 rounded-xl overflow-hidden bg-white dark:bg-[#111114] shadow-sm my-1">
          <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-3 border-b border-purple-100 dark:border-purple-900/30">
            <h4 className="font-bold text-sm text-purple-900 dark:text-purple-300 flex items-center gap-2">
              <i className="i-ph:question-duotone text-lg" /> {q.question}
            </h4>
          </div>
          <div className="p-2 flex flex-col gap-1">
            {q.options.map((opt: string, i: number) => {
              const isSelected = selectedOptions[idx] === opt;
              return (
                <button
                  key={i}
                  onClick={() => handleOptionToggle(idx, opt)}
                  className={classNames(
                    "text-left px-4 py-2.5 text-sm rounded-lg transition-colors border focus:outline-none w-full",
                    isSelected 
                      ? "bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100 border-purple-300 dark:border-purple-700"
                      : "text-gray-700 dark:text-gray-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 border-transparent hover:border-purple-200 dark:hover:border-purple-800/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {isSelected && <i className="i-ph:check-circle-fill text-purple-600 dark:text-purple-400 text-lg" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {isGeneratingJson && questions.length === 0 && (
        <div className="text-sm p-3 rounded-xl bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 self-start border border-purple-100 dark:border-purple-900/30 flex items-center gap-2 shadow-sm animate-pulse">
          <i className="i-ph:circle-notch animate-spin text-purple-500" /> 
          Formatting questions...
        </div>
      )}

      {questions.length > 0 && !isStreaming && (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(selectedOptions).length === 0}
          className="mt-2 w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 focus:outline-none"
        >
          <span>Submit Answers</span>
          <i className="i-ph:paper-plane-right-fill" />
        </button>
      )}
    </div>
  );
};

export function CanvasAgentChat({ workspaceId, onUpdate }: { workspaceId?: string, onUpdate?: () => void }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const chatId = `workspace-canvas-${workspaceId || 'default'}`;

  // Read initial messages from localStorage only once on mount
  const getInitialMessages = (): Message[] => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(chatId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  };

  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, append } = useChat({
    api: '/api/chat',
    id: chatId,
    initialMessages: getInitialMessages(),
    body: {
      chatMode: 'workspace', // Workspace mode to assist the user with their existing product
      workspaceId,
      contextOptimization: true,
      maxLLMSteps: 3
    },
    onFinish: () => {
      if (onUpdate) onUpdate();
    }
  });

  const clearChat = () => {
    localStorage.removeItem(chatId);
    setMessages([]);
  };

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(chatId, JSON.stringify(messages));
    }
  }, [messages, chatId]);

  useEffect(() => {
    const loadCredits = async () => {
      try {
        const res = await fetch('/api/user/credits');
        if (res.ok) {
          const { credits } = await res.json();
          setBalance(credits);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadCredits();
  }, []);

  // Auto-scroll to bottom of tasks panel
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const onSend = (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsTasksOpen(true);
    handleSubmit(e as any);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30 flex flex-col items-center">
      
      {/* Expanding Tasks Panel (opens upward) */}
      {isTasksOpen && (
        <div className="w-full bg-white dark:bg-[#111114] border border-[#D6D6D6] dark:border-white/20 rounded-2xl shadow-xl mb-4 flex flex-col overflow-hidden max-h-[600px] animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="p-3 border-b border-[#D6D6D6] dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-[#1A1A1E]">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <i className="i-ph:list-checks-duotone text-purple-500 text-lg" />
              Agent Activity
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                title="Clear Chat History"
              >
                <i className="i-ph:trash" /> Clear
              </button>
              <button 
                onClick={() => setIsTasksOpen(false)} 
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <i className="i-ph:x" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
            {messages.length === 0 && !isLoading ? (
              <div className="text-sm text-gray-500 text-center py-6">
                <i className="i-ph:robot text-3xl mb-2 opacity-50 block" />
                The agent is currently idle. Send a message below to start a task.
              </div>
            ) : (
              messages.map((msg, i) => (
                <div 
                  key={msg.id || i} 
                  className={classNames(
                    "text-sm p-4 rounded-xl max-w-[95%]", 
                    msg.role === 'user' 
                      ? "bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100 self-end border border-purple-100 dark:border-purple-800/30" 
                      : "bg-gray-50 dark:bg-[#1A1A1E] text-gray-800 dark:text-gray-200 self-start border border-gray-200 dark:border-gray-800"
                  )}
                >
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <AgentMessageContent content={msg.content} append={append} isStreaming={isLoading && i === messages.length - 1} toolInvocations={msg.toolInvocations} />
                  )}
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="text-sm p-4 rounded-xl max-w-[85%] bg-gray-50 dark:bg-[#1A1A1E] text-gray-500 self-start border border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <i className="i-ph:circle-notch animate-spin text-purple-500" /> 
                Agent is thinking and researching...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Status / Credits Banner */}
      <div className="flex items-center gap-3 px-4 py-1.5 bg-[#dbeafe] dark:bg-[#1A1A1E] text-blue-600 dark:text-blue-400 rounded-t-xl text-xs font-medium border border-blue-200 dark:border-blue-900/50 shadow-sm transform translate-y-[1px]">
        {balance !== null ? (
          <span className="flex items-center gap-1.5">
            <i className="i-ph:coins-duotone" /> {balance} credits remaining
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <i className="i-ph:spinner-gap animate-spin" /> Loading credits...
          </span>
        )}
        <div className="w-1 h-1 rounded-full bg-blue-300 dark:bg-blue-700" />
        <span className="flex items-center gap-1.5">
          <div className="relative flex h-2 w-2">
            {isLoading && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
            <span className={classNames("relative inline-flex rounded-full h-2 w-2", isLoading ? "bg-green-500" : "bg-gray-400")}></span>
          </div>
          {isLoading ? 'Agent actively researching...' : 'Agent idle'}
        </span>
      </div>

      {/* Main Input Bar */}
      <form 
        onSubmit={onSend}
        className="relative w-full bg-white dark:bg-black rounded-2xl shadow-xl border border-[#D6D6D6] dark:border-white/20 flex overflow-hidden"
      >
        <button 
          type="button"
          onClick={() => setIsTasksOpen(!isTasksOpen)}
          className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#111114] border-r border-[#D6D6D6] dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors shrink-0"
        >
          <i className="i-ph:list-checks-duotone text-purple-500 text-lg" />
          Tasks
        </button>
        <input 
          type="text" 
          value={input}
          onChange={handleInputChange}
          placeholder="Direct the AI agent to make changes or research..."
          className="flex-1 bg-transparent px-4 py-3 outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 min-w-0"
        />
        <button 
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4 text-purple-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-[#111114] transition-colors shrink-0"
        >
          <i className="i-ph:paper-plane-right-fill text-xl" />
        </button>
      </form>
    </div>
  );
}
