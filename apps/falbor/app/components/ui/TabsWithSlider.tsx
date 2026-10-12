'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';

interface Tab {

  id: string;


  label: React.ReactNode;


  icon?: string;
}

interface TabsWithSliderProps {

  tabs: Tab[];


  activeTab: string;


  onChange: (tabId: string) => void;


  className?: string;


  tabClassName?: string;


  activeTabClassName?: string;


  sliderClassName?: string;
}


export function TabsWithSlider({
  tabs,
  activeTab,
  onChange,
  className,
  tabClassName,
  activeTabClassName,
  sliderClassName,
}: TabsWithSliderProps) {

  const [sliderDimensions, setSliderDimensions] = useState({ width: 0, left: 0 });


  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);


  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

    if (activeIndex !== -1 && tabsRef.current[activeIndex]) {
      const activeTabElement = tabsRef.current[activeIndex];

      if (activeTabElement) {
        setSliderDimensions({
          width: activeTabElement.offsetWidth,
          left: activeTabElement.offsetLeft,
        });
      }
    }
  }, [activeTab, tabs]);

  return (
    <div className={classNames('relative flex gap-2', className)}>
      { }
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el: HTMLButtonElement | null) => { tabsRef.current[index] = el; }}
          onClick={() => onChange(tab.id)}
          className={classNames(
            'px-4 py-2 h-10 rounded-lg transition-all duration-200 flex items-center gap-2 min-w-[120px] justify-center relative overflow-hidden',
            tab.id === activeTab
              ? classNames('text-white shadow-sm shadow-purple-500/20', activeTabClassName)
              : classNames(
                'bg-falbor-elements-background-depth-2 dark:bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary dark:text-falbor-elements-textPrimary-dark hover:bg-falbor-elements-background-depth-3 dark:hover:bg-falbor-elements-background-depth-4 border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark',
                tabClassName,
              ),
          )}
        >
          <span className={classNames('flex items-center gap-2', tab.id === activeTab ? 'font-medium' : '')}>
            {tab.icon && <span className={tab.icon} />}
            {tab.label}
          </span>
        </button>
      ))}

      { }
      <motion.div
        className={classNames('absolute bottom-0 left-0 h-10 rounded-lg bg-purple-500 -z-10', sliderClassName)}
        initial={false}
        animate={{
          width: sliderDimensions.width,
          x: sliderDimensions.left,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    </div>
  );
}
