"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const testimonials = [
    {
        id: 0,
        imagePlaceholder: "/landing/about/profileImages2.png",
        logoPlaceholder: "Falbor",
        quote: "We completely rebuilt our GTM stack with Falbor in under 90 days while growing pipeline 500%. The difference in operational clarity is incredible.",
        author: "Gabriel Shalmayev",
        title: "CEO & CMO",
        stat: "500% pipeline growth",
    },
    {
        id: 1,
        imagePlaceholder: "/landing/about/profileImages1.png",
        logoPlaceholder: "Falbor",
        quote: "As someone who worked in development, I can say that before Falbor it was much harder for me to create things and explain my ideas. Now I just describe what I need and it's done.",
        author: "Orel Revivo",
        title: "CTO, CEO & Founder",
        stat: "10× faster delivery",
    },
    {
        id: 2,
        imagePlaceholder: "/landing/about/profileImages1.png",
        logoPlaceholder: "Falbor",
        quote: "The darknet monitoring alone is worth it. We detected a credential leak within 8 minutes of it appearing on a paste site. That kind of intelligence used to cost us $40k/year.",
        author: "Sarah Chen",
        title: "Head of Security, Series B startup",
        stat: "8 min breach detection",
    },
    {
        id: 3,
        imagePlaceholder: "/landing/about/profileImages2.png",
        logoPlaceholder: "Falbor",
        quote: "Our team went from managing 5 separate tools to one Falbor workspace. The workflow automation replaced our entire Zapier setup and it's dramatically faster.",
        author: "Marcus Webb",
        title: "VP Engineering",
        stat: "5 tools replaced",
    },
];

export default function TestimonialsSection() {
    const [activeIndex, setActiveIndex] = useState(1);

    return (
        <div className="relative w-full flex flex-col items-center justify-center bg-[#FAFAFB] border-t border-zinc-200">
            {}
            <div className="w-full max-w-5xl mx-auto px-12 pt-16 pb-8">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <h2 className="text-[2rem] font-bold text-[#1a1a1a] leading-tight tracking-tight">
                            Builders love Falbor.<br />
                            <span className="text-zinc-400">Here's why.</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {testimonials.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveIndex(i)}
                                className="w-2 h-2 rounded-full transition-all duration-300 cursor-pointer"
                                style={{ background: i === activeIndex ? '#1a1a1a' : '#d4d4d8', transform: i === activeIndex ? 'scale(1.4)' : 'scale(1)' }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-full z-10">
                <div className="w-full flex flex-row h-[380px] overflow-hidden bg-white shadow-sm border-t border-zinc-100">
                    {testimonials.map((t, i) => {
                        const isActive = activeIndex === i;

                        return (
                            <motion.div
                                key={t.id}
                                layout
                                onClick={() => setActiveIndex(i)}
                                animate={{
                                    flexGrow: isActive ? 1 : 0,
                                    width: isActive ? "auto" : "130px"
                                }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className={`
                  relative flex flex-row items-center h-full cursor-pointer overflow-hidden
                  ${!isActive ? "border-r border-zinc-200 bg-gray-50 hover:bg-gray-100" : ""}
                  ${i !== testimonials.length - 1 && !isActive ? "border-r border-zinc-200" : ""}
                `}
                            >
                                {}
                                <motion.div
                                    layout
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                    className={`
                    flex items-center justify-center h-full min-w-[130px]
                    ${isActive ? "w-[220px] border-r border-zinc-100" : "w-full"}
                  `}
                                >
                                    <motion.img
                                        layout
                                        src={t.imagePlaceholder}
                                        alt={t.author}
                                        className={`
                      object-contain
                      ${isActive ? "w-[160px] h-[160px]" : "w-[80px] h-[80px] grayscale opacity-60"}
                    `}
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                </motion.div>

                                {}
                                <AnimatePresence mode="wait">
                                    {isActive && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3, delay: 0.2 }}
                                            className="flex flex-col justify-center px-10 min-w-[460px] h-full"
                                        >
                                            <div className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                                                <img src="/favicon.ico" className="w-6 h-6" alt="falbor" />
                                                {t.logoPlaceholder}
                                            </div>

                                            {}
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 text-xs font-semibold mb-4 w-fit">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                                                {t.stat}
                                            </div>

                                            <h3 className="text-xl md:text-[22px] leading-[1.45] font-medium text-[#1a1a1a] mb-5 font-serif">
                                                "{t.quote}"
                                            </h3>

                                            <div className="text-[13px] text-gray-800">
                                                <span className="font-bold">{t.author}</span>, <span className="text-gray-500">{t.title}</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}