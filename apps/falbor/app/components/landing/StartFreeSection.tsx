"use client";
import HeroButtons from "./HeroButtons";
import { TextShimmer } from "~/components/ui/text-shimmer";
import Link from "next/link";

const PERKS = [
    "No credit card required",
    "Cancel anytime",
    "Free MCP tools included",
    "Start with 10 free credits in your balance",
];

export default function StartFreeSection() {
    return (
        <div className="relative w-full py-32 flex items-center justify-center bg-[#FAFAFB] overflow-hidden border-t border-zinc-200">
            <div className="w-full max-w-5xl mx-auto px-12 z-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                {}
                <div className="flex flex-col items-start justify-center">
                    <h2 className="leading-[1.2] font-semibold text-[#1a1a1a] mb-6 tracking-tight">
                        <span className="text-[2.2rem] block">Start with 10 free credits</span>
                        <span className="text-[1.6rem] block">
                            <TextShimmer>in your balance — free forever.</TextShimmer>
                        </span>
                    </h2>

                    <p className="text-zinc-500 text-base leading-relaxed mb-8 max-w-sm">
                        Falbor gives every new user a starting balance to explore the full platform —
                        no commitment, no hidden fees. Upgrade when you're ready to scale.
                    </p>

                    {}
                    <ul className="flex flex-col gap-3 mb-10">
                        {PERKS.map((perk) => (
                            <li key={perk} className="flex items-center gap-2.5 text-sm text-zinc-600">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#1a1a1a] flex-shrink-0">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {perk}
                            </li>
                        ))}
                    </ul>

                    {}
                    <div className="flex items-center gap-3">
                        <Link href="/signup">
                            <button className="bg-[#1a1a1a] hover:bg-black text-white text-sm font-semibold cursor-pointer px-6 py-3 rounded-md transition-colors">
                                Start for free
                            </button>
                        </Link>
                        <Link href="/login">
                            <button className="text-sm text-zinc-500 hover:text-zinc-800 font-medium cursor-pointer transition-colors">
                                Sign in →
                            </button>
                        </Link>
                    </div>
                </div>

                {}
                <div className="flex items-center justify-end relative h-full min-h-[300px]">
                    <img
                        src="/landing/Gradient3D.png"
                        alt="Feature Graphic"
                        className="object-contain w-full max-w-[700px] opacity-90"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
