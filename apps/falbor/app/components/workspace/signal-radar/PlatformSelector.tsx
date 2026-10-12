'use client';
import React from 'react';
import { classNames } from '~/utils/classNames';

export type Platform = {
    id: string;
    name: string;
    icon: string;
};

export const PLATFORMS: Platform[] = [
    { id: 'Reddit', name: 'Reddit', icon: 'i-ph:reddit-logo' },
    { id: 'LinkedIn', name: 'LinkedIn', icon: 'i-ph:linkedin-logo' },
    { id: 'Twitter', name: 'Twitter / X', icon: 'i-ph:x-logo' },
    { id: 'Google', name: 'Google', icon: 'i-ph:google-logo' },
    { id: 'IndieHackers', name: 'Indie Hackers', icon: 'i-ph:globe' },
    { id: 'HackerNews', name: 'Hacker News', icon: 'i-ph:newspaper' },
    { id: 'Facebook', name: 'Facebook Groups', icon: 'i-ph:facebook-logo' },
    { id: 'Discord', name: 'Discord', icon: 'i-ph:discord-logo' },
];

interface PlatformSelectorProps {
    selected: string[];
    onToggle: (id: string) => void;
    onContinue: () => void;
    title?: string;
    description?: string;
    buttonText?: string;
}

export function PlatformSelector({
    selected,
    onToggle,
    onContinue,
    title = 'Signal Radar',
    description = 'Select at least 3 platforms for the AI to scan. It will surface real conversations where people describe the exact problem your product solves.',
    buttonText = 'Scan for Signals →',
}: PlatformSelectorProps) {
    const canContinue = selected.length >= 3;

    return (
        <div className="flex-1 flex flex-col items-center justify-center h-full px-6">
            <div className="w-full max-w-2xl">
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold text-falbor-elements-textPrimary">{title}</h2>
                    <p className="text-sm text-falbor-elements-textSecondary mt-2 max-w-md mx-auto">
                        {description}
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    {PLATFORMS.map((platform) => {
                        const isSelected = selected.includes(platform.id);
                        return (
                            <button
                                key={platform.id}
                                onClick={() => onToggle(platform.id)}
                                className={classNames(
                                    'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-150 cursor-pointer select-none',
                                    isSelected
                                        ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/40'
                                        : 'border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 hover:border-falbor-elements-borderActive'
                                )}
                            >
                                <div className={classNames('w-6 h-6', platform.icon)} />
                                <span className="text-xs font-medium text-falbor-elements-textPrimary text-center leading-tight">
                                    {platform.name}
                                </span>
                                {isSelected && (
                                    <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                                        <div className="i-ph:check text-white w-2.5 h-2.5" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-falbor-elements-textSecondary">
                        {selected.length} / {PLATFORMS.length} selected
                        {selected.length < 3 && ` (${3 - selected.length} more required)`}
                    </span>
                    <button
                        disabled={!canContinue}
                        onClick={onContinue}
                        className={classNames(
                            'px-6 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                            canContinue
                                ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        )}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
}
