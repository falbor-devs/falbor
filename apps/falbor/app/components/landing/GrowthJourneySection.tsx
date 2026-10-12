'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type GrowthStep = {
  id: string;
  number: string;
  title: string;
  description: string;
  badge: string;
  imageSrc: string;
  imageAlt: string;
  color: string;
};

const STEPS: GrowthStep[] = [
  {
    id: "step-1",
    number: "01",
    title: "AI Analysis & Idea Breakdown",
    description: "Our agent deeply analyzes your initial product vision generating key market insights, identifying high-potential ideas, and structuring your core value proposition automatically.",
    badge: "Step 1: Discovery",
    imageSrc: "/landing/websites/setup_workspace.png",
    imageAlt: "AI Analysis & Insights",
    color: "#0099ff"
  },
  {
    id: "step-2",
    number: "02",
    title: "Target Audience & Market Structure",
    description: "Falbor builds a comprehensive framework defining your ideal user personas, audience demographics, competitor landscapes, and essential product feature priorities.",
    badge: "Step 2: Strategy",
    imageSrc: "/landing/websites/setup-ai.png",
    imageAlt: "Audience & Market Structure",
    color: "#0099ff"
  },
  {
    id: "step-3",
    number: "03",
    title: "Revenue Sources & Growth Channels",
    description: "Receive curated links, actionable growth sources, and targeted channel recommendations outlining exactly where to focus your marketing efforts to maximize early revenue.",
    badge: "Step 3: Monetization",
    imageSrc: "/landing/websites/sources-ai.png",
    imageAlt: "Revenue Sources & Growth Channels",
    color: "#0099ff"
  },
  {
    id: "step-4",
    number: "04",
    title: "Real-Time Product Dashboard",
    description: "Track your user engagement, analytics, live deployments, and performance metrics directly inside a unified product dashboard built to support long-term growth.",
    badge: "Step 4: Scale",
    imageSrc: "/landing/websites/product-ai.png",
    imageAlt: "Product Dashboard",
    color: "#0099ff"
  }
];

export default function GrowthJourneySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let attempts = 0;
    const attach = () => {
      const parentContainer = containerRef.current?.closest('.overflow-y-auto') || window;
      const sectionEl = containerRef.current;
      if (!sectionEl) {
        if (attempts++ < 20) setTimeout(attach, 50);
        return;
      }

      const onScroll = () => {
        const rect = sectionEl.getBoundingClientRect();
        const sectionHeight = sectionEl.offsetHeight;
        const viewportHeight = window.innerHeight;
        const totalScrollable = sectionHeight - viewportHeight;

        if (totalScrollable <= 0) return;

        const currentScroll = -rect.top;
        const progress = Math.max(0, Math.min(1, currentScroll / totalScrollable));
        const stepIndex = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length));
        setActiveIndex(stepIndex);
      };

      parentContainer.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      return () => {
        parentContainer.removeEventListener('scroll', onScroll);
        window.removeEventListener('scroll', onScroll);
      };
    };

    const cleanup = attach();
    return () => { if (cleanup) cleanup(); };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[400vh] bg-[#FAFAFA] dark:bg-black text-zinc-900 dark:text-white transition-colors duration-200">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden px-6 md:px-16">


        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center z-10">

          {/* Left Side: Title and Description */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={STEPS[activeIndex].id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight text-zinc-900 dark:text-white leading-[1.15]">
                  {STEPS[activeIndex].title}
                </h2>
                <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed font-light">
                  {STEPS[activeIndex].description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Step Indicators */}
            <div className="flex items-center gap-3 pt-4">
              {STEPS.map((step, idx) => (
                <div
                  key={step.id}
                  className={`h-1.5 rounded-full transition-all duration-500 ${idx === activeIndex ? 'w-10' : 'w-3 bg-zinc-200 dark:bg-zinc-800'
                    }`}
                  style={{ backgroundColor: idx === activeIndex ? step.color : undefined }}
                />
              ))}
            </div>
          </div>
          <div className="lg:col-span-7 relative w-full h-[380px] sm:h-[480px] md:h-[540px] flex items-center justify-center overflow-visible">
            {STEPS.map((step, idx) => {
              const isCurrent = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <motion.div
                  key={step.id}
                  initial={false}
                  animate={{
                    y: isCurrent ? '0%' : isPast ? '-100%' : '100%',
                    opacity: isCurrent ? 1 : 0,
                    scale: isCurrent ? 1 : 0.96,
                  }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
                >
                  <img
                    src={step.imageSrc}
                    alt={step.imageAlt}
                    className="w-full h-full object-contain pointer-events-auto"
                  />
                </motion.div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}
