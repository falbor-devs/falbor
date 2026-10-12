import React from 'react';
import { classNames } from '~/utils/classNames';
import { Button } from './Button';
import { motion } from 'framer-motion';


const VARIANT_STYLES = {
  default: {
    container: 'py-8 p-6',
    icon: {
      container: 'w-12 h-12 mb-3',
      size: 'w-6 h-6',
    },
    title: 'text-base',
    description: 'text-sm mt-1',
    actions: 'mt-4',
    buttonSize: 'default' as const,
  },
  compact: {
    container: 'py-4 p-4',
    icon: {
      container: 'w-10 h-10 mb-2',
      size: 'w-5 h-5',
    },
    title: 'text-sm',
    description: 'text-xs mt-0.5',
    actions: 'mt-3',
    buttonSize: 'sm' as const,
  },
};

interface EmptyStateProps {
  
  icon?: string;

  
  title: string;

  
  description?: string;

  
  actionLabel?: string;

  
  onAction?: () => void;

  
  secondaryActionLabel?: string;

  
  onSecondaryAction?: () => void;

  
  className?: string;

  
  variant?: 'default' | 'compact';
}


export function EmptyState({
  icon = 'i-ph:folder-simple-dashed',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  variant = 'default',
}: EmptyStateProps) {
  
  const styles = VARIANT_STYLES[variant];

  
  const buttonAnimation = {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
  };

  return (
    <div
      className={classNames(
        'flex flex-col items-center justify-center',
        'text-falbor-elements-textSecondary dark:text-falbor-elements-textSecondary-dark',
        'bg-falbor-elements-background-depth-2 dark:bg-falbor-elements-background-depth-3 rounded-lg',
        styles.container,
        className,
      )}
    >
      {}
      <div
        className={classNames(
          'rounded-full bg-falbor-elements-background-depth-3 dark:bg-falbor-elements-background-depth-4 flex items-center justify-center',
          styles.icon.container,
        )}
      >
        <span
          className={classNames(
            icon,
            styles.icon.size,
            'text-falbor-elements-textTertiary dark:text-falbor-elements-textTertiary-dark',
          )}
        />
      </div>

      {}
      <p className={classNames('font-medium', styles.title)}>{title}</p>

      {}
      {description && (
        <p
          className={classNames(
            'text-falbor-elements-textTertiary dark:text-falbor-elements-textTertiary-dark text-center max-w-xs',
            styles.description,
          )}
        >
          {description}
        </p>
      )}

      {}
      {(actionLabel || secondaryActionLabel) && (
        <div className={classNames('flex items-center gap-2', styles.actions)}>
          {actionLabel && onAction && (
            <motion.div {...buttonAnimation}>
              <Button
                onClick={onAction}
                variant="default"
                size={styles.buttonSize}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {actionLabel}
              </Button>
            </motion.div>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <motion.div {...buttonAnimation}>
              <Button onClick={onSecondaryAction} variant="outline" size={styles.buttonSize}>
                {secondaryActionLabel}
              </Button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
