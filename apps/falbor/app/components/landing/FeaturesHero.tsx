"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getUserCount } from "~/lib/actions/get-user-count";
import { TrendingUp, TrendingDown, Database, Link2 } from "lucide-react";
import { Tooltip } from "~/components/ui/Tooltip";
import { TabsWithSlider } from "~/components/ui/TabsWithSlider";

export default function FeaturesHero() {
    const router = useRouter();
    const [userCount, setUserCount] = React.useState<number | null>(null);

    React.useEffect(() => {
        getUserCount().then(setUserCount);
    }, []);

    const landingTabs = [
        { id: "business", label: "For Businesses" },
        { id: "marketers", label: "For Marketers" },
    ];

    const handleTabChange = (tabId: string) => {
        if (tabId === "marketers") {
            router.push("/marketers");
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-white pb-12 transition-colors duration-200 dark:bg-black md:pb-20">
            <div
                aria-hidden="true"
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat dark:hidden"
                style={{
                    backgroundImage: "url('/background/bg__.png')",
                }}
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 z-0 hidden bg-cover bg-center bg-no-repeat dark:block"
                style={{
                    backgroundImage: "url('/background/bg__dark.png')",
                }}
            />
            <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-6 pt-32 text-center md:px-6 md:pt-44">
                <h1
                    className="w-full text-2xl leading-normal text-zinc-900 sm:text-4xl md:text-5xl lg:text-6xl dark:text-white"
                    style={{ textShadow: "0 0 80px rgba(255,88,0,0.2)" }}
                >
                    <span className="block whitespace-nowrap sm:whitespace-normal">
                        Come to the world where grow
                    </span>
                    <span
                        className="block pb-3 py-1"
                        style={{
                            background:
                                "linear-gradient(90deg, #0099ff 0%, #0099ff 60%, currentColor 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        your business is the easiest part.
                    </span>
                </h1>

                <div className="relative mt-32 md:mt-44 w-full max-w-4xl py-12">
                    <div className="relative flex flex-col items-center justify-between gap-10 md:flex-row md:gap-0">
                        <div className="z-10 flex flex-col gap-6 md:w-1/3 md:items-start">
                            <Tooltip content="Connect GitHub repositories and codebase" side="top">
                                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur transition-transform hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900/90">
                                    <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">code</span>
                                </div>
                            </Tooltip>

                            <Tooltip content="Extract links and live web data" side="top">
                                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur transition-transform hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900/90">
                                    <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                                        <Link2 className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">links & data</span>
                                </div>
                            </Tooltip>

                            <Tooltip content="Connect social channels and feeds" side="top">
                                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur transition-transform hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900/90">
                                    <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-pink-500/20 text-pink-500 font-bold text-[10px]">IG</span>
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-500/20 text-zinc-800 dark:text-zinc-200 font-bold text-[10px]">TK</span>
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-500/20 text-zinc-800 dark:text-zinc-200 font-bold text-[10px]">X</span>
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/20 text-blue-600 font-bold text-[10px]">in</span>
                                    </div>
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">social</span>
                                </div>
                            </Tooltip>
                        </div>

                        <div className="relative z-10 flex items-center justify-center py-4">
                            <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-[#0099ff] p-1 shadow-2xl shadow-blue-500/30 ring-8 ring-blue-500/10 dark:ring-blue-400/20">
                                <div className="absolute inset-0 animate-ping rounded-full bg-[#0099ff] duration-1000" style={{ animationDuration: '3s' }} />
                                <div className="relative flex h-full w-full flex-col items-center justify-center rounded-full bg-white dark:bg-black text-white shadow-inner">
                                    <img src="/favicon.ico" alt="Logo" className="w-30" />
                                </div>
                            </div>
                        </div>

                        <div className="z-10 flex flex-col gap-6 md:w-1/3 md:items-end">
                            <Tooltip content="Weekly user growth" side="top">
                                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur transition-transform hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900/90">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-lg font-bold text-zinc-900 dark:text-white">+100</div>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">new users / wk</div>
                                    </div>
                                </div>
                            </Tooltip>

                            <Tooltip content="Monthly recurring revenue" side="top">
                                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur transition-transform hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900/90">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-lg font-bold text-zinc-900 dark:text-white">$48k</div>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">monthly revenue</div>
                                    </div>
                                </div>
                            </Tooltip>

                            <Tooltip content="Import and sync data sources" side="top">
                                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur transition-transform hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900/90">
                                    <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                                        <Database className="h-4 w-4 text-indigo-500" />
                                    </div>
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">get sources</span>
                                </div>
                            </Tooltip>

                            <Tooltip content="Customer churn rate" side="top">
                                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur transition-transform hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900/90">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <TrendingDown className="h-4 w-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-lg font-bold text-zinc-900 dark:text-white">6%</div>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">monthly churn</div>
                                    </div>
                                </div>
                            </Tooltip>
                        </div>

                        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 800 290" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                            <defs>
                                <style>{`
                                    @keyframes flowLineLeft {
                                        0% { stroke-dashoffset: 40; }
                                        100% { stroke-dashoffset: 0; }
                                    }
                                    @keyframes flowLineRight {
                                        0% { stroke-dashoffset: 0; }
                                        100% { stroke-dashoffset: -40; }
                                    }
                                    .animated-path-left {
                                        stroke-dasharray: 6 6;
                                        animation: flowLineLeft 1.5s linear infinite;
                                    }
                                    .animated-path-right {
                                        stroke-dasharray: 6 6;
                                        animation: flowLineRight 1.5s linear infinite;
                                    }
                                `}</style>
                                <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.8" />
                                </linearGradient>
                                <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#34D399" stopOpacity="0.4" />
                                </linearGradient>
                            </defs>

                            <path d="M 115 22 C 260 22, 280 145, 312 145" fill="none" stroke="url(#purpleGrad)" strokeWidth="2" className="animated-path-left" />
                            <path d="M 160 83 C 270 83, 290 145, 312 145" fill="none" stroke="url(#purpleGrad)" strokeWidth="2" className="animated-path-left" />
                            <path d="M 130 145 C 260 145, 290 145, 312 145" fill="none" stroke="url(#purpleGrad)" strokeWidth="2" className="animated-path-left" />
                            <path d="M 165 207 C 270 207, 290 145, 312 145" fill="none" stroke="url(#purpleGrad)" strokeWidth="2" className="animated-path-left" />
                            <path d="M 140 268 C 260 268, 290 145, 312 145" fill="none" stroke="url(#purpleGrad)" strokeWidth="2" className="animated-path-left" />

                            <path d="M 488 145 C 510 145, 540 45, 630 45" fill="none" stroke="url(#greenGrad)" strokeWidth="2" className="animated-path-right" />
                            <path d="M 488 145 C 510 145, 540 145, 630 145" fill="none" stroke="url(#greenGrad)" strokeWidth="2" className="animated-path-right" />
                            <path d="M 488 145 C 510 145, 540 245, 630 245" fill="none" stroke="url(#greenGrad)" strokeWidth="2" className="animated-path-right" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="pointer-events-none absolute bottom-0 left-0 z-20 hidden w-full dark:block">
                <img
                    src="/landing/divider-bar.svg"
                    alt="Divider"
                    className="h-auto w-full object-cover invert transition-all duration-200 dark:invert-0"
                />
            </div>
        </div>
    );
}
