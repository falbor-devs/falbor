import { and, eq, sql } from 'drizzle-orm';
import { db } from '~/lib/db';
import { automationAgentSessions, automationSettings } from '~/lib/db/schema';
import {
  extensionConnectionState,
  getLatestExtensionInstallation,
  getRedditConnection,
  redditConnectionStatus,
} from './auth';
import { normalizeAgentConfig, type AgentSessionStatus } from './agentCore';
import { recordAutomationEvent } from './events';
import type { AutomationStatusSummary, DiscoveryRunStatus } from './types';

const AGENT_STOP_ACK_TIMEOUT_MS = 45_000;

type CountRow = {
  opportunities: unknown;
  awaiting_review: unknown;
  drafts_awaiting_approval: unknown;
  approved: unknown;
  published: unknown;
  failed_publications: unknown;
  queued_tasks: unknown;
  running_tasks: unknown;
  failed_tasks: unknown;
  discovery_status: string | null;
  discovery_completed_at: string | Date | null;
  discovery_found: unknown;
  discovery_error: string | null;
  agent_session: unknown;
};

type AgentSessionJson = {
  id?: string;
  status?: string;
  current_step?: string | null;
  current_activity?: string | null;
  started_at?: string | Date | null;
  stop_requested_at?: string | Date | null;
  counters?: Record<string, unknown>;
  last_error?: string | null;
};

const AGENT_STATUSES = ['running', 'paused', 'stopping', 'stopped', 'completed', 'error'] as const;

function agentSummary(raw: unknown): AutomationStatusSummary['agent'] {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as AgentSessionJson;
  if (!row.id || !row.status || !(AGENT_STATUSES as readonly string[]).includes(row.status)) return null;
  const counters = row.counters && typeof row.counters === 'object' ? row.counters : {};
  const counter = (key: string): number => {
    const parsed = Number(counters[key] ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return {
    status: row.status as AgentSessionStatus,
    sessionId: row.id,
    currentStep: typeof row.current_step === 'string' ? row.current_step : null,
    currentActivity: typeof row.current_activity === 'string' ? row.current_activity : null,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : new Date().toISOString(),
    stopRequested: row.status === 'stopping',
    counters: {
      inspected: counter('inspected'),
      analyzed: counter('analyzed'),
      draftsCreated: counter('draftsCreated'),
      skipped: counter('skipped'),
      aiCalls: counter('aiCalls'),
      estimatedCostUsd: counter('estimatedCostUsd'),
    },
    lastError: typeof row.last_error === 'string' ? row.last_error : null,
  };
}

function rowsOf(result: unknown): CountRow[] {
  const raw = result as { rows?: CountRow[] } | CountRow[];
  if (Array.isArray(raw)) return raw;
  return raw?.rows ?? [];
}

// A stop request waits for the extension to confirm the loop halted. When no
// extension is driving the tab (idle, unloaded, or tab closed) there is nobody
// to confirm, so the request would hang in "stopping" forever. Complete it
// after a grace period long enough for any live runner to acknowledge.
async function expireUnacknowledgedStop(
  workspaceId: string,
  session: AgentSessionJson | null,
): Promise<AgentSessionJson | null> {
  if (!session || session.status !== 'stopping' || !session.id || !session.stop_requested_at) return session;
  const requestedAt = new Date(session.stop_requested_at).getTime();
  if (!Number.isFinite(requestedAt) || Date.now() - requestedAt < AGENT_STOP_ACK_TIMEOUT_MS) return session;

  const stoppedAt = new Date();
  const activity = 'Stopped. The browser extension did not need to confirm.';
  const updated = await db
    .update(automationAgentSessions)
    .set({
      status: 'stopped',
      stoppedAt,
      currentStep: 'stopped',
      currentActivity: activity,
      revision: sql`${automationAgentSessions.revision} + 1`,
      updatedAt: stoppedAt,
    })
    .where(and(eq(automationAgentSessions.id, session.id), eq(automationAgentSessions.status, 'stopping')))
    .returning({ id: automationAgentSessions.id });

  if (updated.length === 0) return session;

  await recordAutomationEvent({
    workspaceId,
    type: 'agent_session_stopped',
    message: 'The agent stopped after the browser extension did not confirm within 45 seconds.',
    meta: { sessionId: session.id },
  });

  return { ...session, status: 'stopped', current_activity: activity };
}

export async function getAutomationStatus(workspaceId: string): Promise<AutomationStatusSummary> {
  const countsQuery = db.execute(sql`
    SELECT
      (SELECT count(*) FROM automation_opportunities WHERE workspace_id = ${workspaceId} AND status <> 'dismissed') AS opportunities,
      (SELECT count(*) FROM automation_opportunities WHERE workspace_id = ${workspaceId} AND status IN ('new', 'analyzed', 'uncertain')) AS awaiting_review,
      (SELECT count(*) FROM automation_drafts WHERE workspace_id = ${workspaceId} AND status IN ('draft', 'awaiting_approval')) AS drafts_awaiting_approval,
      (SELECT count(*) FROM automation_drafts WHERE workspace_id = ${workspaceId} AND status IN ('approved', 'queued', 'submitting', 'submitted', 'verified')) AS approved,
      (SELECT count(*) FROM automation_publications WHERE workspace_id = ${workspaceId} AND status IN ('submitted', 'verified')) AS published,
      (SELECT count(*) FROM automation_publications WHERE workspace_id = ${workspaceId} AND status IN ('failed', 'outcome_unknown', 'removed_or_unavailable')) AS failed_publications,
      (SELECT count(*) FROM automation_tasks WHERE workspace_id = ${workspaceId} AND status = 'queued') AS queued_tasks,
      (SELECT count(*) FROM automation_tasks WHERE workspace_id = ${workspaceId} AND status = 'running') AS running_tasks,
      (SELECT count(*) FROM automation_tasks WHERE workspace_id = ${workspaceId} AND status = 'failed') AS failed_tasks,
      (SELECT status FROM automation_discovery_runs WHERE workspace_id = ${workspaceId} ORDER BY created_at DESC LIMIT 1) AS discovery_status,
      (SELECT completed_at FROM automation_discovery_runs WHERE workspace_id = ${workspaceId} ORDER BY created_at DESC LIMIT 1) AS discovery_completed_at,
      (SELECT results_found FROM automation_discovery_runs WHERE workspace_id = ${workspaceId} ORDER BY created_at DESC LIMIT 1) AS discovery_found,
      (SELECT error_message FROM automation_discovery_runs WHERE workspace_id = ${workspaceId} ORDER BY created_at DESC LIMIT 1) AS discovery_error,
      (
        SELECT row_to_json(s) FROM (
          SELECT id, status, current_step, current_activity, started_at, stop_requested_at, counters, last_error
          FROM automation_agent_sessions
          WHERE workspace_id = ${workspaceId}
          ORDER BY created_at DESC
          LIMIT 1
        ) s
      ) AS agent_session
  `);

  const [connection, installation, settingsRow, countsResult] = await Promise.all([
    getRedditConnection(workspaceId),
    getLatestExtensionInstallation(workspaceId),
    db.query.automationSettings.findFirst({ where: (t, { eq }) => eq(t.workspaceId, workspaceId) }),
    countsQuery,
  ]);

  const countsRow = rowsOf(countsResult)[0] ?? ({} as CountRow);
  const agentSession = await expireUnacknowledgedStop(
    workspaceId,
    (countsRow.agent_session as AgentSessionJson | null) ?? null,
  );
  const num = (value: unknown): number => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const scope = connection?.scope ? connection.scope.split(' ').filter(Boolean) : [];
  const discoveryStatus = countsRow.discovery_status ?? null;

  return {
    reddit: {
      status: redditConnectionStatus(connection ?? null),
      username: connection?.username ?? null,
      scope,
      canRead: scope.includes('read'),
      connectedAt: connection?.createdAt ? connection.createdAt.toISOString() : null,
      lastCheckedAt: connection?.lastCheckedAt ? connection.lastCheckedAt.toISOString() : null,
      lastError: connection?.lastError ?? null,
    },
    extension: {
      state: extensionConnectionState(installation ?? null),
      installationId: installation?.installationId ?? null,
      browser: installation?.browser ?? null,
      version: installation?.version ?? null,
      label: installation?.label ?? null,
      lastSeenAt: installation?.lastSeenAt ? installation.lastSeenAt.toISOString() : null,
    },
    tasks: {
      queued: num(countsRow.queued_tasks),
      running: num(countsRow.running_tasks),
      failed: num(countsRow.failed_tasks),
    },
    counts: {
      opportunities: num(countsRow.opportunities),
      awaitingReview: num(countsRow.awaiting_review),
      draftsAwaitingApproval: num(countsRow.drafts_awaiting_approval),
      approved: num(countsRow.approved),
      published: num(countsRow.published),
      failedPublications: num(countsRow.failed_publications),
    },
    lastDiscovery: discoveryStatus
      ? {
          status: discoveryStatus as DiscoveryRunStatus,
          completedAt: countsRow.discovery_completed_at
            ? new Date(countsRow.discovery_completed_at).toISOString()
            : null,
          found: num(countsRow.discovery_found),
          error: countsRow.discovery_error ?? null,
        }
      : null,
    settings: {
      enabled: settingsRow?.enabled ?? false,
      autoDiscovery: settingsRow?.autoDiscovery ?? false,
      queriesPerRun: settingsRow?.queriesPerRun ?? 5,
      maxDraftsPerDay: settingsRow?.maxDraftsPerDay ?? 10,
      maxPublicationsPerDay: settingsRow?.maxPublicationsPerDay ?? 5,
    },
    agentConfig: normalizeAgentConfig(settingsRow?.agentConfig),
    agent: agentSummary(agentSession),
  };
}
