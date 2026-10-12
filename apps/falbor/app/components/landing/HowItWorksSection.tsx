"use client";

import { motion } from "framer-motion";

const steps = [
    {
        number: "01",
        title: "Describe your idea",
        description:
            "Type what you want to build in plain language. No technical specs, no wireframes, no boilerplate. Just your vision.",
        detail: ["Natural language input", "Multi-turn refinement", "Context-aware suggestions"],
        color: "#FF5800",
    },
    {
        number: "02",
        title: "AI builds it for you",
        description:
            "Falbor's agentic AI writes production-ready code, spins up a database, and wires up all the logic — while you watch it happen in real time.",
        detail: ["Live code streaming", "Auto-provisioned backend", "AI error self-correction"],
        color: "#FF5800",
    },
    {
        number: "03",
        title: "Deploy instantly",
        description:
            "Push to a live URL with one click. Share with users, invite your team, connect a custom domain — it's production-ready from the start.",
        detail: ["One-click deployment", "Custom domain support", "Instant rollbacks"],
        color: "#FF5800",
    },
];

const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.18 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 32 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export default function HowItWorksSection() {
    return (
        <div className="relative w-full bg-[#030303] overflow-hidden py-32">
            {}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,88,0,0.08) 0%, transparent 70%)' }} />
            <div className="relative z-10 w-full max-w-6xl mx-auto px-8 md:px-16">
                {}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-20 text-center"
                >
                    <h2 className="text-[2.5rem] md:text-[3rem] text-white leading-[1.1] tracking-tight mb-5">
                        From idea to live product<br />
                        <span style={{ background: 'linear-gradient(90deg, #FF5800, #ff8c42)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            in three steps.
                        </span>
                    </h2>
                    <p className="text-zinc-500 text-lg max-w-xl mx-auto leading-relaxed">
                        No DevOps, no infrastructure decisions, no context-switching. Just describe, build, ship.
                    </p>
                </motion.div>
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-60px" }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
                >
                    <div className="hidden md:block absolute top-[52px] left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-px bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 z-0" />
                    {steps.map((step, i) => (
                        <motion.div key={step.number} variants={itemVariants} className="relative z-10">
                            <div className="flex flex-col h-full p-7 rounded-2xl bg-[#0A0A0A]/80 backdrop-blur-sm hover:border-zinc-700 transition-colors duration-300">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm mb-6 flex-shrink-0"
                                    style={{ background: `${step.color}20`, color: step.color }}
                                >
                                    {step.number}
                                </div>
                                <h3 className="text-white text-xl font-bold mb-3 leading-tight">{step.title}</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed mb-6 flex-1">{step.description}</p>
                                <div className="flex flex-col gap-2">
                                    {step.detail.map((d) => (
                                        <div key={d} className="flex items-center gap-2 text-xs text-zinc-400">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            {d}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
