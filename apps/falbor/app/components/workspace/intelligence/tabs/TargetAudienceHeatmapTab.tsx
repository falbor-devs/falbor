import React from 'react';
import classNames from 'classnames';

export function TargetAudienceHeatmapTab({ data }: { data: any }) {
  if (!data?.targetAudienceHeatmap || data.targetAudienceHeatmap.length === 0) {
    return <div className="text-gray-500">No audience heatmap data available.</div>;
  }

  const getTierColor = (intent: string, budget: string) => {
    if (intent === 'High' && budget === 'High') return 'bg-orange-500 text-white border-orange-600 shadow-orange-500/20 shadow-lg';
    if (intent === 'High' || budget === 'High') return 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-sm';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  };

  const getTierIcon = (intent: string, budget: string) => {
    if (intent === 'High' && budget === 'High') return 'i-ph:fire-fill text-white';
    if (intent === 'High' || budget === 'High') return 'i-ph:star-fill text-yellow-600';
    return 'i-ph:snowflake-duotone text-gray-400';
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-2">
      <div className="mb-6">
        <p className="text-gray-500 text-sm">Prioritize exactly who you should be selling to based on intent and budget.</p>
      </div>

      <div className="flex flex-col gap-4">
        {data.targetAudienceHeatmap.map((tier: any, idx: number) => (
          <div
            key={idx}
            className={classNames(
              "p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden",
              getTierColor(tier.intentLevel, tier.budgetLevel)
            )}
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="flex gap-3">
                <div className="mt-1">
                  <i className={classNames("text-2xl", getTierIcon(tier.intentLevel, tier.budgetLevel))} />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">{tier.segment}</h4>
                  <p className="opacity-90 text-sm leading-relaxed mb-4">{tier.description}</p>

                  <div className="flex gap-2 text-xs font-semibold">
                    <span className="px-2 py-1 rounded-md bg-black/10 dark:bg-white/10 backdrop-blur-sm">
                      Intent: {tier.intentLevel}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-black/10 dark:bg-white/10 backdrop-blur-sm">
                      Budget: {tier.budgetLevel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
