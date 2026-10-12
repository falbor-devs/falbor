import React from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';

interface CloseButtonProps {
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}


export function CloseButton({ onClick, className, size = 'md' }: CloseButtonProps) {
  const sizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={classNames(
        'text-falbor-elements-textTertiary hover:text-falbor-elements-textSecondary dark:text-falbor-elements-textTertiary-dark dark:hover:text-falbor-elements-textSecondary-dark',
        'rounded-lg hover:bg-falbor-elements-background-depth-2 dark:hover:bg-falbor-elements-background-depth-3',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
        sizeClasses[size],
        className,
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Close"
    >
      <div className={classNames('i-ph:x', iconSizeClasses[size])} />
    </motion.button>
  );
}
