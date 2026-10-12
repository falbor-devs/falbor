'use client';
import { motion } from 'framer-motion';

const TOOLS = [
  { name: 'Base44', angle: 0, image: '/icons/membership/Base44.png' },
  { name: 'Bolt', angle: 72, image: '/icons/membership/bolt-new.png' },
  { name: 'Lovable', angle: 144, image: '/icons/membership/lovable.png' },
  { name: 'Replit', angle: 216, image: '/icons/membership/replit.png' },
  { name: 'v0', angle: 288, image: '/icons/membership/v0.png' },
];

const PROCESS_STEPS = [
  'Idea',
  'Research',
  'Validate',
  'MVP',
  'Build',
  'Launch'
];

export default function BuilderJourneySection() {
  return (
    <section className="relative w-full bg-white dark:bg-black py-24 flex flex-col items-center justify-center overflow-hidden border-t border-zinc-200 dark:border-white/5 z-10 transition-colors duration-200">

      { }
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none opacity-20">
        <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, #FF5800 0%, transparent 60%)', filter: 'blur(100px)' }} />
      </div>

      <div className="relative z-10 max-w-6xl w-full px-6 flex flex-col items-center">

        <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-16 mb-24">
          { }
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:w-1/2 text-center lg:text-left"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl text-zinc-900 dark:text-white mb-6 tracking-tight">
              Great builders start with the build.
            </h2>
            <p className="text-lg md:text-xl text-zinc-650 dark:text-white/70 leading-relaxed max-w-lg mx-auto lg:mx-0">
              They're great at turning prompts into products but building is only one part of the journey.
            </p>
          </motion.div>

          { }
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center shrink-0"
          >
            <div className="absolute inset-4 rounded-full border border-zinc-200 dark:border-white/5 border-dashed" />

            { }
            <div className="relative z-20 w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br to-[#ff8c42] flex items-center justify-center shadow-[0_0_40px_rgba(255,88,0,0.4)]">
              <span className="text-xl md:text-2xl font-bold text-white tracking-wide">Build</span>
            </div>

            { }
            {TOOLS.map((tool, i) => {
              return (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="absolute inset-4 z-10 pointer-events-none rounded-full"
                  style={{
                    transform: `rotate(${tool.angle}deg)`,
                  }}
                >
                  <div
                    className="absolute top-0 left-1/2 flex items-center justify-center pointer-events-auto"
                    style={{
                      transform: `translate(-50%, -50%) rotate(-${tool.angle}deg)`,
                    }}
                  >
                    <div className="flex items-center justify-center p-2 hover:scale-110 transition-transform cursor-pointer">
                      <img
                        src={tool.image}
                        alt={tool.name}
                        className={`${tool.name === 'Base44' ? 'h-6 md:h-8' : 'h-8 md:h-14'} w-auto object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        { }
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full relative"
        >
          <div className="relative flex flex-col md:flex-row items-center justify-between w-full max-w-4xl mx-auto gap-4 md:gap-0">
            { }
            <div className="hidden md:block absolute top-1/2 left-[5%] right-[5%] h-[2px] bg-zinc-200 dark:bg-white/10 -translate-y-1/2 z-0" />

            {PROCESS_STEPS.map((step, index) => (
              <div key={step} className="relative z-10 flex flex-row md:flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm transition-colors duration-300
                  ${step === 'Build'
                    ? 'border border-[#FF5800]/50 bg-[#FF5800]/20 text-[#FF5800] shadow-[0_0_20px_rgba(255,88,0,0.2)]'
                    : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/60 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-transparent'
                  }`}
                >
                  <span className="font-semibold text-sm">{index + 1}</span>
                </div>
                <span className={`text-sm font-medium ${step === 'Build' ? 'text-[#FF5800]' : 'text-zinc-700 dark:text-white/80'}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
