'use client';

import { useState } from 'react';
import { approveBusinessConcept, regenerateBusinessConcept, requestBusinessConceptChanges } from '~/lib/actions/workspaces';

interface NewBusinessConceptPanelProps {
  workspaceId: string;
  status: string;
  concept: unknown;
}

function asText(value: unknown) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(', ');
  return typeof value === 'string' ? value : '';
}

export function NewBusinessConceptPanel({ workspaceId, status, concept }: NewBusinessConceptPanelProps) {
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const data = concept && typeof concept === 'object' ? concept as Record<string, unknown> : {};

  const run = async (action: () => Promise<boolean>) => {
    setBusy(true);
    try {
      await action();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  if (status === 'pending_research' || status === 'researching') {
    return <div className="fixed inset-x-6 top-6 z-40 mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-[#353538] dark:bg-[#1C1D21]"><div className="flex items-center gap-3"><div className="h-3 w-3 animate-pulse rounded-full bg-[#0099ff]" /><div><h2 className="font-semibold text-gray-900 dark:text-white">Researching your SaaS opportunity</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Falbor is collecting evidence and preparing a proposal. You can leave this page; the research runs in the background.</p></div></div></div>;
  }

  if (status === 'research_failed') {
    return <div className="fixed inset-x-6 top-6 z-40 mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6 shadow-xl dark:border-red-900/50 dark:bg-[#1C1D21]"><h2 className="font-semibold text-gray-900 dark:text-white">Research could not be completed</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Retry the research when the provider or network is available.</p><button type="button" disabled={busy} onClick={() => run(() => regenerateBusinessConcept(workspaceId))} className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">{busy ? 'Retrying...' : 'Retry research'}</button></div>;
  }

  if (status !== 'awaiting_approval') return null;

  return <div className="fixed inset-x-6 top-6 z-40 mx-auto max-h-[calc(100vh-3rem)] max-w-4xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-[#353538] dark:bg-[#1C1D21]">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-wide text-[#0099ff]">Research proposal</p><h2 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">Review your SaaS concept</h2><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">This proposal is based on collected evidence. Approve it to use it as the workspace strategy, request changes, or generate another direction.</p></div></div>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {([['Concept', data.concept], ['Audience', data.audience], ['Value proposition', data.valueProposition], ['Monetization', data.monetization], ['MVP', data.mvp], ['Channels', data.channels]] as [string, unknown][]).map(([label, value]) => <div key={label} className="rounded-xl border border-gray-200 p-4 dark:border-[#353538]"><p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800 dark:text-gray-200">{asText(value) || 'Not established from available evidence.'}</p></div>)}
    </div>
    <div className="mt-4 rounded-xl border border-gray-200 p-4 dark:border-[#353538]"><p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Evidence and competitors</p><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-gray-700 dark:text-gray-300">{JSON.stringify({ evidence: data.evidence, competitors: data.competitors, risks: data.risks, unknowns: data.unknowns }, null, 2)}</pre></div>
    <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Optional change request" className="mt-4 min-h-20 w-full resize-y rounded-xl border border-gray-200 bg-transparent p-3 text-sm text-gray-900 outline-none focus:border-[#0099ff] dark:border-[#353538] dark:text-white" />
    <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={busy || !feedback.trim()} onClick={() => run(() => requestBusinessConceptChanges(workspaceId, feedback))} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 disabled:opacity-50 dark:border-[#353538] dark:text-gray-300">{busy ? 'Working...' : 'Request changes'}</button><button type="button" disabled={busy} onClick={() => run(() => regenerateBusinessConcept(workspaceId))} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 disabled:opacity-50 dark:border-[#353538] dark:text-gray-300">Generate another</button><button type="button" disabled={busy} onClick={() => run(() => approveBusinessConcept(workspaceId))} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black">Approve concept</button></div>
  </div>;
}
