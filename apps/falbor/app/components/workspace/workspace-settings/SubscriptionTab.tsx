'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { BILLING_CONFIG } from '~/lib/billing/config';

export default function SubscriptionTab() {
  const [balance, setBalance] = useState<number>(0);
  const [tier, setTier] = useState<string>('free');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/user/credits');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
        setTier(data.subscriptionTier || 'free');
        setExpiresAt(data.subscriptionExpiresAt);
        setCancelled(Boolean(data.subscriptionCancelled));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription auto-renewal? You will retain access until the end of your billing cycle.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch('/api/user/credits', {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Subscription auto-renewal cancelled.');
        fetchSubscription();
      } else {
        toast.error('Failed to cancel subscription.');
      }
    } catch (e) {
      toast.error('Error cancelling subscription.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
        Loading subscription details...
      </div>
    );
  }

  const planConfig = BILLING_CONFIG.plans[tier as keyof typeof BILLING_CONFIG.plans] || BILLING_CONFIG.plans.free;
  const isPaid = tier !== 'free';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Subscription & Billing</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your account plan, credit balance, and monthly recurring status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-gray-50 dark:bg-[#111114] border border-gray-200 dark:border-zinc-800 space-y-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Plan</span>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{planConfig.name} Plan</h3>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 dark:bg-[#0099ff]/20 text-[#0099ff]">
              ${planConfig.price}/mo
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Monthly Allowance: {planConfig.monthlyCredits} credits (Resets monthly)
          </p>
        </div>

        <div className="p-5 rounded-xl bg-gray-50 dark:bg-[#111114] border border-gray-200 dark:border-zinc-800 space-y-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit Balance</span>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">⚡ {balance.toFixed(1)}</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Available across all your workspaces.
          </p>
        </div>
      </div>

      {isPaid && (() => {
        const now = new Date();
        const expDate = expiresAt ? new Date(expiresAt) : null;
        const diffMs = expDate ? expDate.getTime() - now.getTime() : 0;
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        return (
          <div className="p-5 rounded-xl bg-gray-50 dark:bg-[#111114] border border-gray-200 dark:border-zinc-800 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Billing & Renewal</h4>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                </span>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {cancelled ? (
                  <span className="text-amber-500 font-medium">
                    Auto-renewal is cancelled. Your plan benefits and unused credits remain fully active until <strong>{expDate ? expDate.toLocaleDateString() : 'end of cycle'}</strong> ({daysRemaining} days remaining). On this date, your account will automatically revert to the Free plan. No further charges will occur. Subscriptions are non-refundable.
                  </span>
                ) : (
                  <span>
                    Your subscription will automatically renew on <strong>{expDate ? expDate.toLocaleDateString() : '30 days from purchase'}</strong> ({daysRemaining} days remaining). If you cancel, you will maintain access to all benefits until this date without additional charges.
                  </span>
                )}
              </p>
            </div>

            {!cancelled ? (
              <button
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            ) : (
              <div className="inline-block px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Subscription Cancelled — Access valid until {expDate ? expDate.toLocaleDateString() : 'cycle end'}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
