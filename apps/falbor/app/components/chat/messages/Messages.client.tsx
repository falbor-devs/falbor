'use client';
import type { Message } from 'ai';
import { Fragment } from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';

import { db, chatId, chatMetadata } from '~/lib/persistence/useChatHistory';
import { forkChat } from '~/lib/persistence/db';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { forwardRef } from 'react';
import type { ForwardedRef } from 'react';
import type { ProviderInfo } from '~/types/model';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
  append?: (message: Message) => void;
  chatMode?: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research' | 'mvp_research';
  setChatMode?: (mode: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research' | 'mvp_research') => void;
  model?: string;
  provider?: ProviderInfo;
  addToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
}

export const Messages = forwardRef<HTMLDivElement, MessagesProps>(
  (props: MessagesProps, ref: ForwardedRef<HTMLDivElement> | undefined) => {
    const { id, isStreaming = false, messages = [] } = props;

    const handleRewind = (messageId: string) => {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('rewindTo', messageId);
      window.location.search = searchParams.toString();
    };

    const handleFork = async (messageId: string) => {
      try {
        if (!db || !chatId.get()) {
          toast.error('Chat persistence is not available');
          return;
        }

        const urlId = await forkChat(db, chatId.get()!, messageId);
        window.location.href = `/chat/${urlId}`;
      } catch (error) {
        toast.error('Failed to fork chat: ' + (error as Error).message);
      }
    };

    const groupedMessages: Message[] = [];
    const meta = useStore(chatMetadata);
    const rewindId = meta?.rewindId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('rewindTo') : null);

    let visibleMessages = messages;
    if (rewindId) {
      const rewindIndex = messages.findIndex((m) => m.id === rewindId);
      if (rewindIndex !== -1) {
        visibleMessages = messages.slice(0, rewindIndex + 1);
      }
    }

    for (const msg of visibleMessages) {
      if (msg.annotations?.includes('hidden') || (typeof msg.content === 'string' && msg.content.includes('[AUTOMATED SYSTEM CHECK]'))) continue;

      const lastGroup = groupedMessages[groupedMessages.length - 1];
      if (lastGroup && lastGroup.role === 'assistant' && msg.role === 'assistant') {
        lastGroup.content = (lastGroup.content ? lastGroup.content + '\n\n' : '') + msg.content;
        lastGroup.parts = [...(lastGroup.parts || []), ...(msg.parts || [])];
        if (msg.annotations) {
          lastGroup.annotations = [...(lastGroup.annotations || []), ...msg.annotations];
        }
        lastGroup.id = msg.id;
      } else {
        groupedMessages.push({
          ...msg,
          parts: msg.parts ? [...msg.parts] : undefined,
          annotations: msg.annotations ? [...msg.annotations] : undefined
        });
      }
    }

    return (
      <div id={id} className={props.className} ref={ref}>
        {groupedMessages.length > 0
          ? groupedMessages.map((message, index) => {
            const { role, content, id: messageId, annotations, parts } = message;
            const isUserMessage = role === 'user';
            const isFirst = index === 0;

            return (
              <div
                key={index}
                className={classNames('flex w-full min-w-0 rounded-lg justify-center', {
                  'mt-2': !isFirst,
                })}
              >
                <div className="grid grid-col-1 w-full min-w-0 max-w-[var(--chat-max-width,45rem)] break-words">
                  {isUserMessage ? (
                    <UserMessage content={content} parts={parts} />
                  ) : (
                    <AssistantMessage
                      content={content}
                      annotations={message.annotations}
                      messageId={messageId}
                      onRewind={handleRewind}
                      onFork={handleFork}
                      append={props.append}
                      chatMode={props.chatMode}
                      setChatMode={props.setChatMode}
                      model={props.model}
                      provider={props.provider}
                      parts={parts}
                      addToolResult={props.addToolResult}
                    />
                  )}
                </div>
              </div>
            );
          })
          : null}
        {isStreaming && (
          <div className="text-center w-full  text-falbor-elements-item-contentAccent i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
        )}
      </div>
    );
  },
);