import React from 'react';
import classNames from 'classnames';

export function CofounderBriefTab({ 
  cofounderBrief, 
  strongestSignal, 
  biggestConcern, 
  whatNotToDoNext, 
  evidenceLevel 
}: { 
  cofounderBrief?: string;
  strongestSignal?: string;
  biggestConcern?: string;
  whatNotToDoNext?: string;
  evidenceLevel?: string;
}) {
  if (!cofounderBrief) {
    return <div className="text-gray-500">Not available for older intelligence reports. Please regenerate.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#0099ff]/5 dark:bg-[#0099ff]/10 p-5 rounded-xl border border-[#0099ff]/20">
        <div className="flex items-center gap-2 mb-3 text-[#0099ff]">
          <i className="i-ph:user-focus-bold text-xl" />
          <h3 className="font-bold">Co-Founder's Take</h3>
        </div>
        <p className="text-gray-900 dark:text-white text-lg font-medium leading-relaxed italic">
          "{cofounderBrief}"
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-900/30">
          <div className="text-green-700 dark:text-green-400 font-bold mb-1 flex items-center gap-1">
            <i className="i-ph:trend-up" /> Strongest Signal
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{strongestSignal}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-200 dark:border-red-900/30">
          <div className="text-red-700 dark:text-red-400 font-bold mb-1 flex items-center gap-1">
            <i className="i-ph:warning-octagon" /> Biggest Concern
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{biggestConcern}</p>
        </div>
      </div>

      <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-200 dark:border-orange-900/30">
        <div className="text-orange-700 dark:text-orange-400 font-bold mb-1 flex items-center gap-1">
          <i className="i-ph:hand-palm" /> What NOT to do next
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">{whatNotToDoNext}</p>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <i className="i-ph:magnifying-glass" />
        Overall Evidence Level: 
        <span className={classNames(
          "font-bold px-2 py-0.5 rounded",
          evidenceLevel === 'Strong' ? 'bg-green-100 text-green-700' :
          evidenceLevel === 'High' ? 'bg-green-50 text-green-600' :
          evidenceLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        )}>
          {evidenceLevel}
        </span>
      </div>
    </div>
  );
}
