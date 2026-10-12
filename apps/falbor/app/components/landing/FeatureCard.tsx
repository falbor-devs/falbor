import React from 'react';
import Link from 'next/link';

export type StatPill = {
    text: string;
    className?: string;
};

export type SubFeature = {
    icon: React.ReactNode;
    label: string;
    desc: string;
};

export type FeatureData = {
    id: string;
    number: string;
    backgroundColor: string;
    glowColor: string;
    title: React.ReactNode;
    description: string;
    imageSrc: string;
    imageAlt: string;
    primaryCta: { text: string; href: string };

    
    badgeText?: string;
    badgePulse?: boolean;
    badgeContainerClass?: string;
    badgeDotClass?: string;
    statPills?: StatPill[];
    subFeatures?: SubFeature[];
    subFeatureIconClass?: string;
    secondaryCta?: { text: string; href: string };
    customEffect?: React.ReactNode;
};

export default function FeatureCard({ data }: { data: FeatureData }) {
    return (
        <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${data.backgroundColor}`}>
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.25] pointer-events-none"
                style={{ backgroundImage: "url('/background/bg.png')" }}
            />
            {data.customEffect}
            {}
            <div className="w-full max-w-[1400px] mx-auto px-8 md:px-16 z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                <div className="flex items-center justify-start relative w-full lg:col-span-8">
                    <div className="absolute inset-0 rounded-md blur-2xl opacity-25" style={{ background: 'white', transform: 'scale(0.95) translateY(10px)' }} />
                    <div className="relative w-full aspect-video border border-zinc-800 bg-zinc-900/50 rounded-md overflow-hidden shadow-2xl">
                        <img src={data.imageSrc} alt={data.imageAlt} className="w-full h-full object-cover" />
                    </div>
                </div>
                <div className="flex flex-col items-start justify-center lg:col-span-4">
                    {}
                    <h2 className="leading-[1.15] text-white mb-3 tracking-tight text-[2rem] md:text-[2.5rem]">
                        {data.title}
                    </h2>
                    <p className="text-zinc-400 text-base md:text-lg mb-6 leading-relaxed font-light">
                        {data.description}
                    </p>
                    {}
                    <div className="flex items-center gap-3 mt-2">
                        <Link href="/signup" className="bg-white hover:bg-zinc-200 text-black font-semibold px-8 py-4 rounded-md transition-colors flex items-center gap-2 text-base w-fit">
                            Start Building with Falbor
                            <div className="i-ph:arrow-right w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
