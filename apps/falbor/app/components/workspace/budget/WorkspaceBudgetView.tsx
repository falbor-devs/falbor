'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { sendAgentMessage } from '~/lib/actions/agentChat';
import { createBudgetPlan, getWorkspaceBudgetPlans } from '~/lib/actions/budget';
import { useStore } from '@nanostores/react';
import { Loader } from '~/components/loader/indext';
import { TextShimmer } from '~/components/ui/text-shimmer';
import { Badge, Input } from '~/components/ui';

export function WorkspaceBudgetView({ workspaceId }: { workspaceId: string }) {
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [marketId, setMarketId] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const router = useRouter();
  const isActive = useStore(aiSidebarStore.isActive);

  useEffect(() => {
    async function loadPlans() {
      const plans = await getWorkspaceBudgetPlans(workspaceId);
      setSavedPlans(plans || []);
    }
    loadPlans();
  }, [workspaceId]);

  useEffect(() => {
    if (isProcessing && !isActive && marketId) {
      router.push(`/workspace/${workspaceId}/budget/market/${marketId}`);
    }
  }, [isActive, isProcessing, router, workspaceId, marketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val < 15) {
      alert('Please enter a valid amount of at least $15.');
      return;
    }
    setIsProcessing(true);
    const plan = await createBudgetPlan(workspaceId, val);
    setMarketId(plan.id);
    aiSidebarStore.open();
    sendAgentMessage(`I want to allocate a marketing budget of $${val}. Please analyze, plan, and scout various sources. Calculate projected costs and potential returns, and determine the best advertising channels (Meta Ads, Google, etc.). Estimate the number of users and impressions I'll gain, and advise whether to invest the entire sum in one place or split it up. Verify that the platforms accept this amount based on their documentation. Provide a comprehensive breakdown. Note to AI: The Database ID for this budget plan is ${plan.id}. You must save your final breakdown to the server using the ui_budget_update tool or similar when you finish.`);
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-8">
      {isProcessing ? (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[600px] text-gray-900 dark:text-gray-100">
          <TextShimmer className='w-xl'>The AI is generating your budget plan... for see the AI works you can check the AI agent on the right side.</TextShimmer>
          <Loader />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto mt-10 w-full">
          <h1 className="text-3xl mb-2 text-gray-900 dark:text-gray-100 flex items-center gap-2">Marketing Budget Plan <Badge className='bg-[#0099ff]/20 text-[#0099ff] rounded-md'>Beta</Badge></h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Enter your marketing budget, and our AI will scout the best advertising channels and build a comprehensive investment strategy for you.</p>
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111114] p-6 rounded-md border border-gray-200 dark:border-gray-800/80 mb-8">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Budget ($)</label>
              <p className="text-xs text-gray-400 mb-2">Minimum budget is $15 to ensure viability across major platforms.</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                <Input
                  type="number"
                  min="15"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className='rounded-md pl-8'
                  required
                />
              </div>

              {marketId && (
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
                  <span className="font-mono">Market ID: {marketId}</span>
                  <Link 
                    href={`/workspace/${workspaceId}/budget/market/${marketId}`}
                    className="font-medium underline hover:text-blue-700"
                  >
                    View Result
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={!amount || parseFloat(amount) < 15}
                className="w-fit mt-4 bg-[#0099ff]/20 text-[#0099ff] disabled:opacity-50 disabled:cursor-not-allowed text-sm px-3 py-1.5 rounded-md transition-all font-medium"
              >
                Generate Marketing Strategy
              </button>
            </div>
          </form>

          {savedPlans.length > 0 && (
            <div className="bg-white dark:bg-[#111114] p-6 rounded-md border border-gray-200 dark:border-gray-800/80">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <i className="i-ph:clock-counter-clockwise text-blue-500" />
                Previous Marketing Strategies
              </h2>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {savedPlans.map((plan) => (
                  <div key={plan.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">${plan.amount} Budget</div>
                      <div className="text-xs text-gray-400 font-mono">Market ID: {plan.id}</div>
                    </div>
                    <Link
                      href={`/workspace/${workspaceId}/budget/market/${plan.id}`}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline px-3 py-1 bg-blue-50 dark:bg-blue-950/30 rounded"
                    >
                      Open Analysis →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

