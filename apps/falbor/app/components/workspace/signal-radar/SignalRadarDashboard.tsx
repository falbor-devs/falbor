'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { sendAgentMessage } from '~/lib/actions/agentChat';
import { classNames } from '~/utils/classNames';
import { Slider } from '~/components/ui/Slider';
import { SignalPostCard } from './SignalPostCard';
import type { SignalPost } from './types';

const PLATFORM_ALL = 'All';

interface SignalRadarDashboardProps {
    initialPosts: SignalPost[];
    selectedPlatforms: string[];
    workspaceId: string;
    onReset: () => void;
}

export function SignalRadarDashboard({ initialPosts, selectedPlatforms, workspaceId, onReset }: SignalRadarDashboardProps) {
    const [posts, setPosts] = useState<SignalPost[]>(initialPosts);
    const [isScanning, setIsScanning] = useState(initialPosts.length === 0);
    const [activeFilter, setActiveFilter] = useState<string>(PLATFORM_ALL);

    const sidebarEvents = useStore(aiSidebarStore.events);
    const isAgentActive = useStore(aiSidebarStore.isActive);

    useEffect(() => {
        if (isScanning && posts.length === 0) {
            const platformList = selectedPlatforms.join(', ');
            sendAgentMessage(
                `[CONTEXT: SIGNAL_RADAR] [WORKSPACE_ID: ${workspaceId}]\n` +
                `Scan the following platforms for community posts where people discuss having the problem our product solves: ${platformList}.\n` +
                `Call ui_update_signal_posts once with all results.`
            );
        }
    }, []);

    useEffect(() => {
        const recentEvents = [...sidebarEvents].reverse();
        for (const event of recentEvents) {
            const content = event.html || '';
            if (!content) continue;
            const match = content.match(/```signal_posts\n([\s\S]*?)\n```/);
            if (match) {
                try {
                    const parsed: SignalPost[] = JSON.parse(match[1]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setPosts(parsed);
                        setIsScanning(false);
                        break;
                    }
                } catch { }
            }
        }
    }, [sidebarEvents]);

    useEffect(() => {
        if (!isAgentActive && isScanning) {
            setIsScanning(false);
        }
    }, [isAgentActive]);

    const filteredPosts = useMemo(() => {
        if (activeFilter === PLATFORM_ALL) return posts;
        return posts.filter(p => p.platform === activeFilter);
    }, [posts, activeFilter]);

    const platformCounts = useMemo(() => {
        const map: Record<string, number> = {};
        for (const p of posts) {
            map[p.platform] = (map[p.platform] || 0) + 1;
        }
        return map;
    }, [posts]);

    const avgRelevance = posts.length > 0
        ? Math.round(posts.reduce((s, p) => s + p.relevanceScore, 0) / posts.length)
        : 0;

    return (
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
            <div className="flex items-center justify-between py-3 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-falbor-elements-textPrimary flex items-center gap-2">
                        <span className="i-ph:broadcast w-5 h-5" />
                        Signal Radar
                    </h2>
                    <p className="text-sm text-falbor-elements-textSecondary mt-0.5">
                        Real conversations about your product's problem, found across the web
                    </p>
                </div>
                <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-falbor-elements-textSecondary hover:bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor transition-colors"
                >
                    <span className="i-ph:arrow-counter-clockwise w-3.5 h-3.5" />
                    New scan
                </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3 shrink-0">
                <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                    <span className="text-xs text-falbor-elements-textSecondary">Signals Found</span>
                    <span className="text-2xl text-falbor-elements-textPrimary mt-0.5">{posts.length}</span>
                </div>
                <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                    <span className="text-xs text-falbor-elements-textSecondary">Platforms</span>
                    <span className="text-2xl text-falbor-elements-textPrimary mt-0.5">{Object.keys(platformCounts).length}</span>
                </div>
                <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                    <span className="text-xs text-falbor-elements-textSecondary">Avg. Relevance</span>
                    <span className="text-2xl text-falbor-elements-textPrimary mt-0.5">{avgRelevance}%</span>
                </div>
                <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                    <span className="text-xs text-falbor-elements-textSecondary">High Match</span>
                    <span className="text-2xl text-falbor-elements-textPrimary mt-0.5">{posts.filter(p => p.relevanceScore >= 80).length}</span>
                </div>
            </div>

            <div className="mb-3 shrink-0">
                {(() => {
                    const filterList = [PLATFORM_ALL, ...selectedPlatforms.filter(id => platformCounts[id])];
                    if (filterList.length < 2) return null;
                    const [first, second, third, fourth, fifth, ...rest] = filterList;
                    const makeOption = (val: string) => ({
                        value: val,
                        text: val === PLATFORM_ALL ? `All (${posts.length})` : `${val}${platformCounts[val] ? ` (${platformCounts[val]})` : ''}`,
                    });
                    const options: any = { left: makeOption(first) };
                    if (second) options.middle = makeOption(second);
                    if (third) options.right = makeOption(third);
                    else options.right = makeOption(second ?? first);
                    if (fourth) options.extra = makeOption(fourth);
                    if (fifth) options.extra2 = makeOption(fifth);
                    return (
                        <Slider<string>
                            selected={activeFilter}
                            options={options}
                            setSelected={setActiveFilter}
                        />
                    );
                })()}
            </div>

            <div className="flex-1 overflow-auto">
                {isScanning ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4">
                        <div className="i-ph:spinner-gap animate-spin w-8 h-8 text-purple-500" />
                        <p className="text-sm text-falbor-elements-textSecondary">
                            AI is scanning {selectedPlatforms.join(', ')} for relevant conversations…
                        </p>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <div className="i-ph:broadcast-slash w-10 h-10 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-falbor-elements-textSecondary">No signals found for this filter.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-6">
                        {filteredPosts.map((post, i) => (
                            <SignalPostCard key={post.id || i} post={post} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
