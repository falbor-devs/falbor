import React from 'react';
import { classNames } from '~/utils/classNames';


type StatusType = 'online' | 'offline' | 'away' | 'busy' | 'success' | 'warning' | 'error' | 'info' | 'loading';


type SizeType = 'sm' | 'md' | 'lg';


const STATUS_COLORS: Record<StatusType, string> = {
  online: 'bg-green-500',
  success: 'bg-green-500',
  offline: 'bg-red-500',
  error: 'bg-red-500',
  away: 'bg-yellow-500',
  warning: 'bg-yellow-500',
  busy: 'bg-red-500',
  info: 'bg-blue-500',
  loading: 'bg-purple-500',
};


const SIZE_CLASSES: Record<SizeType, string> = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};


const TEXT_SIZE_CLASSES: Record<SizeType, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

interface StatusIndicatorProps {
  
  status: StatusType;

  
  size?: SizeType;

  
  pulse?: boolean;

  
  label?: string;

  
  className?: string;
}


export function StatusIndicator({ status, size = 'md', pulse = false, label, className }: StatusIndicatorProps) {
  
  const colorClass = STATUS_COLORS[status] || 'bg-gray-500';

  
  const sizeClass = SIZE_CLASSES[size];

  
  const textSizeClass = TEXT_SIZE_CLASSES[size];

  return (
    <div className={classNames('flex items-center gap-2', className)}>
      {}
      <span className={classNames('rounded-full relative', colorClass, sizeClass)}>
        {}
        {pulse && <span className={classNames('absolute inset-0 rounded-full animate-ping opacity-75', colorClass)} />}
      </span>

      {}
      {label && (
        <span
          className={classNames(
            'text-falbor-elements-textSecondary dark:text-falbor-elements-textSecondary-dark',
            textSizeClass,
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
