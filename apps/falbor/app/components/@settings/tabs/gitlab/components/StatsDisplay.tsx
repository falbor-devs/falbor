import React from 'react';
import { Button } from '~/components/ui/Button';
import type { GitLabStats } from '~/types/GitLab';

interface StatsDisplayProps {
  stats: GitLabStats;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function StatsDisplay({ stats, onRefresh, isRefreshing }: StatsDisplayProps) {
  return (
    <div className="space-y-4">
      {}
      <div>
        <h5 className="text-sm font-medium text-falbor-elements-textPrimary mb-2">Repository Stats</h5>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: 'Public Repos',
              value: stats.publicProjects,
            },
            {
              label: 'Private Repos',
              value: stats.privateProjects,
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="flex flex-col p-3 rounded-lg bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor"
            >
              <span className="text-xs text-falbor-elements-textSecondary">{stat.label}</span>
              <span className="text-lg font-medium text-falbor-elements-textPrimary">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {}
      <div>
        <h5 className="text-sm font-medium text-falbor-elements-textPrimary mb-2">Contribution Stats</h5>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Stars',
              value: stats.stars || 0,
              icon: 'i-ph:star',
              iconColor: 'text-falbor-elements-icon-warning',
            },
            {
              label: 'Forks',
              value: stats.forks || 0,
              icon: 'i-ph:git-fork',
              iconColor: 'text-falbor-elements-icon-info',
            },
            {
              label: 'Followers',
              value: stats.followers || 0,
              icon: 'i-ph:users',
              iconColor: 'text-falbor-elements-icon-success',
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="flex flex-col p-3 rounded-lg bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor"
            >
              <span className="text-xs text-falbor-elements-textSecondary">{stat.label}</span>
              <span className="text-lg font-medium text-falbor-elements-textPrimary flex items-center gap-1">
                <div className={`${stat.icon} w-4 h-4 ${stat.iconColor}`} />
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-falbor-elements-borderColor">
        <div className="flex items-center justify-between">
          <span className="text-xs text-falbor-elements-textSecondary">
            Last updated: {new Date(stats.lastUpdated).toLocaleString()}
          </span>
          {onRefresh && (
            <Button onClick={onRefresh} disabled={isRefreshing} variant="outline" size="sm" className="text-xs">
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
