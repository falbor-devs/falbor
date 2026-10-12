import React from 'react';

export function FalborBuildTab() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1C1D21] flex items-center justify-center text-gray-600 dark:text-gray-400">
          <div className="i-ph:rocket-launch text-2xl" />
        </div>
        <div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">Build with Falbor</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Start a fresh project directly within your workspace</p>
        </div>
      </div>
      <div>
        <div className="bg-[#0099ff]/10 border border-[#0099ff]/20 p-6 rounded-xl">
          <h4 className="text-[#0099ff] font-medium mb-2 flex items-center gap-2">
            <div className="i-ph:info" />
            Start from Scratch
          </h4>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            By selecting this option, you'll enter the workspace with a clean slate. You can use Falbor's visual editor and AI tools to build your product entirely from the ground up, without importing any existing context or codebase.
          </p>
        </div>
      </div>
    </div>
  );
}
