import React from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';


const GRADIENT_COLORS = [
  'from-purple-500/10 to-blue-500/5',
  'from-blue-500/10 to-cyan-500/5',
  'from-cyan-500/10 to-green-500/5',
  'from-green-500/10 to-yellow-500/5',
  'from-yellow-500/10 to-orange-500/5',
  'from-orange-500/10 to-red-500/5',
  'from-red-500/10 to-pink-500/5',
  'from-pink-500/10 to-purple-500/5',
];

interface GradientCardProps {
  
  gradient?: string;

  
  seed?: string;

  
  hoverEffect?: boolean;

  
  borderEffect?: boolean;

  
  children: React.ReactNode;

  
  className?: string;

  
  [key: string]: any;
}


export function GradientCard({
  gradient,
  seed,
  hoverEffect = true,
  borderEffect = true,
  className,
  children,
  ...props
}: GradientCardProps) {
  
  const gradientClass = gradient || getGradientColorFromSeed(seed);

  
  const hoverAnimation = hoverEffect
    ? {
        whileHover: {
          scale: 1.02,
          y: -2,
          transition: { type: 'spring', stiffness: 400, damping: 17 },
        },
        whileTap: { scale: 0.98 },
      }
    : undefined;

  return (
    <motion.div
      className={classNames(
        'p-5 rounded-xl bg-gradient-to-br',
        gradientClass,
        borderEffect
          ? 'border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark hover:border-purple-500/40'
          : '',
        'transition-all duration-300 shadow-sm',
        hoverEffect ? 'hover:shadow-md' : '',
        className,
      )}
      {...hoverAnimation}
      {...props}
    >
      {children}
    </motion.div>
  );
}


function getGradientColorFromSeed(seedString?: string): string {
  if (!seedString) {
    return GRADIENT_COLORS[0];
  }

  const index = seedString.length % GRADIENT_COLORS.length;

  return GRADIENT_COLORS[index];
}
