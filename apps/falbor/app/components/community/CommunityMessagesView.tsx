'use client';

import React, { useEffect, useState } from 'react';
import { getMarketersList } from '~/lib/actions/get-marketers';
import { getCommunityMessages, sendCommunityMessage, getRecentConversations } from '~/lib/actions/community-messages';
import { getPollVotes, submitPollVote } from '~/lib/actions/poll-actions';
import { processProductPayment } from '~/lib/actions/earnings-actions';
import { getUserBusinessProfile, updateUserBusinessProfile } from '~/lib/actions/user-profile';
import { MessagesSidebar, type Marketer } from './MessagesSidebar';
import { MessagesChatArea, type ChatMessage } from './MessagesChatArea';
import { UserDetailsSidebar } from './UserDetailsSidebar';
import { BusinessSetupModal } from './BusinessSetupModal';
import { Dialog, DialogRoot, DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { toast } from 'react-toastify';

export function CommunityMessagesView() {
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [conversations, setConversations] = useState<Marketer[]>([]);
  const [selectedMarketer, setSelectedMarketer] = useState<Marketer | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showMarketerPicker, setShowMarketerPicker] = useState(false);

  // Business profile modal & setup state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSetupCompleted, setIsSetupCompleted] = useState<boolean>(true);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);

  useEffect(() => {
    getMarketersList().then((data) => setMarketers(data));
    loadConversations();
    checkProfileSetup();

    const interval = setInterval(() => {
      loadConversations();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const checkProfileSetup = async () => {
    const profile = await getUserBusinessProfile();
    if (profile) {
      setUserProfile(profile);
      const isComplete = Boolean(profile.displayName && profile.bio);
      setIsSetupCompleted(isComplete);
      if (!isComplete) {
        setShowSetupModal(true);
      }
    }
  };

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

  const [pollVotesMap, setPollVotesMap] = useState<Record<string, any>>({});

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
    setConversations((prev) => {
      const filtered = prev.filter((c) => (c.userId || c.id) !== (m.userId || m.id));
      return [m, ...filtered];
    });
    setSelectedMarketer(m);
    setShowMarketerPicker(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedMarketer) return;

    if (!isSetupCompleted) {
      toast.warn("You must complete the setup to send a message.", {
        position: 'top-center',
        autoClose: 4000,
      });
      setShowSetupModal(true);
      return;
    }

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

  const handleSaveProfile = async (data: {
    businessName: string;
    description: string;
    phone: string;
    displayEmail: boolean;
    displayPhone: boolean;
  }) => {
    const res = await updateUserBusinessProfile({
      displayName: data.businessName,
      bio: data.description,
      phone: data.phone,
      displayEmail: data.displayEmail,
      displayPhone: data.displayPhone,
    });

    if (res.success) {
      setIsSetupCompleted(true);
      setShowSetupModal(false);
      toast.success("Business profile completed successfully!");
    } else {
      toast.error("Failed to save business profile");
    }
  };

  const [paymentProduct, setPaymentProduct] = useState<{ name: string; amount: number } | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const handlePayProduct = (name: string, amount: number) => {
    setPaymentProduct({ name, amount });
  };

  const handleDeclineProduct = async (msgId: string) => {
    if (!selectedMarketer) return;
    const targetUserId = selectedMarketer.userId || selectedMarketer.id;
    await sendCommunityMessage(targetUserId, "❌ I am not interested in this product offer.");
    toast.info("Declined offer.");
  };

  const handleConfirmPaypalPayment = async () => {
    if (!paymentProduct || !selectedMarketer) return;
    setIsPaying(true);

    const targetUserId = selectedMarketer.userId || selectedMarketer.id;
    const mockTxId = `PAYPAL-SB-${Date.now()}`;
    const res = await processProductPayment({
      marketerUserId: targetUserId,
      productName: paymentProduct.name,
      amount: paymentProduct.amount,
      transactionId: mockTxId,
    });

    setIsPaying(false);

    if (res.success) {
      await sendCommunityMessage(targetUserId, `✅ Payment Completed for ${paymentProduct.name} ($${paymentProduct.amount})! TxID: ${mockTxId}`);
      toast.success("Payment successful via PayPal Sandbox!");
      setPaymentProduct(null);
    } else {
      toast.error("Payment failed");
    }
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false);

  return (
    <div className="flex-1 w-full h-screen flex flex-col overflow-hidden bg-white dark:bg-[#09090B]">
      <div className="flex-1 flex w-full min-h-0 overflow-hidden relative">
        <MessagesSidebar
          marketers={marketers}
          conversations={conversations}
          selectedMarketer={selectedMarketer}
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
          pollVoteMap={pollVotesMap}
          onVotePoll={handleVotePoll}
          onPayProduct={handlePayProduct}
          onDeclineProduct={handleDeclineProduct}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onToggleDetails={() => setIsMobileDetailsOpen(!isMobileDetailsOpen)}
        />
        <UserDetailsSidebar selectedMarketer={selectedMarketer} />

        {/* Mobile Sidebar Modal Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 md:hidden flex">
            <div className="w-72 bg-white dark:bg-zinc-950 h-full shadow-2xl">
              <MessagesSidebar
                marketers={marketers}
                conversations={conversations}
                selectedMarketer={selectedMarketer}
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

      <BusinessSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSave={handleSaveProfile}
        initialEmail={userProfile?.email}
        initialDisplayName={userProfile?.displayName}
        initialBio={userProfile?.bio}
        initialDisplayEmail={userProfile?.displayEmail}
      />

      {/* PayPal Checkout Modal using standard UI Dialog & PayPal JS SDK */}
      <DialogRoot open={Boolean(paymentProduct)} onOpenChange={(open) => !open && setPaymentProduct(null)}>
        <Dialog className="max-w-md p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl">
          <DialogTitle className="text-lg font-bold mb-1 flex items-center gap-2">
            <span className="i-ph:paypal-logo-bold text-amber-500 text-2xl" />
            PayPal Checkout Gateway
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 mb-4">
            Complete your order securely using PayPal or debit/credit card.
          </DialogDescription>

          {paymentProduct && (
            <div className="space-y-5">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl space-y-1 border border-zinc-100 dark:border-zinc-800">
                <p className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">Item Details</p>
                <p className="text-sm font-semibold">{paymentProduct.name}</p>
                <p className="text-2xl font-black text-emerald-500 mt-1">${paymentProduct.amount} USD</p>
              </div>

              <div className="min-h-[160px] flex flex-col justify-center">
                <PayPalScriptProvider
                  options={{
                    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'test',
                    currency: 'USD',
                  }}
                >
                  <PayPalButtons
                    style={{ layout: 'vertical', shape: 'rect' }}
                    createOrder={(data, actions) => {
                      return actions.order.create({
                        intent: 'CAPTURE',
                        purchase_units: [
                          {
                            amount: {
                              currency_code: 'USD',
                              value: String(paymentProduct.amount),
                            },
                            description: paymentProduct.name,
                          },
                        ],
                      });
                    }}
                    onApprove={async (data, actions) => {
                      if (!actions?.order) return;
                      const order = await actions.order.capture();
                      if (!selectedMarketer) return;

                      const targetUserId = selectedMarketer.userId || selectedMarketer.id;
                      const txId = order.id || `PAYPAL-SB-${Date.now()}`;

                      const res = await processProductPayment({
                        marketerUserId: targetUserId,
                        productName: paymentProduct.name,
                        amount: paymentProduct.amount,
                        transactionId: txId,
                      });

                      if (res.success) {
                        await sendCommunityMessage(
                          targetUserId,
                          `✅ Payment Completed for ${paymentProduct.name} ($${paymentProduct.amount})! PayPal TxID: ${txId}`
                        );
                        toast.success("Payment successful via PayPal Gateway!");
                        setPaymentProduct(null);
                      } else {
                        toast.error("Failed to record payment transaction");
                      }
                    }}
                    onError={(err) => {
                      console.error("PayPal Error:", err);
                      toast.error("PayPal transaction was cancelled or failed.");
                    }}
                  />
                </PayPalScriptProvider>
              </div>
            </div>
          )}
        </Dialog>
      </DialogRoot>
    </div>
  );
}
