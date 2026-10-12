"use client";

import { useState } from "react";
import { TextShimmer } from "../ui/text-shimmer";

type Step = {
    type: "thinking" | "searching" | "fixing";
    title: string;
    text: string;
};

export function ErrorPreview() {
    const [showMore, setShowMore] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const [isFixed, setIsFixed] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);

    const handleFix = async () => {
        if (isFixing || isFixed) return;

        setIsFixing(true);
        setIsFixed(false);
        setSteps([]);

        await new Promise((resolve) => setTimeout(resolve, 350));

        setSteps((prev) => [
            ...prev,
            {
                type: "thinking",
                title: "Thinking",
                text: "I found a type mismatch on line 2. I'm checking how this value is being used before applying the fix.",
            },
        ]);

        await new Promise((resolve) => setTimeout(resolve, 900));

        setSteps((prev) => [
            ...prev,
            {
                type: "searching",
                title: "Searching",
                text: "Found the issue. The variable expects a number, but the current value is a string.",
            },
        ]);

        await new Promise((resolve) => setTimeout(resolve, 850));

        setSteps((prev) => [
            ...prev,
            {
                type: "fixing",
                title: "Fixing",
                text: "Updating the value to use the correct number type.",
            },
        ]);

        await new Promise((resolve) => setTimeout(resolve, 950));

        setIsFixing(false);
        setIsFixed(true);
    };

    return (
        <div className="relative w-full">
            {(isFixing || isFixed) && (
                <div className="relative z-20 mb-3 overflow-hidden rounded-lg border bg-white px-4 py-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                            <img
                                src="/favicon.ico"
                                alt=""
                                className="h-full w-full"
                            />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="mb-3 text-xs font-medium text-gray-500">
                                Falbor
                            </div>

                            <div className="space-y-0">
                                {steps.map((step, index) => (
                                    <div
                                        key={`${step.type}-${index}`}
                                        className="relative animate-in fade-in slide-in-from-bottom-1 duration-300"
                                    >
                                        {index < steps.length - 1 && (
                                            <div className="absolute left-[7px] top-6 h-[calc(100%-10px)] w-px bg-gray-200" />
                                        )}

                                        <div className="relative flex gap-3">
                                            <div className="relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white">
                                                {step.type === "thinking" && (
                                                    <div className="i-ph:sparkle h-4 w-4 text-gray-500" />
                                                )}

                                                {step.type === "searching" && (
                                                    <div className="i-ph:magnifying-glass h-4 w-4 text-gray-500" />
                                                )}

                                                {step.type === "fixing" && (
                                                    <div className="i-ph:wrench h-4 w-4 text-gray-500" />
                                                )}
                                            </div>

                                            <div className="pb-5">
                                                <div className="text-sm font-medium text-gray-800">
                                                    {step.title}
                                                </div>

                                                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                                                    {step.text}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {isFixed && (
                                    <div className="relative animate-in fade-in slide-in-from-bottom-1 duration-300">
                                        <div className="flex gap-3">
                                            <div className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white">
                                                <div className="i-ph:check-circle-fill h-4 w-4 text-gray-500" />
                                            </div>

                                            <div>
                                                <div className="text-sm font-medium text-gray-800">
                                                    Fixed
                                                </div>

                                                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                                                    No additional errors found.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isFixing && (
                                    <div className="flex items-center gap-3">
                                        <div className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white">
                                            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" />
                                        </div>

                                        <TextShimmer className="text-sm">
                                            Working on it...
                                        </TextShimmer>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-10 rounded-lg border bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <span className="block">
                            {isFixed
                                ? "Error fixed successfully"
                                : "You have error in line 2"}
                        </span>

                        {!isFixed && showMore && (
                            <span className="mt-1 block text-sm">
                                Type 'string' is not assignable to type 'number'.
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleFix}
                        disabled={isFixing || isFixed}
                        className="flex min-w-[55px] items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1 text-gray-800 hover:bg-gray-50 disabled:cursor-default disabled:opacity-70"
                    >
                        {isFixing ? (
                            <div className="i-ph:spinner-gap h-4 w-4 animate-spin" />
                        ) : isFixed ? (
                            "Fixed"
                        ) : (
                            "Fix"
                        )}
                    </button>
                </div>
            </div>

            <div
                className={`relative z-0 -mt-6 w-full rounded-b-lg px-4 pb-2 pt-7 transition-colors duration-500 ${isFixed
                        ? "bg-green-50/60 text-green-700"
                        : "bg-red-100 text-red-400"
                    }`}
            >
                {isFixed ? (
                    <div className="flex items-center gap-2 text-sm">
                        <div className="i-ph:check h-4 w-4" />
                        <span>No additional errors.</span>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowMore((prev) => !prev)}
                        className="text-sm text-black underline hover:no-underline"
                    >
                        {showMore ? "Show less..." : "More..."}
                    </button>
                )}
            </div>
        </div>
    );
}