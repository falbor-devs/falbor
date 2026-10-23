"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    type LucideIcon,
} from "lucide-react";

import { Tooltip } from "~/components/ui/Tooltip";

const GITHUB_REPO_URL = "https://github.com/falbor-devs/falbor";

type Feature = {
    id: string;
    title: string;
    description: string;
    tooltip: string;
    icon: LucideIcon;
};

const leftFeatures: Feature[] = [
    {
        id: "connect-saas",
        title: "Connect your SaaS",
        description: "Connect your product and let Falbor analyze it.",
        tooltip: "Connect your SaaS and get started",
        icon: TrendingUp,
    },
    {
        id: "connect-social",
        title: "Connect your social accounts",
        description: "Connect your social channels and feeds.",
        tooltip: "Connect your social accounts",
        icon: TrendingUp,
    },
];

const rightFeatures: Feature[] = [
    {
        id: "ai-agents",
        title: "AI Agents",
        description: "Analyze your SaaS and extract key insights.",
        tooltip: "AI-powered product analysis",
        icon: TrendingUp,
    },
    {
        id: "sources",
        title: "Sources",
        description: "Competitors, promotion channels, and more.",
        tooltip: "Discover marketing opportunities",
        icon: TrendingUp,
    },
    {
        id: "ad-campaigns",
        title: "Manage Your Ad Campaigns",
        description: "Connect your Meta account and create campaigns with AI.",
        tooltip: "Create and manage Meta ad campaigns",
        icon: TrendingDown,
    },
];

type Point = {
    x: number;
    y: number;
};

type Connection = {
    id: string;
    start: Point;
    end: Point;
    side: "left" | "right";
};

function FeatureCard({
    feature,
    cardRef,
}: {
    feature: Feature;
    cardRef: (node: HTMLDivElement | null) => void;
}) {
    const Icon = feature.icon;

    return (
        <Tooltip content={feature.tooltip} side="top">
            <div
                ref={cardRef}
                data-feature-id={feature.id}
                className="relative z-10 flex w-fit max-w-full items-center gap-3 rounded-md border border-zinc-300 bg-white/90 px-4 py-3 backdrop-blur-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/90 dark:hover:bg-zinc-800"
            >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 text-left">
                    <div className="text-base font-semibold text-zinc-900 dark:text-white">
                        {feature.title}
                    </div>

                    <div className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {feature.description}
                    </div>
                </div>
            </div>
        </Tooltip>
    );
}

function ConnectionLines({
    connections,
}: {
    connections: Connection[];
}) {
    return (
        <svg
            className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full overflow-visible md:block"
            aria-hidden="true"
        >
            <defs>
                <linearGradient
                    id="connectionBlueLeft"
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                >
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.85" />
                </linearGradient>

                <linearGradient
                    id="connectionBlueRight"
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                >
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.35" />
                </linearGradient>
            </defs>

            {connections.map((connection) => {
                const { start, end, side, id } = connection;

                const distance = Math.abs(end.x - start.x);
                const curve = Math.max(25, distance * 0.45);

                const control1X =
                    side === "left"
                        ? start.x + curve
                        : start.x + curve;

                const control2X =
                    side === "left"
                        ? end.x - curve
                        : end.x - curve;

                const path = [
                    `M ${start.x} ${start.y}`,
                    `C ${control1X} ${start.y},`,
                    `${control2X} ${end.y},`,
                    `${end.x} ${end.y}`,
                ].join(" ");

                return (
                    <path
                        key={id}
                        d={path}
                        fill="none"
                        stroke={
                            side === "left"
                                ? "url(#connectionBlueLeft)"
                                : "url(#connectionBlueRight)"
                        }
                        strokeWidth="1.8"
                        strokeLinecap="round"
                    />
                );
            })}
        </svg>
    );
}

export default function FeaturesHero() {
    const router = useRouter();

    const diagramRef = React.useRef<HTMLDivElement>(null);
    const centerRef = React.useRef<HTMLDivElement>(null);

    const leftCardRefs = React.useRef(
        new Map<string, HTMLDivElement>(),
    );

    const rightCardRefs = React.useRef(
        new Map<string, HTMLDivElement>(),
    );

    const [connections, setConnections] = React.useState<Connection[]>([]);

    const setCardRef = React.useCallback(
        (
            side: "left" | "right",
            id: string,
            node: HTMLDivElement | null,
        ) => {
            const refs =
                side === "left"
                    ? leftCardRefs.current
                    : rightCardRefs.current;

            if (node) {
                refs.set(id, node);
            } else {
                refs.delete(id);
            }
        },
        [],
    );

    React.useLayoutEffect(() => {
        const diagram = diagramRef.current;
        const center = centerRef.current;

        if (!diagram || !center) return;

        let animationFrame = 0;

        const updateConnections = () => {
            cancelAnimationFrame(animationFrame);

            animationFrame = requestAnimationFrame(() => {
                const diagramRect = diagram.getBoundingClientRect();
                const centerRect = center.getBoundingClientRect();

                if (!diagramRect.width || !diagramRect.height) return;

                const centerPoint: Point = {
                    x: centerRect.left + centerRect.width / 2 - diagramRect.left,
                    y: centerRect.top + centerRect.height / 2 - diagramRect.top,
                };

                const nextConnections: Connection[] = [];

                const addConnections = (
                    features: Feature[],
                    refs: Map<string, HTMLDivElement>,
                    side: "left" | "right",
                ) => {
                    features.forEach((feature) => {
                        const card = refs.get(feature.id);

                        if (!card) return;

                        const rect = card.getBoundingClientRect();

                        const cardCenterY =
                            rect.top + rect.height / 2 - diagramRect.top;

                        const start: Point =
                            side === "left"
                                ? {
                                    x: rect.right - diagramRect.left,
                                    y: cardCenterY,
                                }
                                : {
                                    x: centerRect.right - diagramRect.left,
                                    y: centerPoint.y,
                                };

                        const end: Point =
                            side === "left"
                                ? {
                                    x: centerRect.left - diagramRect.left,
                                    y: centerPoint.y,
                                }
                                : {
                                    x: rect.left - diagramRect.left,
                                    y: cardCenterY,
                                };

                        nextConnections.push({
                            id: `${side}-${feature.id}`,
                            start,
                            end,
                            side,
                        });
                    });
                };

                addConnections(
                    leftFeatures,
                    leftCardRefs.current,
                    "left",
                );

                addConnections(
                    rightFeatures,
                    rightCardRefs.current,
                    "right",
                );

                setConnections(nextConnections);
            });
        };

        updateConnections();

        const observer = new ResizeObserver(updateConnections);

        observer.observe(diagram);
        observer.observe(center);

        leftCardRefs.current.forEach((card) => observer.observe(card));
        rightCardRefs.current.forEach((card) => observer.observe(card));

        window.addEventListener("resize", updateConnections);

        return () => {
            cancelAnimationFrame(animationFrame);
            observer.disconnect();
            window.removeEventListener("resize", updateConnections);
        };
    }, []);

    return (
        <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-white pb-12 transition-colors duration-200 dark:bg-black md:pb-20">
            {/* Background */}
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

            <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-6 pt-22 text-center md:px-6 md:pt-24">
                {/* Open-source GitHub badge */}
                <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Explore our open-source project on GitHub"
                    className="group mb-7 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-zinc-700 backdrop-blur-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4 shrink-0"
                        fill="currentColor"
                    >
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>

                    <span>Open source, built for everyone</span>

                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-white" />
                </a>

                {/* Hero heading */}
                <h1
                    className="w-full text-2xl leading-normal text-zinc-900 sm:text-4xl md:text-5xl lg:text-6xl dark:text-white"
                    style={{
                        textShadow: "0 0 80px rgba(255,88,0,0.2)",
                    }}
                >
                    <span className="block whitespace-nowrap sm:whitespace-normal">
                        The open-source platform
                    </span>

                    <span
                        className="block py-1 pb-3"
                        style={{
                            background:
                                "linear-gradient(90deg, #0099ff 0%, #0099ff 60%, currentColor 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        built to grow your SaaS.
                    </span>
                </h1>

                {/* Feature diagram */}
                <div
                    ref={diagramRef}
                    className="relative mt-20 w-full max-w-4xl py-8 md:mt-24 md:py-12"
                >
                    {/* Lines are behind the cards */}
                    <ConnectionLines connections={connections} />

                    <div className="relative grid grid-cols-1 items-center gap-10 md:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)] md:gap-4">
                        {/* Left features */}
                        <div className="relative z-10 flex flex-col items-center gap-6 md:items-start">
                            {leftFeatures.map((feature) => (
                                <FeatureCard
                                    key={feature.id}
                                    feature={feature}
                                    cardRef={(node) =>
                                        setCardRef("left", feature.id, node)
                                    }
                                />
                            ))}
                        </div>

                        {/* Center logo */}
                        <div
                            ref={centerRef}
                            className="relative z-10 flex items-center justify-center py-2"
                        >
                            <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-[#0099ff] p-1 shadow-xl shadow-blue-500/20 ring-8 ring-blue-500/10 dark:ring-blue-400/20 md:h-40 md:w-40">
                                <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-black">
                                    <img
                                        src="/favicon.ico"
                                        alt="Falbor logo"
                                        className="h-16 w-16 object-contain"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right features */}
                        <div className="relative z-10 flex flex-col items-center gap-6 md:items-end">
                            {rightFeatures.map((feature) => (
                                <FeatureCard
                                    key={feature.id}
                                    feature={feature}
                                    cardRef={(node) =>
                                        setCardRef("right", feature.id, node)
                                    }
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom divider */}
            <div className="pointer-events-none absolute bottom-0 left-0 z-20 hidden w-full dark:block">
                <img
                    src="/landing/divider-bar.svg"
                    alt=""
                    className="h-auto w-full object-cover invert transition-all duration-200 dark:invert-0"
                />
            </div>
        </section>
    );
}