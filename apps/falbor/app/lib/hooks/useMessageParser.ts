import type { Message } from 'ai';
import { useCallback, useState, useRef } from 'react';
import { EnhancedStreamingMessageParser } from '~/lib/runtime/enhanced-message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('useMessageParser');

const isLiveCodeEnabled = () => {
  if (typeof window === 'undefined') return false;
  try {
    return JSON.parse(localStorage.getItem('falbor_write_code_in_live') || 'false');
  } catch {
    return false;
  }
};

const messageParser = new EnhancedStreamingMessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      logger.trace('onArtifactOpen', data);

      workbenchStore.showWorkbench.set(true);
      workbenchStore.addArtifact(data);
    },
    onArtifactClose: (data) => {
      logger.trace('onArtifactClose');

      workbenchStore.updateArtifact(data, { closed: true });
    },
    onActionOpen: (data) => {
      logger.trace('onActionOpen', data.action);

      if (data.action.type === 'file') {
        workbenchStore.addAction(data);
      }
    },
    onActionClose: (data) => {
      logger.trace('onActionClose', data.action);

      if (data.action.type !== 'file') {
        workbenchStore.addAction(data);
      }

      workbenchStore.runAction(data);
    },
    onActionStream: (data) => {
      logger.trace('onActionStream', data.action);

      const isMobile = typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);
      if (isMobile && data.action.type === 'file') {
        return;
      }

      workbenchStore.runAction(data, true);
    },
  },
});
const extractTextContent = (message: Message) =>
  (Array.isArray(message.content)
    ? (message.content.find((item) => item.type === 'text')?.text as string) || ''
    : message.content) || '';

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<{ [key: string]: string }>({});
  const parsedMessagesRef = useRef<{ [key: string]: string }>({});

  const parseMessages = useCallback((messages: Message[], isLoading: boolean) => {
    let didGlobalReset = false;

    let hasUpdates = false;

    for (const message of messages) {
      if (message.role === 'assistant' || message.role === 'user') {
        const newParsedContent = messageParser.parse(message.id, extractTextContent(message));

        const shouldReplace = messageParser.wasReset;

        if (newParsedContent || shouldReplace) {
          parsedMessagesRef.current[message.id] = !shouldReplace
            ? (parsedMessagesRef.current[message.id] || '') + newParsedContent
            : newParsedContent;
          hasUpdates = true;
        }

        if (!isLoading) {
          messageParser.complete(message.id);
        }
      }
    }

    if (hasUpdates) {
      setParsedMessages({ ...parsedMessagesRef.current });
    }
  }, []);

  return { parsedMessages, parseMessages };
}