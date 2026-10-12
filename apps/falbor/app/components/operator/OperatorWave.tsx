import { motion } from 'framer-motion';

interface OperatorWaveProps {
  isThinking: boolean;
  audioLevel?: number;
}

export function OperatorWave({ isThinking, audioLevel = 0 }: OperatorWaveProps) {
  // Map 0-255 audio level to 4px-24px height
  const dynamicHeight = Math.max(4, Math.min(24, (audioLevel / 255) * 100));

  return (
    <div className="flex items-center gap-1 h-6">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-1 bg-white rounded-full"
          animate={{
            height: isThinking 
              ? ['4px', '12px', '4px'] 
              : audioLevel > 5 ? `${dynamicHeight * (0.6 + i * 0.2)}px` : '4px',
            opacity: isThinking ? [0.5, 1, 0.5] : 1,
          }}
          transition={{
            duration: isThinking ? 0.8 : 0.1,
            repeat: isThinking ? Infinity : 0,
            delay: isThinking ? i * 0.2 : 0,
          }}
        />
      ))}
    </div>
  );
}
