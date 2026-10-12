import React from 'react';

export function SetupIllustration() {
  return (
    <div className="hidden lg:flex w-1/2 relative items-center justify-center">
      
      {}
      <div className="absolute left-10 top-1/2 -translate-y-1/2 w-48 h-48 opacity-40">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dotPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="2" fill="currentColor" className="text-gray-400" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotPattern)" />
        </svg>
      </div>

      {}
      <div className="relative w-[320px] h-[480px] bg-[#ebdfff] dark:bg-[#2a2440] rounded-[60px] rounded-br-none ml-20 flex flex-col items-center justify-center">
        
        {}
        <div className="absolute -left-20 top-20 w-64 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white/50 dark:border-gray-700/50 p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-1000">
          <div className="flex items-center gap-2 mb-2">
            <div className="i-ph:chat-teardrop-text text-[#3b28cc] w-4 h-4" />
            <span className="font-bold text-[10px] tracking-widest text-gray-800 dark:text-gray-200">FALBOR AI</span>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-3/4 rounded bg-gray-100 dark:bg-gray-700"></div>
            <div className="h-2.5 w-1/2 rounded bg-[#e8e2fa] dark:bg-indigo-900/30"></div>
            <div className="h-2.5 w-full rounded bg-gray-100 dark:bg-gray-700"></div>
          </div>
        </div>

        {}
        <div className="absolute -right-12 top-40 w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] border border-white/60 dark:border-gray-700/60 p-6 flex flex-col animate-in slide-in-from-bottom-8 duration-1000 delay-150">
          
          <div className="flex items-center justify-center mb-6">
            {}
            <div className="w-16 h-16 bg-[#c1f7d5] dark:bg-[#064e3b] rounded-2xl flex items-center justify-center shadow-inner">
              <div className="i-ph:scan text-[#059669] dark:text-[#34d399] w-8 h-8" />
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-600 mb-3"></div>
            <div className="h-1.5 w-24 rounded-full bg-gray-100 dark:bg-gray-700 mb-6"></div>
          </div>
          
          {}
          <div className="w-full h-10 bg-[#3b28cc] rounded-lg shadow-sm"></div>
        </div>

        {}
        <div className="absolute right-4 bottom-20 w-14 h-14 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)] border border-white/50 dark:border-gray-700/50 flex items-center justify-center animate-in zoom-in duration-1000 delay-300">
          <div className="i-ph:fingerprint text-[#8b5cf6] w-7 h-7" />
        </div>

      </div>
    </div>
  );
}
