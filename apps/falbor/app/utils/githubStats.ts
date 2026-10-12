import type { GitHubStats } from '~/types/GitHub';

export function calculateStatsSummary(stats: GitHubStats): GitHubStats {
  return {
    ...stats,
  };
}
