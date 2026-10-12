import React from 'react';
import { cn } from '~/lib/utils';

interface SetupButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export function SetupButton({ variant = 'primary', icon, isLoading, className, children, ...props }: SetupButtonProps) {
  if (variant === 'secondary') {
    return (
      <button
        className={cn(
          "text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:underline whitespace-nowrap disabled:opacity-50 flex items-center gap-2",
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <div className="i-ph:spinner-gap animate-spin w-4 h-4" />}
        {children}
      </button>
    );
  }

  return (
    <button
      className={cn(
        "flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-[6px] font-medium text-[13px] transition-all shadow-sm whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed",
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <div className="i-ph:spinner-gap animate-spin w-4 h-4" /> : icon}
      {children}
    </button>
  );
}
