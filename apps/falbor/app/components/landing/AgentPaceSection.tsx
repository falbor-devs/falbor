"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function AgentPaceSection() {
    const activeUsersReal = 2;
    const websitesCreatedReal = 1;
    const mcpCountReal = 8;

    const [activeUsers, setActiveUsers] = useState(0);
    const [platformUsage, setPlatformUsage] = useState(0);
    const [mcpCount, setMcpCount] = useState(0);

    useEffect(() => {
        const duration = 2000;
        const steps = 60;
        const stepTime = duration / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            const easeOut = 1 - Math.pow(1 - progress, 3);

            setActiveUsers(Math.floor(activeUsersReal * easeOut));
            setPlatformUsage(Math.floor(websitesCreatedReal * easeOut));
            setMcpCount(Math.floor(mcpCountReal * easeOut));

            if (currentStep >= steps) {
                clearInterval(interval);
                setActiveUsers(activeUsersReal);
                setPlatformUsage(websitesCreatedReal);
                setMcpCount(mcpCountReal);
            }
        }, stepTime);

        return () => clearInterval(interval);
    }, []);

    const stats = [
        { value: `${platformUsage}`, label: "Platform usage per month", color: "#FF5800" },
        { value: `${activeUsers}`, label: "Active users", color: "#FF5800" },
        { value: `${mcpCount}`, label: "Active MCPs connected", color: "#FF5800" },
        { value: "99.9%", label: "Uptime SLA", color: "#FF5800" },
        { value: "4 min", label: "Avg build time", color: "#FF5800" },
    ];

    return (
        <div className="relative w-full min-h-[800px] flex items-start justify-start bg-white overflow-hidden pt-28 pb-72 border-t border-zinc-200">
            {}
            <div
                className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none opacity-100 h-[65%]"
                style={{
                    backgroundImage: "url('/landing/graph.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "bottom center",
                    backgroundRepeat: "no-repeat"
                }}
            />

            <div className="w-full max-w-5xl mx-auto px-12 z-20 relative">

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-3xl"
                >
                    <h2 className="text-[2.5rem] leading-[1.1] tracking-tight mb-4 font-medium">
                        <span className="text-[#1a1a1a] font-semibold">The hub for Agents.</span>{" "}
                        <span className="text-[#8c8c8c]">
                            The platform people use to earn back their time.
                        </span>
                    </h2>
                    <p className="text-zinc-400 text-base leading-relaxed max-w-xl mb-14">
                        Falbor isn't just a tool — it's the operating system for AI-native teams. Every number below
                        reflects real usage from builders who chose to stop managing infrastructure and start shipping.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-10 max-w-2xl">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.15 + i * 0.08, duration: 0.6 }}
                                className="flex flex-col relative pl-5 border-l-2"
                                style={{ borderColor: i < 2 ? '#e4e4e7' : '#e4e4e7' }}
                            >
                                <span className="text-3xl font-semibold text-[#1a1a1a] mb-1">{stat.value}</span>
                                <span className="text-[12px] text-gray-400 font-medium tracking-wide leading-snug">{stat.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
