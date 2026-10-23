'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { StatusPill, type StatusTone } from './StatusPill';
import { AgentConfigDialog } from './AgentConfigDialog';
import { formatRelativeTime } from './format';
import {
  pauseAgent,
  resumeAgent,
  startAgent,
  stopAgent,
} from '~/lib/actions/automation/agent';
import type { AgentConfig } from '~/lib/automation/agentCore';
import type { AutomationStatusSummary } from '~/lib/automation/types';
import { ACTION_TIMEOUT_MS, TIMEOUT_MESSAGE, withTimeout } from './withTimeout';

const PRIMARY_BUTTON =
  'flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0099FF] hover:bg-[#0084DE] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON =
  'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm transition-colors disabled:opacity-50';
const DANGER_BUTTON =
  'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm transition-colors disabled:opacity-50';

const STEP_LABELS: Record<string, string> = {
  feed: 'Scanning a listing',
  inspect: 'Inspecting a discussion',
  analyzed: 'Analyzing relevance',
  draft_created: 'Draft created',
  paused: 'Paused',
  stopped: 'Stopped',
};

function agentStatusTone(status: NonNullable<AutomationStatusSummary['agent']>['status']): StatusTone {
  switch (status) {
    case 'running':
      return 'good';
    case 'paused':
      return 'warn';
    case 'stopping':
      return 'info';
    case 'completed':
      return 'good';
    case 'error':
      return 'bad';
    default:
      return 'neutral';
  }
}

function agentStatusLabel(status: NonNullable<AutomationStatusSummary['agent']>['status']): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'paused':
      return 'Paused';
    case 'stopping':
      return 'Stopping';
    case 'stopped':
      return 'Stopped';
    case 'completed':
      return 'Completed';
    case 'error':
      return 'Error';
    default:
      return 'Not started';
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0d0d10] px-3 py-2">
      <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{value}</div>
    </div>
  );
}

export function AgentControlCard({
  workspaceId,
  status,
  onChanged,
}: {
  workspaceId: string;
  status: AutomationStatusSummary;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedConfig, setSavedConfig] = useState<AgentConfig | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const config = savedConfig ?? status.agentConfig;
  const agent = status.agent;
  const sessionStatus = agent?.status ?? null;
  const extensionConnected = status.extension.state === 'connected';
  const idle = !sessionStatus || sessionStatus === 'stopped' || sessionStatus === 'completed' || sessionStatus === 'error';

  const runAction = async (action: 'start' | 'resume' | 'pause' | 'stop') => {
    setBusy(action);
    setError(null);
    try {
      const call =
        action === 'start'
          ? startAgent(workspaceId)
          : action === 'resume'
            ? resumeAgent(workspaceId)
            : action === 'pause'
              ? pauseAgent(workspaceId)
              : stopAgent(workspaceId);
      await withTimeout(call, ACTION_TIMEOUT_MS, TIMEOUT_MESSAGE);
      toast.success(`Agent ${action === 'stop' ? 'stop requested' : action + 'ed'}.`);
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${action} the agent.`;
      setError(message);
      toast.error(message);
      if (/subreddit/i.test(message)) setConfigOpen(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI agent</h3>
            <StatusPill
              label={sessionStatus ? agentStatusLabel(sessionStatus) : 'Not started'}
              tone={sessionStatus ? agentStatusTone(sessionStatus) : 'neutral'}
            />
            {agent?.stopRequested && sessionStatus !== 'stopping' && <StatusPill label="Stop requested" tone="warn" />}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {agent
              ? agent.currentActivity ||
                (agent.currentStep ? STEP_LABELS[agent.currentStep] || agent.currentStep : 'Working in your Reddit tab.')
              : 'Runs in your logged-in Reddit tab: scans the subreddits you choose, analyzes discussions and prepares reply drafts for approval.'}
          </p>
        </div>
        <button type="button" onClick={() => setConfigOpen(true)} disabled={busy !== null} className={SECONDARY_BUTTON}>
          <i className="i-ph:sliders-horizontal" />
          Configure
        </button>
      </div>

      {agent && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Stat label="Inspected" value={String(agent.counters.inspected)} />
          <Stat label="Analyzed" value={String(agent.counters.analyzed)} />
          <Stat label="Drafts" value={String(agent.counters.draftsCreated)} />
          <Stat label="Skipped" value={String(agent.counters.skipped)} />
          <Stat label="AI calls" value={String(agent.counters.aiCalls)} />
          <Stat label="Est. cost" value={`$${agent.counters.estimatedCostUsd.toFixed(2)}`} />
        </div>
      )}

      {agent && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Started {formatRelativeTime(agent.startedAt)}. Limits are enforced by Falbor on every step.
        </p>
      )}

      {(agent?.lastError || error) && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle shrink-0 mt-0.5" />
          <span className="break-words">{error || agent?.lastError}</span>
          {error && (
            <button className="ml-auto text-xs font-semibold hover:underline shrink-0" onClick={() => setError(null)}>
              Dismiss
            </button>
          )}
        </div>
      )}

      {!extensionConnected && (
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle shrink-0 mt-0.5" />
          <span>The browser extension must be connected before the agent can run in your Reddit tab.</span>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {idle && (
          <button
            type="button"
            onClick={() => void runAction('start')}
            disabled={busy !== null || !extensionConnected}
            title={!extensionConnected ? 'Connect the browser extension first.' : undefined}
            className={PRIMARY_BUTTON}
          >
            {busy === 'start' ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:play" />}
            Start agent
          </button>
        )}
        {sessionStatus === 'running' && (
          <button type="button" onClick={() => void runAction('pause')} disabled={busy !== null} className={SECONDARY_BUTTON}>
            {busy === 'pause' ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:pause" />}
            Pause
          </button>
        )}
        {sessionStatus === 'paused' && (
          <button
            type="button"
            onClick={() => void runAction('resume')}
            disabled={busy !== null || !extensionConnected}
            className={PRIMARY_BUTTON}
          >
            {busy === 'resume' ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:play" />}
            Resume
          </button>
        )}
        {(sessionStatus === 'running' || sessionStatus === 'paused' || sessionStatus === 'stopping') && (
          <button
            type="button"
            onClick={() => void runAction('stop')}
            disabled={busy !== null || sessionStatus === 'stopping'}
            className={DANGER_BUTTON}
          >
            {busy === 'stop' ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:stop" />}
            {sessionStatus === 'stopping' ? 'Stopping...' : 'Stop'}
          </button>
        )}
      </div>

      {idle && extensionConnected && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          After you press Start, the extension attaches to your Reddit tab within a minute. To start immediately,
          press Start agent in the extension popup or reload reddit.com.
        </p>
      )}

      <p className="text-[11px] text-gray-400 dark:text-gray-500">
        Automatic posting is disabled: Reddit&apos;s policies do not currently authorize automated comments. The
        agent only reads Reddit and prepares drafts — you review and publish every comment yourself.
      </p>

      {configOpen && (
        <AgentConfigDialog
          workspaceId={workspaceId}
          open={configOpen}
          onOpenChange={setConfigOpen}
          config={config}
          onSaved={setSavedConfig}
        />
      )}
    </section>
  );
}
