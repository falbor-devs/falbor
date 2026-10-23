'use client';
import React, { useState, useEffect } from 'react';
import { Slider } from '~/components/ui/Slider';
import { PlatformSelector } from '../signal-radar/PlatformSelector';
import { WorkspaceSignalRadarView } from '../signal-radar/WorkspaceSignalRadarView';
import { MentionsDashboard } from './MentionsDashboard';
import type { BrandMentionPost } from './types';

interface WorkspaceMentionsViewProps {
    workspaceId: string;
}

type MentionsMode = 'mentions' | 'signals';

const MODE_OPTIONS = {
    left: { value: 'mentions', text: 'Mentions', icon: 'i-ph:at' },
    right: { value: 'signals', text: 'Signals', icon: 'i-ph:broadcast' },
} as const;

const DEFAULT_PLATFORMS = ['Reddit', 'LinkedIn', 'Twitter', 'Google'];

export function WorkspaceMentionsView({ workspaceId }: WorkspaceMentionsViewProps) {
    const [mode, setMode] = useState<MentionsMode>('mentions');
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(DEFAULT_PLATFORMS);
    const [phase, setPhase] = useState<'select' | 'scan'>('select');
    const [savedPosts, setSavedPosts] = useState<BrandMentionPost[]>([]);

    useEffect(() => {
        if (workspaceId) {
            localStorage.setItem(`mentions_last_read_${workspaceId}`, new Date().toISOString());
            window.dispatchEvent(new Event('mentions_read_updated'));
        }

        fetch(`/api/agent/mentions?workspaceId=${workspaceId}`, { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                if (data.posts && data.posts.length > 0) {
                    setSavedPosts(data.posts);
                    const usedPlatforms = [...new Set<string>(data.posts.map((p: BrandMentionPost) => p.platform))];
                    if (usedPlatforms.length >= 3) {
                        setSelectedPlatforms(usedPlatforms);
                        setPhase('scan');
                    }
                }
            })
            .catch(() => {});
    }, [workspaceId]);

    const handleToggle = (id: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleReset = async () => {
        await fetch(`/api/agent/mentions?workspaceId=${workspaceId}`, { method: 'DELETE' });
        setSavedPosts([]);
        setSelectedPlatforms(DEFAULT_PLATFORMS);
        setPhase('select');
    };

    return (
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
            <div className="pt-3 shrink-0">
                <Slider<MentionsMode>
                    selected={mode}
                    options={MODE_OPTIONS}
                    setSelected={setMode}
                />
            </div>

            {mode === 'signals' ? (
                <WorkspaceSignalRadarView workspaceId={workspaceId} />
            ) : phase === 'select' ? (
                <PlatformSelector
                    selected={selectedPlatforms}
                    onToggle={handleToggle}
                    onContinue={() => setPhase('scan')}
                    title="Mentions"
                    description="Select at least 3 platforms for the AI to scan. It will surface real posts across the web explicitly mentioning your product or company."
                    buttonText="Scan for Mentions →"
                />
            ) : (
                <MentionsDashboard
                    initialPosts={savedPosts}
                    selectedPlatforms={selectedPlatforms}
                    workspaceId={workspaceId}
                    onReset={handleReset}
                />
            )}
        </div>
    );
}
