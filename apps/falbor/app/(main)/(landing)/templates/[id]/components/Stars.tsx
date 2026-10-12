import React from 'react';

export function Stars({
  rating,
  size = 'md',
  interactive = false,
  onSelect,
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onSelect?: (value: number) => void;
}) {
  const iconSize = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';

  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= rating;
        const content = (
          <span
            className={`${iconSize} inline-flex items-center justify-center transition-colors ${active ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'
              }`}
            aria-hidden="true"
          >
            {active ? '★' : '☆'}
          </span>
        );

        if (!interactive) {
          return <React.Fragment key={star}>{content}</React.Fragment>;
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onSelect?.(star)}
            className="rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label={`Rate ${star} out of 5`}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
