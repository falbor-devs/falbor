'use client';

import React, { useState, useEffect } from 'react';
import { QuestCard, MilestoneQuest } from './QuestCard';
import { AutoConnectModal } from './AutoConnectModal';
import { WorkspaceSettingsModal } from '~/components/workspace/workspace-settings/WorkspaceSettingsModal';
import { toast } from 'react-hot-toast';

interface MilestoneViewProps {
  workspaceId: string;
  onOpenSettingsAPI?: () => void;
}

export function MilestoneView({ workspaceId, onOpenSettingsAPI }: MilestoneViewProps) {
  const [isAutoConnectOpen, setIsAutoConnectOpen] = useState(false);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [hasConnectedAPI, setHasConnectedAPI] = useState(false);
  const [totalSignups, setTotalSignups] = useState(0);

  const [quests, setQuests] = useState<MilestoneQuest[]>([
    { id: 1, usersRequired: 10, rewardCents: 5, unlocked: true, completed: false, canClaim: false },
    { id: 2, usersRequired: 20, rewardCents: 8, unlocked: false, completed: false, canClaim: false },
    { id: 3, usersRequired: 50, rewardCents: 20, unlocked: false, completed: false, canClaim: false },
    { id: 4, usersRequired: 100, rewardCents: 30, unlocked: false, completed: false, canClaim: false },
    { id: 5, usersRequired: 200, rewardCents: 80, unlocked: false, completed: false, canClaim: false },
  ]);

  const fetchMilestones = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/user/milestones?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.quests) {
          setQuests(data.quests);
        }
        setTotalSignups(data.totalSignups || 0);
        setHasConnectedAPI(!!data.hasConnectedAPI);
      }
    } catch (err) {
      console.error('Error loading milestone data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [workspaceId]);

  const handleClaim = async (questId: number) => {
    setClaimingId(questId);
    try {
      const res = await fetch('/api/user/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, questId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Reward claimed! +${data.rewardCents} AI credits added.`);
        await fetchMilestones();
      } else {
        toast.error(data.error || 'Failed to claim reward.');
      }
    } catch (err) {
      toast.error('Connection error claiming reward.');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-[#0E0F12] p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1C1D21] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="i-ph:trophy-fill w-6 h-6 text-amber-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Workspace Milestones</h1>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Grow your user base to unlock AI credit rewards and account perks. Recorded signups: <strong className="text-[#0099ff]">{totalSignups}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (onOpenSettingsAPI) {
                  onOpenSettingsAPI();
                } else {
                  setIsWorkspaceSettingsOpen(true);
                }
              }}
              className="px-3.5 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <div className="i-ph:plugs-connected-bold w-4 h-4 text-blue-500" />
              <span>Connect API</span>
            </button>

            <button
              onClick={() => setIsAutoConnectOpen(true)}
              className="px-3.5 py-2 bg-[#0099ff] hover:bg-[#0088ee] text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <div className="i-ph:lightning-bold w-4 h-4" />
              <span>Auto Connect</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 px-1">
            Active Quest Line
          </h2>
          {isLoading ? (
            <div className="p-8 text-center text-xs text-gray-400 animate-pulse">Loading milestone quests...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {quests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onClaim={handleClaim}
                  isClaiming={claimingId === quest.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AutoConnectModal
        isOpen={isAutoConnectOpen}
        onClose={() => setIsAutoConnectOpen(false)}
        workspaceId={workspaceId}
      />

      <WorkspaceSettingsModal
        workspaceId={workspaceId}
        isOpen={isWorkspaceSettingsOpen}
        onClose={() => setIsWorkspaceSettingsOpen(false)}
        defaultTab="developer"
      />
    </div>
  );
}
