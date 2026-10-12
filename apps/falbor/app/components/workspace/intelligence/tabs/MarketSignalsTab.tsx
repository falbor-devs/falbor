import React from 'react';

export function MarketSignalsTab({
  marketSignals
}: {
  marketSignals: any;
}) {
  const competitors = marketSignals.competitors || [];
  const opportunities = marketSignals.opportunities || [];
  const risks = marketSignals.risks || [];
  const missingTrustElements = marketSignals.missingTrustElements || [];
  const validationSignals = marketSignals.validationSignals || [];
  const negativeSignals = marketSignals.negativeSignals || [];
  const assumptionsToValidate = marketSignals.assumptionsToValidate || [];

  return (
    <div className="flex flex-col gap-8">
      {/* Evidence Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider"><i className="i-ph:check-circle text-green-500"/> Validation Signals</h4>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            {validationSignals.length ? validationSignals.map((c: string, i: number) => <li key={i}>{c}</li>) : <li className="text-gray-400 italic">No strong validation signals found</li>}
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider"><i className="i-ph:warning-circle text-red-500"/> Negative Signals / Risks</h4>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            {negativeSignals.length ? negativeSignals.map((c: string, i: number) => <li key={i}>{c}</li>) : <li className="text-gray-400 italic">No clear negative signals yet</li>}
            {risks.map((c: string, i: number) => <li key={`risk-${i}`}>{c}</li>)}
          </ul>
        </div>
      </div>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Market Reality Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider"><i className="i-ph:sword text-orange-500"/> Known Competitors</h4>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            {competitors.length ? competitors.map((c: string, i: number) => <li key={i}>{c}</li>) : <li className="text-gray-400 italic">No competitors explicitly identified in context</li>}
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider"><i className="i-ph:lightbulb text-yellow-500"/> Opportunities</h4>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            {opportunities.length ? opportunities.map((c: string, i: number) => <li key={i}>{c}</li>) : <li className="text-gray-400 italic">None identified yet</li>}
          </ul>
        </div>
      </div>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Assumptions and Gaps */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-xl border border-orange-200 dark:border-orange-900/30">
          <h4 className="font-bold text-orange-800 dark:text-orange-400 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider"><i className="i-ph:question text-orange-500"/> Unproven Assumptions</h4>
          <ul className="list-disc pl-5 text-sm text-gray-800 dark:text-gray-200 space-y-2 font-medium">
            {assumptionsToValidate.length ? assumptionsToValidate.map((c: string, i: number) => <li key={i}>{c}</li>) : <li className="italic">No major assumptions flagged</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
