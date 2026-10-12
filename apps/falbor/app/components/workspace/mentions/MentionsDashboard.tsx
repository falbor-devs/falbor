'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { sendAgentMessage } from '~/lib/actions/agentChat';
import { Slider } from '~/components/ui/Slider';
import { MentionPostCard } from './MentionPostCard';
import type { BrandMentionPost } from './types';

const PLATFORM_ALL = 'All';

interface MentionsDashboardProps {
    initialPosts: BrandMentionPost[];
    selectedPlatforms: string[];
    workspaceId: string;
    onReset: () => void;
}

export function MentionsDashboard({ initialPosts, selectedPlatforms, workspaceId, onReset }: MentionsDashboardProps) {
    const [posts, setPosts] = useState<BrandMentionPost[]>(initialPosts);
    const [isScanning, setIsScanning] = useState(initialPosts.length === 0);
    const [activeFilter, setActiveFilter] = useState<string>(PLATFORM_ALL);

    const sidebarEvents = useStore(aiSidebarStore.events);
    const isAgentActive = useStore(aiSidebarStore.isActive);

    useEffect(() => {
        if (isScanning && posts.length === 0) {
            const platformList = selectedPlatforms.join(', ');
            sendAgentMessage(
                `[CONTEXT: BRAND_MENTIONS] [WORKSPACE_ID: ${workspaceId}]\n` +
                `Scan the following platforms daily for online discussions explicitly mentioning our company or product name: ${platformList}.\n` +
                `Find posts, comments, reviews, and tweets that mention our exact product name. Surface what users like, dislike, or want changed.\n` +
                `Call ui_update_brand_mention_posts once with all results.`
            );
        }
    }, []);

    useEffect(() => {
        const recentEvents = [...sidebarEvents].reverse();
        for (const event of recentEvents) {
            const content = event.html || '';
            if (!content) continue;
            const match = content.match(/```mention_posts\n([\s\S]*?)\n```/);
            if (match) {
                try {
                    const parsed: BrandMentionPost[] = JSON.parse(match[1]);
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

    const uniqueKeywords = useMemo(() => {
        return [...new Set(posts.map(p => p.brandKeyword).filter(Boolean))];
    }, [posts]);

    const positiveCount = posts.filter(p => p.sentiment === 'positive').length;
    const negativeCount = posts.filter(p => p.sentiment === 'negative').length;

    return (
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
            <div className="flex items-center justify-between py-3 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-falbor-elements-textPrimary flex items-center gap-2">
                        <span className="i-ph:at w-5 h-5 text-purple-500" />
                        Brand Mentions
                    </h2>
                    <p className="text-sm text-falbor-elements-textSecondary mt-0.5">
                        Tracking daily web discussions and posts explicitly mentioning your company or product
                    </p>
                </div>
                <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-falbor-elements-textSecondary hover:bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor transition-colors"
                >
                    <span className="i-ph:arrow-counter-clockwise w-3.5 h-3.5" />
                    New Scan
                </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3 shrink-0">
                <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                    <span className="text-xs text-falbor-elements-textSecondary">Mentions Tracked</span>
                    <span className="text-2xl font-bold text-falbor-elements-textPrimary mt-0.5">{posts.length}</span>
                </div>
                <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                    <span className="text-xs text-falbor-elements-textSecondary">Platforms Scanned</span>
                    <span className="text-2xl font-bold text-falbor-elements-textPrimary mt-0.5">{Object.keys(platformCounts).length}</span>
                </div>
                <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                    <span className="text-xs text-falbor-elements-textSecondary">Positive / Negative</span>
                    <span className="text-2xl font-bold text-falbor-elements-textPrimary mt-0.5 text-emerald-500">
                        {positiveCount} <span className="text-gray-400 font-normal">/</span> <span className="text-rose-500">{negativeCount}</span>
                    </span>
                </div>
                <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                    <span className="text-xs text-falbor-elements-textSecondary">Brand Keywords</span>
                    <span className="text-2xl font-bold text-falbor-elements-textPrimary mt-0.5">{uniqueKeywords.length || 1}</span>
                </div>
            </div>

            <div className="mb-3 shrink-0">
                {(() => {
                    const filterList = [PLATFORM_ALL, ...selectedPlatforms.filter(id => platformCounts[id])];
                    if (filterList.length < 2) return null;
                    const [first, second, third, fourth, fifth] = filterList;
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

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {isScanning && posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-sm font-medium text-falbor-elements-textPrimary">Scanning web & social platforms for brand mentions...</p>
                        <p className="text-xs text-falbor-elements-textSecondary mt-1">Checking Reddit, Twitter, LinkedIn, HackerNews for explicit company references.</p>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-gray-300 dark:border-gray-800 rounded-xl">
                        <span className="i-ph:at text-3xl text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-falbor-elements-textPrimary">No brand mentions found yet</p>
                        <p className="text-xs text-falbor-elements-textSecondary mt-1">Click "New Scan" to prompt the AI agent to search social channels again.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                        {filteredPosts.map((post, idx) => (
                            <MentionPostCard key={post.id || idx} post={post} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
