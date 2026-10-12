'use client';

import React, { useEffect, useState } from 'react';
import { getCommunityMessages, sendCommunityMessage, getRecentConversations } from '~/lib/actions/community-messages';
import { getMarketerProducts } from '~/lib/actions/marketer-products';
import { getPollVotes, submitPollVote } from '~/lib/actions/poll-actions';
import { MessagesSidebar, type Marketer } from '~/components/community/MessagesSidebar';
import { MessagesChatArea, type ChatMessage } from '~/components/community/MessagesChatArea';
import { UserDetailsSidebar } from '~/components/community/UserDetailsSidebar';
import { PollModal } from '~/components/community/PollModal';
import { B2BSidebar } from '~/components/marketer/B2BSidebar';

interface B2BMessagesClientProps {
  profile: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
  };
}

export function B2BMessagesClient({ profile }: B2BMessagesClientProps) {
  const [conversations, setConversations] = useState<Marketer[]>([]);
  const [selectedMarketer, setSelectedMarketer] = useState<Marketer | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [pollVotesMap, setPollVotesMap] = useState<Record<string, any>>({});

  useEffect(() => {
    loadConversations();
    getMarketerProducts().then((data) => setProducts(data));

    const interval = setInterval(() => {
      loadConversations();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    const recent = await getRecentConversations();
    if (recent && recent.length > 0) {
      setConversations((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(recent)) return prev;
        return recent;
      });
      setSelectedMarketer((prev) => (prev ? prev : recent[0]));
    }
  };

  useEffect(() => {
    if (!selectedMarketer) return;

    const fetchMsgs = async () => {
      const msgs = await getCommunityMessages(selectedMarketer.userId || selectedMarketer.id);
      setMessages(msgs as any);

      const pollMsgIds = msgs.filter((m: any) => m.content.includes('📋 Poll:') || m.content.includes('📋 Survey Question:')).map((m: any) => m.id);
      if (pollMsgIds.length > 0) {
        const votesData = await getPollVotes(pollMsgIds);
        setPollVotesMap(votesData);
      }
    };

    fetchMsgs();
    const interval = setInterval(fetchMsgs, 2000);

    return () => clearInterval(interval);
  }, [selectedMarketer]);

  const handleVotePoll = async (messageId: string, optionIndex: number) => {
    const res = await submitPollVote(messageId, optionIndex);
    if (res.success) {
      const votesData = await getPollVotes([messageId]);
      setPollVotesMap((prev) => ({ ...prev, ...votesData }));
    }
  };

  const handleSelectMarketer = (m: Marketer) => {
    setSelectedMarketer(m);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedMarketer) return;

    const targetUserId = selectedMarketer.userId || selectedMarketer.id;
    const sent = await sendCommunityMessage(targetUserId, inputText.trim());
    if (sent) {
      setMessages((prev) => [...prev, sent as any]);

      setConversations((prev) => {
        const filtered = prev.filter((c) => (c.userId || c.id) !== targetUserId);
        return [selectedMarketer, ...filtered];
      });
    }

    setInputText('');
  };

  const handleSendProductCard = async (prod: any) => {
    if (!selectedMarketer) return;
    const targetUserId = selectedMarketer.userId || selectedMarketer.id;
    const text = `📦 Product Offer: ${prod.name}\nService: ${prod.service}\nPrice: $${prod.price}`;
    const sent = await sendCommunityMessage(targetUserId, text);
    if (sent) {
      setMessages((prev) => [...prev, sent as any]);
    }
  };

  const handleSendSurvey = async (question: string, options: string[]) => {
    if (!selectedMarketer) return;
    const targetUserId = selectedMarketer.userId || selectedMarketer.id;
    const text = `📋 Poll: ${question}\nOptions:\n${options.map((opt) => `- ${opt}`).join('\n')}`;
    const sent = await sendCommunityMessage(targetUserId, text);
    if (sent) {
      setMessages((prev) => [...prev, sent as any]);
    }
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F9FAFB] dark:bg-[#09090B] text-zinc-900 dark:text-white font-sans">
      <B2BSidebar profile={profile} />
      <main className="flex-1 overflow-hidden flex flex-col h-full">
        <div className="flex-1 flex w-full min-h-0 overflow-hidden relative">
          <MessagesSidebar
            marketers={[]}
            conversations={conversations}
            selectedMarketer={selectedMarketer}
            hidePicker={true}
            onSelectMarketer={(m) => {
              handleSelectMarketer(m);
              setIsMobileSidebarOpen(false);
            }}
            className="hidden md:flex"
          />
          <MessagesChatArea
            selectedMarketer={selectedMarketer}
            messages={messages}
            inputText={inputText}
            onInputChange={setInputText}
            onSendMessage={handleSendMessage}
            isMarketer={true}
            products={products}
            onSendProductCard={handleSendProductCard}
            onOpenSurveyModal={() => setIsSurveyOpen(true)}
            pollVoteMap={pollVotesMap}
            onVotePoll={handleVotePoll}
            onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            onToggleDetails={() => setIsMobileDetailsOpen(!isMobileDetailsOpen)}
          />
          <UserDetailsSidebar selectedMarketer={selectedMarketer} />

          {/* Mobile Sidebar Modal Drawer */}
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 md:hidden flex">
              <div className="w-72 bg-white dark:bg-zinc-950 h-full shadow-2xl">
                <MessagesSidebar
                  marketers={[]}
                  conversations={conversations}
                  selectedMarketer={selectedMarketer}
                  hidePicker={true}
                  onSelectMarketer={(m) => {
                    handleSelectMarketer(m);
                    setIsMobileSidebarOpen(false);
                  }}
                  className="w-full h-full flex"
                />
              </div>
              <div className="flex-1" onClick={() => setIsMobileSidebarOpen(false)} />
            </div>
          )}

          {/* Mobile Contact Details Drawer */}
          {isMobileDetailsOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 md:hidden flex justify-end">
              <div className="flex-1" onClick={() => setIsMobileDetailsOpen(false)} />
              <div className="w-72 bg-white dark:bg-zinc-950 h-full shadow-2xl overflow-y-auto">
                <UserDetailsSidebar selectedMarketer={selectedMarketer} />
              </div>
            </div>
          )}
        </div>

        <PollModal
          isOpen={isSurveyOpen}
          onClose={() => setIsSurveyOpen(false)}
          onSendPoll={handleSendSurvey}
        />
      </main>
    </div>
  );
}
