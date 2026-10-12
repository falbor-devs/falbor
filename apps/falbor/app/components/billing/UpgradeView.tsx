'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '~/hooks/useAuth';
import { BILLING_CONFIG, PlanConfig, PlanId } from '~/lib/billing/config';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { toast } from 'react-toastify';
import FAQSection from './FAQ';
import { Tooltip } from '../ui';

import { WorkspaceSettingsModal } from '../workspace/workspace-settings/WorkspaceSettingsModal';
import { CouponModal } from './CouponModal';
import { getWorkspaceById } from '~/lib/actions/workspaces';

interface UpgradeViewProps {
  workspaceId?: string;
  paypalClientId?: string;
}

export function UpgradeView({ workspaceId, paypalClientId }: UpgradeViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState<PlanId>('free');
  const [balance, setBalance] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<PlanId | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string>("user's Workspace");

  useEffect(() => {
    if (workspaceId) {
      getWorkspaceById(workspaceId).then((ws) => {
        if (ws?.name) {
          setWorkspaceName(ws.name);
        }
      });
    }
  }, [workspaceId]);

  useEffect(() => {
    if (searchParams?.get('highlight') === 'power_business') {
      setIsGlowing(true);
      const timer = setTimeout(() => setIsGlowing(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const fetchUserStatus = async () => {
    try {
      const res = await fetch('/api/user/credits');
      if (res.ok) {
        const data = await res.json();
        if (data.subscriptionTier) {
          setCurrentTier(data.subscriptionTier.toLowerCase() as PlanId);
        }
        if (data.balance !== undefined) {
          setBalance(Number(data.balance));
        }
      }
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStatus();

    const bc = new BroadcastChannel('paypal_checkout');
    bc.onmessage = (event) => {
      if (event.data?.type === 'PAYMENT_SUCCESS') {
        fetchUserStatus();
      }
    };
    return () => bc.close();
  }, []);

  const handleUpgradeSuccess = async (plan: PlanConfig, details: any) => {
    try {
      const res = await fetch('/api/user/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: details.id,
          amount: plan.price,
          tier: plan.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentTier(data.subscriptionTier);
        setBalance((prev) => prev + data.addedCredits);
        toast.success(`Successfully upgraded to ${plan.name}!`);
        fetchUserStatus();
      } else {
        toast.error('Payment recorded, but subscription activation failed.');
      }
    } catch (err) {
      console.error('Failed to confirm payment:', err);
      toast.error('Error confirming payment with server.');
    } finally {
      setProcessingPlan(null);
    }
  };

  const clientId = paypalClientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  const planList: PlanConfig[] = Object.values(BILLING_CONFIG.plans);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="i-svg-spinners:90-ring-with-bg text-purple-500 text-4xl animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 font-sans relative">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-center md:text-left space-y-1">
          <h1 className="text-3xl md:text-4xl text-zinc-900 dark:text-white tracking-tight">
            Pick the subscription you think is fair for you.
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            if there is any issues contact us <a className='text-[#0099ff]' href="mailto:[contact@falbor.xyz]">contact@falbor.xyz</a>
          </p>
        </div>

        <button
          onClick={() => setIsCouponModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 shrink-0"
        >
          <div className="i-ph:gift-duotone w-4 h-4" />
          <span>Have a coupon?</span>
        </button>
      </div>
      <PayPalScriptProvider options={{ clientId: clientId || 'sb', currency: 'USD' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {planList.map((plan) => {
            const isCurrent = currentTier === plan.id;
            const isPopular = plan.popular;
            const isHighlighted = isGlowing && (plan.id === 'power' || plan.id === 'business');

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-lg border bg-[#f7f5f8] dark:bg-zinc-950 p-5 min-h-[520px] transition-colors duration-300 ${isHighlighted
                  ? 'border-purple-500 dark:border-purple-400 border-2'
                  : 'border-[#dcd9de] dark:border-zinc-800'
                  }`}
              >
                {isPopular && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-px inset-x-8 h-px bg-gradient-to-r from-transparent via-[#0099ff] to-transparent"
                  />
                )}

                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{plan.name}</h3>
                  {isPopular && (
                    <span className="rounded-full bg-zinc-900 dark:bg-white px-2.5 py-1 text-[11px] font-medium leading-none text-white dark:text-zinc-900">
                      Most Popular
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-normal tracking-tight text-zinc-900 dark:text-white">${plan.price}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">/month</span>
                </div>

                <div className="mt-5">
                  {isCurrent ? (
                    plan.price === 0 ? (
                      <button
                        disabled
                        className="w-full h-10 rounded-lg bg-[#e1dfe3] dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm cursor-default text-center font-medium"
                      >
                        Your current plan
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsManageModalOpen(true)}
                        className="w-full h-10 rounded-lg bg-[#e1dfe3] dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-[#d6d3d9] dark:hover:bg-zinc-700 transition-colors text-sm font-medium text-center"
                      >
                        Manage current plan
                      </button>
                    )
                  ) : plan.price === 0 ? (
                    <button
                      disabled
                      className="w-full h-10 rounded-lg bg-[#e1dfe3] dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm cursor-default text-center"
                    >
                      Included
                    </button>
                  ) : !user ? (
                    <Link href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/pricing')}`} className="block w-full">
                      <button className="w-full h-10 rounded-lg bg-[#0099ff]/20 text-[#0099ff] transition-colors flex items-center justify-center gap-2">
                        Log in to Subscribe
                      </button>
                    </Link>
                  ) : (
                    <div className="w-full space-y-2">
                      <PayPalButtons
                        style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
                        createOrder={(data, actions) => {
                          setProcessingPlan(plan.id);
                          return actions.order.create({
                            intent: 'CAPTURE',
                            purchase_units: [
                              {
                                amount: {
                                  currency_code: 'USD',
                                  value: plan.price.toString(),
                                },
                                description: `Falbor ${plan.name} Plan Subscription`,
                              },
                            ],
                          });
                        }}
                        onApprove={async (data, actions) => {
                          if (actions.order) {
                            const details = await actions.order.capture();
                            await handleUpgradeSuccess(plan, details);
                          }
                        }}
                        onError={(err) => {
                          console.error('PayPal Error:', err);
                          toast.error('PayPal checkout failed.');
                          setProcessingPlan(null);
                        }}
                        onCancel={() => setProcessingPlan(null)}
                      />
                    </div>
                  )}
                </div>

                <p className="mt-6 text-xs font-semibold text-zinc-900 dark:text-white">You get:</p>
                <ul className="mt-4 space-y-3.5 text-xs">
                  <li className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 font-semibold">
                    <span className="i-ph:check text-emerald-500 text-base shrink-0 -mt-0.5" />
                    <span>
                      {plan.maxWorkspaces === 1 ? '1 Workspace' : `Up to ${plan.maxWorkspaces} Workspaces`}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                    <span className="i-ph:check text-emerald-500 text-base shrink-0 -mt-0.5" />
                    <Tooltip content="FalborAI">
                      <img className='w-4 h-4' src="/favicon.ico" alt="" />
                    </Tooltip>
                    <span>{plan.monthlyCredits} Credits / month</span>
                  </li>
                  {plan.features.filter(f => !f.toLowerCase().includes('workspace')).map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300">
                      <span className="i-ph:check text-emerald-500 text-base shrink-0 -mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </PayPalScriptProvider>
      <FAQSection />

      {workspaceId && (
        <WorkspaceSettingsModal
          isOpen={isManageModalOpen}
          onClose={() => {
            setIsManageModalOpen(false);
            fetchUserStatus();
          }}
          workspaceId={workspaceId}
          defaultTab="subscription"
        />
      )}

      <CouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        workspaceName={workspaceName}
        workspaceId={workspaceId}
        onSuccess={fetchUserStatus}
      />
    </div>
  );
}