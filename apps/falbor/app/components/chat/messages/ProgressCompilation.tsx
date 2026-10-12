'use client';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import type { ProgressAnnotation } from '~/types/context';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';

export default function ProgressCompilation({ data }: { data?: ProgressAnnotation[] }) {
  const [progressList, setProgressList] = React.useState<ProgressAnnotation[]>([]);
  const [expanded, setExpanded] = useState(false);
  const prevDataRef = React.useRef('');
  React.useEffect(() => {
    const currStr = JSON.stringify(data);
    if (currStr === prevDataRef.current) return;
    prevDataRef.current = currStr;

    if (!data || data.length == 0) {
      setProgressList([]);
      return;
    }

    const progressMap = new Map<string, ProgressAnnotation>();
    data.forEach((x) => {
      const existingProgress = progressMap.get(x.label);

      if (existingProgress && existingProgress.status === 'complete') {
        return;
      }

      progressMap.set(x.label, x);
    });

    const newData = Array.from(progressMap.values());
    newData.sort((a, b) => a.order - b.order);
    setProgressList(newData);
  }, [data]);

  if (progressList.length === 0) {
    return <></>;
  }

  return (
    <AnimatePresence>
      <div
        className={classNames(
          'rounded-b-xl relative w-[95%] bg-white/60 mx-auto z-prompt mb-[-8px]',
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          className={classNames(
            'bg-[#E3E3E3]/10 h-[30px] dark:bg-[#1F1F1F] border border-t-0 border-[#D6D6D6] pb-3',
            'px-2 py-0.5 rounded-b-lg text-[#545454]',
            'flex ',
          )}
        >
          <div className="flex-1 mt-0.5">
            <AnimatePresence>
              {expanded ? (
                <motion.div
                  className="actions"
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: '0px' }}
                  transition={{ duration: 0.15 }}
                >
                  {progressList.map((x, i) => {
                    return <ProgressItem key={i} progress={x} />;
                  })}
                </motion.div>
              ) : (
                <ProgressItem progress={progressList.slice(-1)[0]} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}

const ProgressItem = ({ progress }: { progress: ProgressAnnotation }) => {
  return (
    <motion.div
      className={classNames('flex text-sm gap-3', (progress.status as string) === 'error' ? 'text-red-500 font-medium' : '')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-1.5 ">
        <div>
          {progress.status === 'in-progress' ? (
            <div className="i-svg-spinners:90-ring-with-bg"></div>
          ) : progress.status === 'complete' ? (
            <div className="i-ph:check"></div>
          ) : (progress.status as string) === 'error' ? (
            <div className="i-ph:warning-circle text-red-500"></div>
          ) : null}
        </div>
      </div>
      {progress.message}
    </motion.div>
  );
};
