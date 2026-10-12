'use client';

import React from 'react';
import type { Marketer } from './MessagesSidebar';

import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string | Date;
}

interface MessagesChatAreaProps {
  selectedMarketer: Marketer | null;
  messages: ChatMessage[];
  inputText: string;
  onInputChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  isMarketer?: boolean;
  products?: any[];
  onSendProductCard?: (product: any) => void;
  onOpenSurveyModal?: () => void;
  pollVoteMap?: Record<string, { totalVotes: number; votesByOption: Record<number, number>; userVote: number | null }>;
  onVotePoll?: (messageId: string, optionIndex: number) => Promise<void>;
  onPayProduct?: (productName: string, amount: number) => void;
  onDeclineProduct?: (msgId: string) => void;
  onToggleSidebar?: () => void;
  onToggleDetails?: () => void;
}

export function MessagesChatArea({
  selectedMarketer,
  messages,
  inputText,
  onInputChange,
  onSendMessage,
  isMarketer = false,
  products = [],
  onSendProductCard,
  onOpenSurveyModal,
  pollVoteMap = {},
  onVotePoll,
  onPayProduct,
  onDeclineProduct,
  onToggleSidebar,
  onToggleDetails,
}: MessagesChatAreaProps) {
  if (!selectedMarketer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-6 text-center">
        <span className="i-ph:chat-teardrop-dots text-5xl mb-3 opacity-40" />
        <h3 className="text-base font-semibold text-zinc-600 dark:text-zinc-300">Your Messages</h3>
        <p className="text-xs max-w-sm mt-1">
          Select a marketer from the sidebar or click the <b>+</b> button to start a conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black">
      <div className="h-16 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile Conversations Toggle (Three-dots Icon) */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title="Open Conversations"
          >
            <span className="i-ph:dots-three-vertical-bold text-lg" />
          </button>

          <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
            {selectedMarketer.photoUrl ? (
              <img src={selectedMarketer.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="i-ph:user text-zinc-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold">{selectedMarketer.fullName}</h3>
            {selectedMarketer.bio && <span className="text-xs text-zinc-400 truncate max-w-[180px] block">{selectedMarketer.bio}</span>}
          </div>
        </div>

        {/* Mobile Contact Info Toggle */}
        <button
          type="button"
          onClick={onToggleDetails}
          className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Contact Info"
        >
          <span className="i-ph:user-card-bold text-sm text-blue-500" />
          <span>Contact</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-zinc-400 mt-12">
            This is the start of your conversation with {selectedMarketer.fullName}.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe =
              msg.receiverId === selectedMarketer.userId ||
              msg.receiverId === selectedMarketer.id;

            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={msg.id}
                className={`flex w-full items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'
                  }`}
              >
                {!isMe && (
                  <div className="text-[10px] text-zinc-400 whitespace-nowrap mb-1">
                    {timeStr}
                  </div>
                )}
                <div
                  className={`max-w-xs md:max-w-md rounded-xl text-sm overflow-hidden ${isMe
                    ? 'bg-[#0099ff]/15 text-zinc-900 dark:text-zinc-100'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                    }`}
                >
                  {msg.content.includes('📋 Survey Question:') || msg.content.includes('📋 Poll:') ? (() => {
                    const lines = msg.content.split('\n');
                    const questionLine = lines[0].replace('📋 Survey Question:', '').replace('📋 Poll:', '').trim();
                    const optionLines = lines.slice(2).filter((l) => l.trim().startsWith('- '));

                    const pollData = pollVoteMap[msg.id] || { totalVotes: 0, votesByOption: {}, userVote: null };
                    const total = pollData.totalVotes;
                    const isCreator = isMe;

                    return (
                      <div className="p-4 space-y-3 min-w-[280px]">
                        <div className="flex items-center justify-between pb-2">
                          <div className="flex items-center gap-2">
                            <span className="i-ph:chart-bar-duotone text-lg" />
                            <span className="font-semibold text-xs">Poll</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium">{total} {total === 1 ? 'vote' : 'votes'}</span>
                        </div>
                        <h4 className="text-sm">{questionLine}</h4>

                        <div className="space-y-2 pt-1">
                          {optionLines.map((opt, i) => {
                            const optionText = opt.replace(/^-\s*/, '');
                            const voteCount = pollData.votesByOption[i] || 0;
                            const percentage = total > 0 ? Math.round((voteCount / total) * 100) : 0;
                            const isSelected = pollData.userVote === i;

                            if (isCreator) {
                              return (
                                <div key={i} className="space-y-1">
                                  <div className="flex justify-between text-xs font-medium">
                                    <span>{optionText}</span>
                                    <span>{percentage}%</span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-white overflow-hidden">
                                    <div
                                      className="h-full bg-black transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={async () => {
                                  if (onVotePoll) {
                                    await onVotePoll(msg.id, i);
                                  }
                                }}
                                className={`w-full text-left flex items-center justify-between p-2.5 rounded-md text-xs transition-colors ${isSelected
                                  ? 'bg-[#0099ff]/20 text-[#0099ff] font-semibold'
                                  : 'bg-white dark:bg-zinc-950'
                                  }`}
                              >
                                <span>{optionText}</span>
                                {isSelected && <span className="i-ph:check-circle-fill text-base" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })() : msg.content.includes('📦 Product Offer:') ? (() => {
                    const lines = msg.content.split('\n');
                    const prodName = lines[0].replace('📦 Product Offer:', '').trim();
                    const serviceName = lines[1]?.replace('Service:', '').trim() || 'Marketing Service';
                    const priceStr = lines[2]?.replace('Price:', '').replace('$', '').trim() || '0';
                    const numPrice = Number(priceStr);

                    return (
                      <div className="p-4 space-y-3 min-w-[280px] bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-900 pb-2">
                          <span className="i-ph:cube-duotone text-blue-500 text-lg" />
                          <span className="font-bold text-xs uppercase tracking-wider text-blue-500">Product Offer</span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{prodName}</h4>
                          <p className="text-xs text-zinc-500 mt-0.5">{serviceName}</p>
                          <p className="text-lg font-black text-emerald-500 mt-2">${numPrice}</p>
                        </div>

                        {!isMe ? (
                          <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                            <button
                              type="button"
                              onClick={() => onPayProduct && onPayProduct(prodName, numPrice)}
                              className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <span className="i-ph:paypal-logo-bold text-base" />
                              I'm ready to pay
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeclineProduct && onDeclineProduct(msg.id)}
                              className="py-2 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 font-semibold text-xs rounded-lg transition-colors"
                            >
                              Not interested
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-zinc-400 font-medium italic pt-1">
                            Sent to client for checkout
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="px-4 py-3 leading-[1.45]">
                      <p>{msg.content}</p>
                    </div>
                  )}
                </div>
                {isMe && (
                  <div className="text-[10px] text-zinc-400 whitespace-nowrap mb-1">
                    {timeStr}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={onSendMessage}
        className="p-4"
      >
        <div
          className="flex items-center w-full min-h-[64px] 
          rounded-md px-3 py-2"
          style={{ boxShadow: '0px 0px 5px #b3b1b1ff' }}
        >
          {isMarketer && (
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="mr-2 h-9 w-9 shrink-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md flex items-center justify-center transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  title="Actions & Attachments"
                >
                  <span className="i-ph:plus text-lg" />
                </button>
              }
              align="start"
              side="top"
              sideOffset={8}
            >
              <DropdownItem
                disabled={!products || products.length === 0}
                onSelect={() => products && products.length > 0 && onSendProductCard && onSendProductCard(products[0])}
                className={!products || products.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <span className="i-ph:cube-duotone h-4 w-4 mr-1 text-blue-500" />
                Send Product
              </DropdownItem>
              <DropdownItem onSelect={() => onOpenSurveyModal && onOpenSurveyModal()}>
                <span className="i-ph:chart-bar-duotone h-4 w-4 mr-1 text-purple-500" />
                Send Poll
              </DropdownItem>
            </Dropdown>
          )}

          <input
            type="text"
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={`Type a new message to ${selectedMarketer.fullName}...`}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none px-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />

          <button
            type="submit"
            className="ml-2 h-9 w-9 shrink-0 bg-[#0099ff]/20 text-[#0099ff] rounded-md flex items-center justify-center transition-colors"
          >
            <span className="i-ph:paper-plane-right-fill text-base" />
          </button>
        </div>
      </form>
    </div>
  );
}
