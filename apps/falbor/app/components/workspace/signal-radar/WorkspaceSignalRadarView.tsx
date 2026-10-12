'use client';
import React, { useState, useEffect } from 'react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { PlatformSelector, PLATFORMS } from './PlatformSelector';
import { SignalRadarDashboard } from './SignalRadarDashboard';
import type { SignalPost } from './types';

interface WorkspaceSignalRadarViewProps {
    workspaceId: string;
}

const DEFAULT_PLATFORMS = ['Reddit', 'LinkedIn', 'Google'];

export function WorkspaceSignalRadarView({ workspaceId }: WorkspaceSignalRadarViewProps) {
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(DEFAULT_PLATFORMS);
    const [phase, setPhase] = useState<'select' | 'scan'>('select');
    const [savedPosts, setSavedPosts] = useState<SignalPost[]>([]);

    useEffect(() => {
        fetch(`/api/agent/signal-radar?workspaceId=${workspaceId}`, { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                if (data.posts && data.posts.length > 0) {
                    setSavedPosts(data.posts);
                    const usedPlatforms = [...new Set<string>(data.posts.map((p: SignalPost) => p.platform))];
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
        await fetch(`/api/agent/signal-radar?workspaceId=${workspaceId}`, { method: 'DELETE' });
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
            />
        );
    }

    return (
        <SignalRadarDashboard
            initialPosts={savedPosts}
            selectedPlatforms={selectedPlatforms}
            workspaceId={workspaceId}
            onReset={handleReset}
        />
    );
}
