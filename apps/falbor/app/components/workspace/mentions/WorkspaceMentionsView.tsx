'use client';
import React, { useState, useEffect } from 'react';
import { PlatformSelector } from '../signal-radar/PlatformSelector';
import { MentionsDashboard } from './MentionsDashboard';
import type { BrandMentionPost } from './types';

interface WorkspaceMentionsViewProps {
    workspaceId: string;
}

const DEFAULT_PLATFORMS = ['Reddit', 'LinkedIn', 'Twitter', 'Google'];

export function WorkspaceMentionsView({ workspaceId }: WorkspaceMentionsViewProps) {
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

    if (phase === 'select') {
        return (
            <PlatformSelector
                selected={selectedPlatforms}
                onToggle={handleToggle}
                onContinue={() => setPhase('scan')}
                title="Mentions Radar"
                description="Select at least 3 platforms for the AI to scan. It will surface real posts across the web explicitly mentioning your product or company."
                buttonText="Scan for Mentions →"
            />
        );
    }

    return (
        <MentionsDashboard
            initialPosts={savedPosts}
            selectedPlatforms={selectedPlatforms}
            workspaceId={workspaceId}
            onReset={handleReset}
        />
    );
}
