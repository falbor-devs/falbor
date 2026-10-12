'use client';
import { motion } from 'framer-motion';

export default function AboutFalborSection() {
  return (
    <section className="relative w-full bg-black py-24 md:py-32 flex flex-col items-center justify-center overflow-hidden border-t border-white/5 z-10">

      {}
      <img
        src="/background/forest_bg.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none opacity-40"
      />
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-[0.03]">
        <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, #FF5800 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>
      <div className="relative z-10 max-w-3xl w-full px-6 mx-auto">
        <div
          className="flex flex-col space-y-8 text-lg md:text-xl text-white/70 leading-relaxed font-light"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            About Falbor
          </h2>
          <p className="text-2xl text-white/90 font-medium leading-snug">
            We’re two 16-year-old developers from Israel building Falbor.
          </p>
          <p>
            We started Falbor because building software has become incredibly fast, but figuring out <strong className="text-white font-medium">what is actually worth building</strong> is still hard.
          </p>
          <p>
            Today, you can describe an idea to an AI builder and have a working product in hours. But that doesn’t answer the harder questions:
          </p>
          <div className="bg-white/5 rounded-2xl p-8 my-4 backdrop-blur-sm">
            <ul className="space-y-4 text-white/80 font-medium">
              <li className="flex items-center gap-3"><span className="text-[#FF5800]/80">•</span> Who actually needs it?</li>
              <li className="flex items-center gap-3"><span className="text-[#FF5800]/80">•</span> Is the problem real?</li>
              <li className="flex items-center gap-3"><span className="text-[#FF5800]/80">•</span> What should the first version include?</li>
              <li className="flex items-center gap-3"><span className="text-[#FF5800]/80">•</span> How do you find your first users?</li>
            </ul>
          </div>
          <p>
            That’s what we’re trying to make easier with Falbor.
          </p>
          <p>
            Our goal is to create a place where you can start with an idea, research and validate it, understand who you’re building for, plan the right MVP, and only then start building.
          </p>
          <p>
            We’re still early, learning from every person who tries Falbor and improving it as we go.
          </p>
        </div>
      </div>
    </section>
  );
}
