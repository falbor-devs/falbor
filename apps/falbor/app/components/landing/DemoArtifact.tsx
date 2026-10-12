'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';

interface DemoArtifactProps {
  title: string;
  items: {
    icon?: string;
    name: string;
    status: string;
    type?: 'start' | 'file' | 'shell' | 'question' | 'complete' | 'validation';
    modalContent?: React.ReactNode;
  }[];
  isComplete?: boolean;
  defaultOpen?: boolean;
  onOpenModal?: (content: React.ReactNode) => void;
}

const actionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function DemoArtifact({ title, items, isComplete = true, defaultOpen = true, onOpenModal }: DemoArtifactProps) {
  const [showActions, setShowActions] = useState(defaultOpen);

  const toggleActions = () => {
    setShowActions(!showActions);
  };

  return (
    <div className="w-full mt-4 flex flex-col artifact border border-falbor-elements-borderColor overflow-hidden rounded-lg transition-all duration-150 shadow-sm">
      <div className="flex">
        <button
          className="flex items-stretch bg-falbor-elements-artifacts-background w-full overflow-hidden hover:bg-falbor-elements-artifacts-backgroundHover transition-colors text-left"
          onClick={toggleActions}
        >
          <div className="px-5 p-3.5 w-full text-left flex justify-between items-center">
            <div>
              <div className="w-full text-falbor-elements-textPrimary font-medium leading-5 text-sm flex items-center gap-2">
                <span>{title}</span>
              </div>
              <div className="w-full text-falbor-elements-textSecondary text-xs mt-0.5">
                Click to open Workbench
              </div>
            </div>
          </div>
        </button>

        <div className="bg-falbor-elements-artifacts-borderColor w-[1px]" />

        <AnimatePresence>
          <motion.button
            initial={{ width: 0 }}
            animate={{ width: 'auto' }}
            exit={{ width: 0 }}
            transition={{ duration: 0.15, ease: cubicEasingFn }}
            className="bg-falbor-elements-artifacts-background hover:bg-falbor-elements-artifacts-backgroundHover"
            onClick={toggleActions}
          >
            <div className="p-4">
              <div className={showActions ? 'i-ph:caret-up-bold text-falbor-elements-textSecondary' : 'i-ph:caret-down-bold text-falbor-elements-textSecondary'}></div>
            </div>
          </motion.button>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showActions && (
          <motion.div
            className="actions"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: '0px' }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-falbor-elements-artifacts-borderColor h-[1px]" />
            <div className="p-5 text-left bg-falbor-elements-actions-background">
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="list-none space-y-2.5"
              >
                {items.map((item, idx) => (
                  <motion.li
                    key={idx}
                    variants={actionVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      if (item.modalContent && onOpenModal) {
                        onOpenModal(item.modalContent);
                      }
                    }}
                    className={classNames(
                      "flex items-center justify-between text-sm",
                      item.modalContent ? "cursor-pointer hover:bg-white/5 p-1 -m-1 rounded transition-colors" : ""
                    )}
                  >
                    <div className="flex items-center gap-2 text-falbor-elements-textPrimary">
                      <div className={classNames('text-lg',
                        item.type === 'start' ? 'text-falbor-elements-textSecondary' :
                          item.type === 'complete' ? 'text-[#28a745]' :
                            item.type === 'validation' ? 'text-blue-400' :
                              'text-falbor-elements-item-contentAccent'
                      )}>
                        {item.type === 'start' ? (
                          <div className="i-svg-spinners:90-ring-with-bg" />
                        ) : item.type === 'complete' ? (
                          <div className="i-ph:check" />
                        ) : (
                          <div className={item.icon || 'i-ph:file-code-duotone'} />
                        )}
                      </div>
                      <span>{item.name}</span>
                    </div>
                    <div className="text-falbor-elements-textSecondary text-xs">
                      {item.status}
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
