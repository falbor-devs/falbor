import React from 'react';
import { SetupButton } from '~/components/ui/setup/SetupButton';
import { DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { TextShimmer } from '~/components/ui/text-shimmer';

interface AnalyticsTabProps {
  onEnableAnalytics: () => void;
}

export function AnalyticsTab({ onEnableAnalytics }: AnalyticsTabProps) {
  return (
    <div className="flex flex-col h-full">
      {/* <div className="flex flex-col space-y-1.5 text-center sm:text-left">
        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Analytics Setup</DialogTitle>
        <DialogDescription className="text-gray-500 dark:text-gray-400 mt-2">
          Enable analytics for your project to track telemetry, monitor usage, and gain insights via the Falbor Analytics SDK.
        </DialogDescription>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="i-ph:chart-bar w-16 h-16 text-indigo-500 mb-4 opacity-80" />
        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Connect Analytics</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          This will install the <code className="bg-gray-100 dark:bg-[#333] px-1 rounded text-xs">falbor-analytics-sdk</code> in your project and configure your dashboard integration.
        </p>
        <SetupButton
          onClick={onEnableAnalytics}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
        >
          Enable Analytics
        </SetupButton>
      </div> */}
      <TextShimmer className="text-xl">Analytics is not available yet</TextShimmer>
    </div>
  );
}
