'use client';
import { motion } from 'framer-motion';

import { Lightbulb, Search, CheckCircle, Users, Target, Rocket } from 'lucide-react';

const STEPS = [
  { title: 'Idea', description: 'Start with what you want to create', icon: Lightbulb },
  { title: 'Research', description: 'Understand the market and competitors', icon: Search },
  { title: 'Validate', description: 'Check whether the problem is real', icon: CheckCircle },
  { title: 'Find users', description: 'Know who to reach first', icon: Users },
  { title: 'Plan MVP', description: 'Decide what actually needs to be built', icon: Target },
  { title: 'Build', description: 'Turn the plan into a working product', icon: Rocket },
];

export default function IdeaToMVPSection() {
  return (
    <section className="relative w-full bg-black py-24 flex flex-col items-center justify-center overflow-hidden border-t border-white/5 z-10">
      <div className="relative z-10 max-w-6xl w-full px-6 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center max-w-7xl"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl text-white mb-6 tracking-tight">
            From idea to something worth building.
          </h2>
          <p className="text-lg md:text-xl text-white/70 leading-relaxed">
            Falbor helps you understand the idea first, then turns that context into a focused MVP.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full relative">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative z-10 p-8 rounded-2xl bg-[#0a0a0a]/50 transition-all group flex flex-col shadow-lg"
            >
              <div className="mb-6 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all origin-left text-white">
                <step.icon size={32} strokeWidth={1.5} />
              </div>

              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xl font-semibold text-white tracking-wide">
                  {step.title}
                </h3>
              </div>

              <p className="text-white/50 text-sm leading-relaxed group-hover:text-white/70 transition-colors">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
