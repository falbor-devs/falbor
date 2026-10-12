import React, { useEffect, useRef, useState } from 'react';
import { RichTextEditor } from '~/components/ui/RichTextEditor';
import { useChat } from 'ai/react';

interface AiExtractionTabProps {
  isAiProcessing: boolean;
  setIsAiProcessing: (processing: boolean) => void;
  promptContent: string;
  setPromptContent: (content: string) => void;
  isSubmitting: boolean;
  handleNext: () => void;
  url?: string;
  githubRepo?: string;
}

export function AiExtractionTab({
  isAiProcessing,
  setIsAiProcessing,
  promptContent,
  setPromptContent,
  isSubmitting,
  handleNext,
  url,
  githubRepo
}: AiExtractionTabProps) {
  const [showAiLive, setShowAiLive] = useState(false);
  const { append, messages, isLoading } = useChat({
    api: '/api/workspace/extract-context',
    body: { url, githubRepo },
    onFinish: (message) => {
      setIsAiProcessing(false);
      if (message.content) {
        setPromptContent(message.content);
      }
    },
    onError: (error) => {
      console.error(error);
      setIsAiProcessing(false);
      setPromptContent(`An error occurred while scanning: ${error.message}\n\nPlease try again or manually enter the context.`);
    }
  });

  const hasTriggered = useRef(false);

  useEffect(() => {
    if (isAiProcessing && !isLoading && messages.length === 0 && !hasTriggered.current) {
      hasTriggered.current = true;
      append({ role: 'user', content: 'Start extraction' });
    }
  }, [isAiProcessing, append, isLoading, messages.length]);

  // Sync streaming completion to the promptContent state so it shows live in the editor
  useEffect(() => {
    if (isLoading && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content) {
        setPromptContent(lastMessage.content);
      }
    }
  }, [messages, isLoading, setPromptContent]);

  const lastMessage = messages[messages.length - 1];
  const toolInvocations = lastMessage?.role === 'assistant' ? lastMessage.toolInvocations : undefined;

  return (
    <div className="flex flex-col w-full h-full min-h-[700px] p-6 bg-gray-50 dark:bg-[#111114]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Context Extraction</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isAiProcessing
              ? "Scanning source, running web searches, and gathering product context..."
              : "Review and edit the extracted context before saving."}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            {toolInvocations && toolInvocations.length > 0 && (
              <>
                <button 
                  onClick={() => setShowAiLive(!showAiLive)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-[#2B2D31] text-gray-800 dark:text-white border border-gray-200 dark:border-[#353538] hover:bg-gray-100 dark:hover:bg-[#353538] transition-colors shadow-sm text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-[#0099ff] animate-pulse" />
                  AI Live
                  <div className={`i-ph:caret-down text-gray-500 dark:text-gray-400 transition-transform ${showAiLive ? 'rotate-180' : ''}`} />
                </button>

                {showAiLive && (
                  <div className="absolute right-0 top-full mt-2 w-80 max-h-[400px] overflow-y-auto bg-white dark:bg-[#1C1D21] border border-gray-200 dark:border-[#353538] rounded-xl shadow-xl z-50 p-3 flex flex-col gap-2">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 px-1 uppercase tracking-wider">AI Activity Log</h3>
                    {toolInvocations.map((toolInvocation) => {
                      const { toolCallId, toolName, state, args, result } = toolInvocation as any;
                      
                      let icon = 'i-ph:magnifying-glass';
                      let text = 'Searching...';
                      let queryContext = '';

                      if (toolName === 'searchReddit') {
                        icon = 'i-ph:reddit-logo text-[#FF4500]';
                        text = 'Searching Reddit';
                        queryContext = args?.query;
                      } else if (toolName === 'webSearch') {
                        icon = 'i-ph:globe text-[#0099ff]';
                        text = 'Searching the web';
                        queryContext = args?.query;
                      } else if (toolName === 'readPageContent') {
                        icon = 'i-ph:book-open-text text-green-500 dark:text-green-400';
                        text = 'Reading website';
                        queryContext = args?.url;
                      }
                      
                      let urls: string[] = [];
                      if (state === 'result' && typeof result === 'string') {
                         const foundUrls = result.match(/https?:\/\/[^\s"'<)]+/g);
                         if (foundUrls) {
                            urls = Array.from(new Set(foundUrls));
                         }
                      }

                      return (
                        <div key={toolCallId} className={`flex flex-col gap-2 p-3 rounded-md bg-gray-100 dark:bg-[#2B2D31] text-sm ${state !== 'result' ? 'animate-pulse border border-gray-200 dark:border-[#353538]' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className={`${icon} text-lg shrink-0`} />
                            <div className="flex-1 flex flex-col overflow-hidden">
                              <span className="font-medium text-gray-900 dark:text-white">{state === 'result' ? `Finished ${text.toLowerCase()}` : `${text}...`}</span>
                              {queryContext && <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full" title={queryContext}>{queryContext}</span>}
                            </div>
                            {state === 'result' && <div className="i-ph:check text-green-500 dark:text-green-400 shrink-0" />}
                          </div>
                          
                          {urls.length > 0 && (
                            <details className="mt-1">
                              <summary className="text-xs text-[#0099ff] cursor-pointer hover:underline mb-1 select-none">
                                View {urls.length} link{urls.length > 1 ? 's' : ''} found
                              </summary>
                              <div className="flex flex-col gap-1 pl-2 border-l-2 border-gray-200 dark:border-[#353538] mt-1 ml-1 overflow-hidden">
                                {urls.map((u, i) => (
                                  <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#0099ff] truncate w-full block transition-colors" title={u}>
                                    {u}
                                  </a>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={isSubmitting || !promptContent.trim()}
            className={`px-6 py-2 rounded-lg font-medium transition-colors shadow-sm ${!isSubmitting && promptContent.trim()
              ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 cursor-pointer'
              : 'bg-gray-200 text-gray-400 dark:bg-[#1C1D21] dark:text-gray-600 cursor-not-allowed'
              }`}
          >
            {isSubmitting ? 'Saving...' : 'Save & Enter Workspace'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg relative">
        {isAiProcessing && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white dark:bg-[#2B2D31] px-3 py-1.5 rounded-full text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-[#353538] shadow-sm">
            <div className="w-2 h-2 rounded-full bg-[#0099ff] animate-pulse" />
            GPT-5.6-Luna is scanning the internet...
          </div>
        )}
        <RichTextEditor
          value={promptContent}
          onChange={setPromptContent}
          readOnly={isAiProcessing}
        />
      </div>
    </div>
  );
}
