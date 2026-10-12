'use client';

import React from 'react';

export interface MilestoneQuest {
  id: number;
  usersRequired: number;
  rewardCents: number;
  unlocked: boolean;
  completed: boolean;
  canClaim?: boolean;
  progress?: number;
}

interface QuestCardProps {
  quest: MilestoneQuest;
  onClaim?: (questId: number) => void;
  isClaiming?: boolean;
}

export function QuestCard({ quest, onClaim, isClaiming }: QuestCardProps) {
  const isBlurred = !quest.unlocked;
  const currentCount = quest.progress || 0;

  return (
    <div
      className={`relative p-5 rounded-2xl border transition-all duration-300 ${
        isBlurred
          ? 'bg-gray-100/60 dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 backdrop-blur-md select-none'
          : quest.completed
          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40'
          : 'bg-white dark:bg-[#1C1D21] border-gray-200 dark:border-gray-800 shadow-sm'
      }`}
    >
      <div className={`flex items-center justify-between ${isBlurred ? 'filter blur-[3.5px] opacity-40' : ''}`}>
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base ${
              quest.completed
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                : quest.canClaim
                ? 'bg-blue-500/10 text-[#0099ff] border border-blue-500/20 animate-pulse'
                : 'bg-gray-200 dark:bg-zinc-800 text-gray-400'
            }`}
          >
            {quest.completed ? (
              <div className="i-ph:check-circle-bold w-6 h-6 text-green-500" />
            ) : (
              `${quest.usersRequired}u`
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Reach {quest.usersRequired} Users ({Math.min(currentCount, quest.usersRequired)}/{quest.usersRequired})
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Reward: <span className="font-semibold text-blue-600 dark:text-blue-400">+{quest.rewardCents} Credits</span>
            </p>
          </div>
        </div>

        <div>
          {quest.completed ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800/30">
              Completed
            </span>
          ) : quest.unlocked ? (
            <button
              disabled={!quest.canClaim || isClaiming}
              onClick={() => onClaim?.(quest.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all ${
                quest.canClaim
                  ? 'bg-[#0099ff] hover:bg-[#0088ee] text-white cursor-pointer'
                  : 'bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              {isClaiming ? 'Claiming...' : quest.canClaim ? 'Claim Reward' : 'In Progress'}
            </button>
          ) : (
            <div className="i-ph:lock-key-duotone w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {isBlurred && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-black/20 rounded-2xl backdrop-blur-[2px]">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 text-white text-[11px] font-medium shadow-md">
            <div className="i-ph:lock-simple-bold w-3.5 h-3.5" />
            <span>Unlock previous quest to reveal</span>
          </div>
        </div>
      )}
    </div>
  );
}
