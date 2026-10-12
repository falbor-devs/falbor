import React from 'react';

export const MainContentSpinner = ({ message = 'Loading...' }: { message?: string }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full w-full p-8 text-gray-500 min-h-[300px]">
      <div className="relative flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        {message && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide animate-pulse">
            {message}
          </span>
        )}
      </div>
    </div>
  );
};
