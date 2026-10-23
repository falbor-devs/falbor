'use client';

import { useEffect, useState } from 'react';
import { WorkspaceOpportunityTable } from './WorkspaceOpportunityTable';

export function WorkspaceFeatureIntelligenceView({ workspaceId }: { workspaceId: string }) {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = async () => { setLoading(true); const response = await fetch(`/api/workspace/${workspaceId}/feature-intelligence`); if (response.ok) setOpportunities((await response.json()).opportunities || []); setLoading(false); };
  useEffect(() => { load(); }, [workspaceId]);
  const research = async () => { setBusy(true); await fetch(`/api/workspace/${workspaceId}/feature-intelligence`, { method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } }); await load(); setBusy(false); };
  return <div className="h-full w-full overflow-y-auto p-6"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl text-gray-900 dark:text-white">Feature Intelligence</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Turn real product and competitor evidence into feature opportunities.</p></div><button disabled={busy} onClick={research} className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900">{busy ? 'Researching...' : 'Research features'}</button></div><div className="mb-4 rounded-xl border border-gray-200 p-4 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">Evidence is labeled by source. Missing impact, effort, and demand metrics remain Not Available.</div>{loading ? <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-900" /> : <WorkspaceOpportunityTable mode="feature" opportunities={opportunities} />}</div>;
}
