import React from 'react';

export function StageTab({ stage, positioning, positioningDetails }: { stage: string, positioning?: string, positioningDetails?: any }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assessed Stage</h4>
        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stage}</div>
      </div>

      <hr className="border-gray-100 dark:border-gray-800" />

      {positioningDetails ? (
        <div className="flex flex-col gap-6">
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Market Category</h4>
            <div className="text-lg font-medium text-gray-900 dark:text-white">{positioningDetails.category}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-[#111114] p-4 rounded-xl border border-gray-200 dark:border-[#1A1A1E]">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Alternatives</h4>
              <p className="text-sm text-gray-800 dark:text-gray-200">{positioningDetails.alternatives}</p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-900/30">
              <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">Reason to Switch</h4>
              <p className="text-sm text-gray-800 dark:text-gray-200">{positioningDetails.reasonToSwitch}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium text-gray-500">Differentiation Strength:</span>
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              positioningDetails.differentiationStrength === 'Strong' ? 'bg-green-100 text-green-700' :
              positioningDetails.differentiationStrength === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {positioningDetails.differentiationStrength}
            </span>
          </div>
        </div>
      ) : (
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Positioning</h4>
          <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
            {positioning || "No positioning statement available. Regenerate intelligence."}
          </p>
        </div>
      )}
    </div>
  );
}
