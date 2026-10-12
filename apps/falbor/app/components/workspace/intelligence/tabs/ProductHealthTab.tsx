import React from 'react';

export function ProductHealthTab({ 
  healthScore, 
  healthBreakdown,
  sourcesUsed 
}: { 
  healthScore: number;
  healthBreakdown?: any;
  sourcesUsed: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-3 border-b border-gray-100 dark:border-gray-800 pb-6">
        <div className="text-5xl font-black text-green-500 tracking-tighter">
          {healthScore}
        </div>
        <div className="text-xl text-gray-400 font-medium pb-1">/ 100</div>
      </div>

      {healthBreakdown ? (
        <div className="flex flex-col gap-5">
          {Object.entries(healthBreakdown).map(([key, data]: [string, any]) => {
            const labels: any = {
              problemClarity: 'Problem Clarity',
              targetAudienceClarity: 'Audience Clarity',
              evidenceValidation: 'Evidence & Validation',
              differentiation: 'Differentiation',
              mvpReadiness: 'MVP Readiness',
              distribution: 'Distribution Readiness',
              monetization: 'Monetization Strategy',
              traction: 'Current Traction'
            };
            const label = labels[key] || key;
            const scoreColor = data.score >= 8 ? 'bg-green-500' : data.score >= 5 ? 'bg-yellow-500' : 'bg-red-500';
            
            return (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm font-bold text-gray-900 dark:text-gray-100">
                  <span>{label}</span>
                  <span className={scoreColor + " text-white px-2 py-0.5 rounded text-xs"}>{data.score}/10</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div className={"h-full " + scoreColor} style={{ width: `${(data.score / 10) * 100}%` }} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{data.explanation}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          Based on the provided context, the AI has assessed your product's readiness and clarity at a score of {healthScore}. 
          A score above 80 indicates strong market positioning and clear product definition. (Regenerate to see full breakdown).
        </p>
      )}

      <div className="mt-4 bg-gray-50 dark:bg-[#111114] p-4 rounded-xl">
        <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-sm flex items-center gap-2">
          <i className="i-ph:files" /> Sources Relied Upon
        </h4>
        <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
          {sourcesUsed.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
    </div>
  );
}
