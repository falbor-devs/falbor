import React from 'react';

export function TargetAudienceTab({ 
  targetAudience, 
  targetAudienceDetails,
  mainProblem 
}: { 
  targetAudience: string;
  targetAudienceDetails?: any;
  mainProblem: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {!targetAudienceDetails ? (
        <div className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">{targetAudience}</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 text-sm uppercase tracking-wider">Ideal Customer Profile (ICP)</h4>
            <p className="text-gray-900 dark:text-gray-100">{targetAudienceDetails.icp}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <h4 className="font-bold text-gray-700 dark:text-gray-400 mb-2 text-xs uppercase tracking-wider">Buyer vs User</h4>
              <p className="text-sm text-gray-800 dark:text-gray-200">{targetAudienceDetails.buyerVsUser}</p>
            </div>
            
            <div className="p-4 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/5">
              <h4 className="font-bold text-red-700 dark:text-red-400 mb-2 text-xs uppercase tracking-wider">Who is NOT the audience</h4>
              <p className="text-sm text-gray-800 dark:text-gray-200">{targetAudienceDetails.whoIsNot}</p>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 italic mt-2">
            <strong>AI Reasoning:</strong> {targetAudienceDetails.reasoning}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-6">
        <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <i className="i-ph:warning-circle text-orange-500" /> Core Customer Pain
        </h4>
        <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
          {mainProblem}
        </p>
      </div>
    </div>
  );
}
