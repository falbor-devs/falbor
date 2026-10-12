'use client';
import { useState, type PropsWithChildren } from 'react';

const FunctionCallBox = ({ children }: PropsWithChildren<{}>) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="artifact border border-falbor-elements-borderColor flex flex-col overflow-hidden rounded-lg w-full transition-all duration-150 my-3">
      <div className="flex w-full min-w-0">
        <button
          className="flex flex-1 min-w-0 items-stretch bg-falbor-elements-artifacts-background overflow-hidden hover:bg-falbor-elements-artifacts-backgroundHover transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="px-5 p-3.5 w-full text-left">
            <div className="w-full text-falbor-elements-textPrimary font-medium leading-5 text-sm flex items-center gap-2 min-w-0">
              <div className="i-ph:terminal-window" />
              <span className="truncate">System Function Call</span>
              <div className="flex-1" />
              <div className={`i-ph:caret-down text-falbor-elements-textSecondary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
            <div className="w-full text-falbor-elements-textSecondary text-xs mt-0.5">
              Click to view execution details
            </div>
          </div>
        </button>
      </div>
      {isExpanded && (
        <div className="p-4 bg-falbor-elements-background-depth-1 border-t border-falbor-elements-borderColor text-xs font-mono text-falbor-elements-textSecondary whitespace-pre-wrap overflow-x-auto">
          {children}
        </div>
      )}
    </div>
  );
};

export default FunctionCallBox;
