import React from 'react';
import classNames from 'classnames';

export function NextBestActionTab({ nextBestAction }: { nextBestAction?: any }) {
  if (!nextBestAction) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <p>No next best action available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative gap-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/20 dark:bg-[#0099ff]/20">
          <i className="i-ph:rocket-launch text-2xl text-blue-600 dark:text-[#0099ff]" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Next Best Action</h3>
      </div>
      
      <div className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">{nextBestAction.title}</div>
      <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">{nextBestAction.description}</p>
      
      {nextBestAction.expectedOutcome && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="bg-gray-50 dark:bg-[#111114] p-4 rounded-xl border border-gray-200 dark:border-[#1A1A1E]">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Expected Outcome</h4>
            <p className="text-sm text-gray-800 dark:text-gray-200">{nextBestAction.expectedOutcome}</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-[#111114] p-4 rounded-xl border border-gray-200 dark:border-[#1A1A1E]">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Success Criteria</h4>
            <p className="text-sm text-gray-800 dark:text-gray-200">{nextBestAction.successCriteria}</p>
          </div>
        </div>
      )}

      {nextBestAction.effortLevel && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-medium text-gray-500">Effort Level:</span>
          <span className={classNames(
            "text-xs font-bold px-2 py-1 rounded",
            nextBestAction.effortLevel === 'Low' ? 'bg-green-100 text-green-700' :
            nextBestAction.effortLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          )}>
            {nextBestAction.effortLevel}
          </span>
        </div>
      )}
      
      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[#1A1A1E]">
        <button 
          className="w-full bg-[#0099ff] text-white font-bold text-lg px-8 py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-[#0077cc] transition-colors shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(nextBestAction.promptText);
            alert('Mission prompt copied to clipboard! Paste it in the chat.');
          }}
        >
          <i className="i-ph:copy-simple text-xl" />
          Copy Mission Prompt
        </button>
      </div>
    </div>
  );
}
