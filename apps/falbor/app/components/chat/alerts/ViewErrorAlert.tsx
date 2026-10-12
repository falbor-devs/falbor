'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { classNames } from '~/utils/classNames';

import { usePathname } from 'next/navigation';

interface ViewError {
  message: string;
  stack?: string;
  source: 'preview' | 'terminal' | 'app';
  timestamp: number;
}

interface Props {
  postMessage: (message: string) => void;
}

export default function ViewErrorAlert({ postMessage }: Props) {
  const [error, setError] = useState<ViewError | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError({
        message: event.message,
        stack: event.error?.stack,
        source: 'app',
        timestamp: Date.now(),
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = typeof event.reason === 'string' ? event.reason : event.reason?.message || 'Unhandled Promise Rejection';
      setError({
        message,
        stack: event.reason?.stack,
        source: 'app',
        timestamp: Date.now(),
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const source = error?.source || 'app';
  const title = source === 'preview' ? 'Preview Error' : source === 'terminal' ? 'Terminal Error' : 'Application Error';
  const message = source === 'preview'
    ? 'We encountered an error while running the preview. Would you like Falbor to analyze and help resolve this issue?'
    : source === 'terminal'
      ? 'We encountered an error while running terminal commands. Would you like Falbor to analyze and help resolve this issue?'
      : 'An unexpected error occurred. Would you like Falbor to analyze and help resolve this issue?';

  if (pathname === '/' || pathname === '/hacking') return null;

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="hidden md:block rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 p-4 mb-2"
        >
          <div className="flex items-start">
            <motion.div
              className="flex-shrink-0"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="i-ph:warning-duotone text-xl text-falbor-elements-button-danger-text"></div>
            </motion.div>
            <div className="ml-3 flex-1">
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm font-medium text-falbor-elements-textPrimary"
              >
                {title}
              </motion.h3>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-2 text-sm text-falbor-elements-textSecondary"
              >
                <p>{message}</p>
                {error.message && (
                  <div className="text-xs text-falbor-elements-textSecondary p-2 bg-falbor-elements-background-depth-3 rounded mt-4 mb-4">
                    Error: {error.message}
                  </div>
                )}
              </motion.div>

              <motion.div
                className="mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      postMessage(
                        `*Fix this ${source === 'preview' ? 'preview' : source === 'terminal' ? 'terminal' : 'application'} error* \n\`\`\`${source === 'preview' ? 'js' : source === 'terminal' ? 'sh' : 'txt'}\n${error.stack || error.message}\n\`\`\`\n`,
                      );
                      setError(null);
                    }}
                    className={classNames(
                      'px-2 py-1.5 rounded-md text-sm font-medium',
                      'bg-falbor-elements-button-primary-background',
                      'hover:bg-falbor-elements-button-primary-backgroundHover',
                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-falbor-elements-button-danger-background',
                      'text-falbor-elements-button-primary-text',
                      'flex items-center gap-1.5',
                    )}
                  >
                    <div className="i-ph:chat-circle-duotone"></div>
                    Ask Falbor
                  </button>
                  <button
                    onClick={() => setError(null)}
                    className={classNames(
                      'px-2 py-1.5 rounded-md text-sm font-medium',
                      'bg-falbor-elements-button-secondary-background',
                      'hover:bg-falbor-elements-button-secondary-backgroundHover',
                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-falbor-elements-button-secondary-background',
                      'text-falbor-elements-button-secondary-text',
                    )}
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
