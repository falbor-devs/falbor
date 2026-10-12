'use client';

import React, { useEffect, useState } from 'react';
import type { AiAeoData, EngineItem } from './types';
import { AiAeoHeader } from './AiAeoHeader';
import { AiAeoWeeklyTrend } from './AiAeoWeeklyTrend';
import { AiAeoEngineCard } from './AiAeoEngineCard';
import { AiAeoInspectionModal } from './AiAeoInspectionModal';

export function WorkspaceAiAeoView({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<AiAeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedEngine, setSelectedEngine] = useState<EngineItem | null>(null);

  useEffect(() => {
    async function loadAeo() {
      try {
        setLoading(true);
        const res = await fetch(`/api/workspace/${workspaceId}/ai-aeo`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load AI AEO data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAeo();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="w-full h-full p-6 animate-pulse flex flex-col gap-6">
        <div className="h-10 w-64 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-72 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-48 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const engines = data?.engines || [];

  return (
    <div className="w-full h-full p-6 overflow-y-auto flex flex-col gap-6">
      <AiAeoHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />

      <AiAeoWeeklyTrend data={data} />

      <div className="flex flex-col gap-4 mt-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="i-ph:question-duotone" />
          Does AI know you?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {engines.map((eng, idx) => (
            <AiAeoEngineCard key={idx} engine={eng} onSelect={setSelectedEngine} />
          ))}
        </div>
      </div>

      <AiAeoInspectionModal engine={selectedEngine} onClose={() => setSelectedEngine(null)} />
    </div>
  );
}
