import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { chatMetadata } from '~/lib/persistence/useChatHistory';
import type { Message } from 'ai';
import { classNames } from '~/utils/classNames';

interface HistoryPanelProps {
  messages: Message[];
  onRewind?: (messageId: string) => void;
}

export const HistoryPanel = memo(({ messages, onRewind }: HistoryPanelProps) => {
  const { showHistory } = useStore(chatStore);
  const meta = useStore(chatMetadata);
  const rewindId = meta?.rewindId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('rewindTo') : null);

  
  
  const versions = useMemo(() => {
    return messages
      .filter((m) => m.role === 'assistant' && !m.annotations?.includes('hidden'))
      .map((msg, index) => {
        
        let title = `Update ${index + 1}`;
        if (msg.content) {
          const match = msg.content.match(/<falborArtifact[^>]*title="([^"]+)"/);
          if (match && match[1]) {
            title = match[1];
          } else {
            
            const funcCallMatch = msg.content.match(/(?:<|&lt;)function_calls(?:>|&gt;)[\s\S]*?\n\s*([^\n<]+?)\s*(?:<|&lt;)\/function_calls(?:>|&gt;)/i);
            if (funcCallMatch && funcCallMatch[1]) {
              title = funcCallMatch[1].trim();
            }
          }
        }

        
        const filesModifiedCount = (msg.content?.match(/<falborAction[^>]*type="file"/g) || []).length;

        return {
          id: msg.id,
          title,
          summary: `${filesModifiedCount} file(s) modified`,
        };
      }); 
  }, [messages]);

  const handleRewind = (id: string) => {
    if (confirm('Are you sure you want to revert to this version? This will overwrite your current state.')) {
      if (onRewind) {
        onRewind(id);
      } else {
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.set('rewindTo', id);
        window.location.search = searchParams.toString();
      }
      chatStore.setKey('showHistory', false);
    }
  };

  return (
    <AnimatePresence>
      {showHistory && (
        <motion.div
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute top-[1.2rem] bottom-6 left-0 w-[var(--workbench-left)] z-50 bg-falbor-elements-background-depth-2 border-y border-r border-falbor-elements-borderColor flex flex-col rounded-r-xl shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 shrink-0">
            <h2 className="text-lg font-semibold text-falbor-elements-textPrimary flex items-center gap-2">
              <div className="i-ph:clock-counter-clockwise" />
              Version History
            </h2>
            <button
              onClick={() => chatStore.setKey('showHistory', false)}
              className="p-2 rounded-md hover:bg-falbor-elements-background-depth-3 text-falbor-elements-textSecondary transition-colors"
            >
              <div className="i-ph:x" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 group/panel">
            {versions.length === 0 ? (
              <div className="text-center text-falbor-elements-textSecondary mt-10">
                No history available yet.
              </div>
            ) : (
              versions.map((version, i) => {
                const isLatest = i === versions.length - 1;
                const isActive = rewindId ? version.id === rewindId : isLatest;

                return (
                  <div
                    key={version.id}
                    className={classNames(
                      "group flex flex-col p-4 rounded-lg border border-falbor-elements-borderColor transition-colors cursor-pointer",
                      isActive
                        ? "bg-falbor-elements-background-depth-2 border-accent-500/30"
                        : "bg-falbor-elements-background-depth-1 hover:bg-falbor-elements-background-depth-2"
                    )}
                    onClick={() => handleRewind(version.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-falbor-elements-textPrimary">{version.title}</span>
                      {isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-500">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-falbor-elements-textSecondary">
                      {version.summary}
                    </div>
                    {!isActive && (
                      <div className="mt-3 text-xs font-medium text-blue-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="i-ph:arrow-u-up-left" />
                        Restore this version
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

HistoryPanel.displayName = 'HistoryPanel';
