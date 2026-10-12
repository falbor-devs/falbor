'use client';
import { useState, type PropsWithChildren } from 'react';

const ThoughtBox = ({ title, children }: PropsWithChildren<{ title: string }>) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-3 border border-falbor-elements-borderColor rounded-lg bg-falbor-elements-background-depth-2 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center gap-3 text-left text-falbor-elements-textSecondary hover:bg-falbor-elements-background-depth-3 transition-colors duration-150"
      >
        <div className="i-ph:brain-thin text-xl shrink-0" />
        <span className="font-medium text-sm flex-1">{title}</span>
        <div className={`i-ph:caret-down text-sm transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 text-sm text-falbor-elements-textSecondary border-t border-falbor-elements-borderColor">
          {children}
        </div>
      )}
    </div>
  );
};

export default ThoughtBox;
