import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '~/components/ui/Button';

interface ServiceHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  onTestConnection?: () => void;
  isTestingConnection?: boolean;
  additionalInfo?: React.ReactNode;
  delay?: number;
}

export const ServiceHeader = memo(
  ({
    icon: Icon, 
    title,
    description,
    onTestConnection,
    isTestingConnection,
    additionalInfo,
    delay = 0.1,
  }: ServiceHeaderProps) => {
    return (
      <>
        <motion.div
          className="flex items-center justify-between gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay }}
        >
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <h2 className="text-lg font-medium text-falbor-elements-textPrimary dark:text-falbor-elements-textPrimary">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {additionalInfo}
            {onTestConnection && (
              <Button
                onClick={onTestConnection}
                disabled={isTestingConnection}
                variant="outline"
                className="flex items-center gap-2 hover:bg-falbor-elements-item-backgroundActive/10 hover:text-falbor-elements-textPrimary dark:hover:bg-falbor-elements-item-backgroundActive/10 dark:hover:text-falbor-elements-textPrimary transition-colors"
              >
                {isTestingConnection ? (
                  <>
                    <div className="i-ph:spinner-gap w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <div className="i-ph:plug-charging w-4 h-4" />
                    Test Connection
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>

        {description && (
          <p className="text-sm text-falbor-elements-textSecondary dark:text-falbor-elements-textSecondary">
            {description}
          </p>
        )}
      </>
    );
  },
);
