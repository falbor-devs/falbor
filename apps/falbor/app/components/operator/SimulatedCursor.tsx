'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function SimulatedCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const handleSimulateClick = (e: Event) => {
      const customEvent = e as CustomEvent<{ selector: string }>;
      const selector = customEvent.detail?.selector;
      if (!selector) return;

      const target = document.querySelector(selector) as HTMLElement;
      if (target) {
        const rect = target.getBoundingClientRect();
        // Move to the center of the element
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        setIsVisible(true);
        setPosition({ x, y });

        // Simulate click after moving
        setTimeout(() => {
          setIsClicking(true);
          
          setTimeout(() => {
            target.click();
            setIsClicking(false);
            
            // Hide cursor after click
            setTimeout(() => {
              setIsVisible(false);
            }, 500);
          }, 150);
        }, 600); // Wait for the move animation (approx)
      }
    };

    window.addEventListener('falbor:simulateClick', handleSimulateClick);
    return () => window.removeEventListener('falbor:simulateClick', handleSimulateClick);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: isVisible ? 1 : 0,
        x: position.x,
        y: position.y,
        scale: isClicking ? 0.8 : 1
      }}
      transition={{ 
        x: { type: 'spring', damping: 20, stiffness: 100 },
        y: { type: 'spring', damping: 20, stiffness: 100 },
        scale: { duration: 0.1 }
      }}
      className="fixed top-0 left-0 z-[9999] pointer-events-none"
      style={{
        width: 24,
        height: 24,
        marginLeft: -12,
        marginTop: -12,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.44c.45 0 .67-.54.35-.85L6.35 3.21a.5.5 0 00-.85.35z"
          fill="#1d4ed8"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {isClicking && (
        <motion.div
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-blue-500 rounded-full"
        />
      )}
    </motion.div>
  );
}
