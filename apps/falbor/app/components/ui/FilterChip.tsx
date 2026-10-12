import React from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';

interface FilterChipProps {
  
  label: string;

  
  value?: string | number;

  
  onRemove?: () => void;

  
  active?: boolean;

  
  icon?: string;

  
  className?: string;
}


export function FilterChip({ label, value, onRemove, active = false, icon, className }: FilterChipProps) {
  
  const variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ duration: 0.2 }}
      className={classNames(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
        active
          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
          : 'bg-falbor-elements-background-depth-2 dark:bg-falbor-elements-background-depth-3 text-falbor-elements-textSecondary dark:text-falbor-elements-textSecondary-dark border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark',
        onRemove && 'pr-1',
        className,
      )}
    >
      {}
      {icon && <span className={classNames(icon, 'text-inherit')} />}

      {}
      <span>
        {label}
        {value !== undefined && ': '}
        {value !== undefined && (
          <span
            className={
              active
                ? 'text-purple-700 dark:text-purple-300 font-semibold'
                : 'text-falbor-elements-textPrimary dark:text-falbor-elements-textPrimary-dark'
            }
          >
            {value}
          </span>
        )}
      </span>

      {}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={classNames(
            'ml-1 p-0.5 rounded-full hover:bg-falbor-elements-background-depth-3 dark:hover:bg-falbor-elements-background-depth-4 transition-colors',
            active
              ? 'text-purple-600 dark:text-purple-400'
              : 'text-falbor-elements-textTertiary dark:text-falbor-elements-textTertiary-dark',
          )}
          aria-label={`Remove ${label} filter`}
        >
          <span className="i-ph:x w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}
