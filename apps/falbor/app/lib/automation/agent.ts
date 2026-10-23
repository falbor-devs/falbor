import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/lib/db';
import {
  automationAgentActions,
  automationAgentAiUsage,
  automationAgentSessions,
  automationDrafts,
  automationOpportunities,
} from '~/lib/db/schema';
import { AutomationAuthError, getLatestExtensionInstallation } from './auth';
import { getStoredAgentConfig } from './agentSettings';
import {
  AGENT_ACTION_STATUSES,
  AGENT_MAX_FEED_SCROLLS,
  AGENT_MAX_LISTING_ROTATIONS_FACTOR,
  AGENT_MAX_OPEN_FAILURES,
  AUTONOMOUS_SUBMISSION_AUTHORIZED,
  checkRevision,
  decideAgentAction,
  EMPTY_AGENT_COUNTERS,
  estimateCostUsd,
  isActiveAgentStatus,
  normalizeAgentConfig,
  normalizeAgentCounters,
  normalizeSubredditName,
  selectFeedTargets,
  type AgentConfig,
  type AgentCounters,
  type AgentDecision,
  type AgentSessionStatus,
} from './agentCore';
import { generateDraftService } from './drafts';
import { recordAutomationEvent } from './events';
import { analyzeOpportunityService, type AnalysisUsage } from './scoringService';

export type AutomationAgentSessionRow = typeof automationAgentSessions.$inferSelect;
export type AutomationAgentActionRow = typeof automationAgentActions.$inferSelect;

export interface AgentPolicyView {
  autonomousSubmissionAuthorized: boolean;
}

export interface AgentSessionView {
  id: string;
  status: AgentSessionStatus;
  revision: number;
  config: AgentConfig;
  counters: AgentCounters;
  currentStep: string | null;
  currentActivity: string | null;
  tab: { url: string | null; title: string | null; seenAt: string | null } | null;
  stopRequested: boolean;
  startedAt: string;
  pausedAt: string | null;
  stoppedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
}

export class AgentConflictError extends Error {
  status = 409;
  session: AgentSessionView | null;
  constructor(message: string, session: AgentSessionView | null) {
    super(message);
    this.session = session;
  }
}

const AGENT_TAB_STALE_MS = 10 * 60 * 1000;
const THREAD_BODY_LIMIT = 4000;
const MAX_FEED_CANDIDATES = 60;

function agentPolicy(): AgentPolicyView {
  return { autonomousSubmissionAuthorized: AUTONOMOUS_SUBMISSION_AUTHORIZED };
}

export function toAgentSessionView(session: AutomationAgentSessionRow): AgentSessionView {
  return {
    id: session.id,
    status: session.status as AgentSessionStatus,
    revision: session.revision,
    config: normalizeAgentConfig(session.config),
    counters: normalizeAgentCounters(session.counters),
    currentStep: session.currentStep,
    currentActivity: session.currentActivity,
    tab:
      session.tabUrl || session.tabTitle || session.tabSeenAt
        ? {
            url: session.tabUrl,
            title: session.tabTitle,
            seenAt: session.tabSeenAt ? session.tabSeenAt.toISOString() : null,
          }
        : null,
    stopRequested: session.status === 'stopping',
    startedAt: session.startedAt.toISOString(),
    pausedAt: session.pausedAt ? session.pausedAt.toISOString() : null,
    stoppedAt: session.stoppedAt ? session.stoppedAt.toISOString() : null,
    completedAt: session.completedAt ? session.completedAt.toISOString() : null,
    lastError: session.lastError,
  };
}

function elapsedMs(session: AutomationAgentSessionRow, counters: AgentCounters, now: Date): number {
  const runningMs = session.status === 'running' ? Math.max(0, now.getTime() - session.startedAt.getTime()) : 0;
  return counters.activeMs + runningMs;
}

async function findSessionById(workspaceId: string, sessionId: string): Promise<AutomationAgentSessionRow | null> {
  const row = await db.query.automationAgentSessions.findFirst({
    where: (t, { and: a, eq: e }) => a(e(t.workspaceId, workspaceId), e(t.id, sessionId)),
  });
  return row ?? null;
}

async function findLatestActiveSession(workspaceId: string): Promise<AutomationAgentSessionRow | null> {
  const row = await db.query.automationAgentSessions.findFirst({
    where: (t, { and: a, eq: e, inArray: inArr }) =>
      a(e(t.workspaceId, workspaceId), inArr(t.status, ['running', 'paused', 'stopping'])),
    orderBy: [desc(automationAgentSessions.createdAt)],
  });
  return row ?? null;
}

async function findLatestSession(workspaceId: string): Promise<AutomationAgentSessionRow | null> {
  const row = await db.query.automationAgentSessions.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, workspaceId),
    orderBy: [desc(automationAgentSessions.createdAt)],
  });
  return row ?? null;
}

async function updateSession(
  session: AutomationAgentSessionRow,
  patch: Partial<typeof automationAgentSessions.$inferInsert>,
): Promise<AutomationAgentSessionRow> {
  const [updated] = await db
    .update(automationAgentSessions)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(automationAgentSessions.id, session.id), eq(automationAgentSessions.revision, session.revision)))
    .returning();
  if (!updated) {
    throw new AgentConflictError('The agent session changed concurrently. Reload and try again.', null);
  }
  return updated;
}

async function applyPause(params: {
  session: AutomationAgentSessionRow;
  counters: AgentCounters;
  reason: string;
  now: Date;
  eventType?: 'agent_session_paused' | 'agent_limit_reached';
}): Promise<AutomationAgentSessionRow> {
  const { session, counters, reason, now } = params;
  counters.activeMs = elapsedMs(session, counters, now);
  const updated = await updateSession(session, {
    status: 'paused',
    pausedAt: now,
    counters,
    currentStep: 'paused',
    currentActivity: reason,
    revision: session.revision + 1,
  });
  await recordAutomationEvent({
    workspaceId: session.workspaceId,
    userId: session.userId,
    type: params.eventType ?? 'agent_session_paused',
    message: reason,
    meta: { sessionId: session.id },
  });
  return updated;
}

async function applyCompletion(params: {
  session: AutomationAgentSessionRow;
  counters: AgentCounters;
  reason: string;
  now: Date;
}): Promise<AutomationAgentSessionRow> {
  const { session, counters, reason, now } = params;
  counters.activeMs = elapsedMs(session, counters, now);
  const updated = await updateSession(session, {
    status: 'completed',
    completedAt: now,
    counters,
    currentStep: 'completed',
    currentActivity: reason,
    revision: session.revision + 1,
  });
  await recordAutomationEvent({
    workspaceId: session.workspaceId,
    userId: session.userId,
    type: 'agent_session_completed',
    message: reason,
    meta: { sessionId: session.id },
  });
  return updated;
}

async function applyStopped(params: {
  session: AutomationAgentSessionRow;
  counters: AgentCounters;
  reason: string;
  now: Date;
  lastError?: string | null;
}): Promise<AutomationAgentSessionRow> {
  const { session, counters, reason, now } = params;
  counters.activeMs = elapsedMs(session, counters, now);
  const updated = await updateSession(session, {
    status: 'stopped',
    stoppedAt: now,
    counters,
    currentStep: 'stopped',
    currentActivity: reason,
    revision: session.revision + 1,
    lastError: params.lastError !== undefined ? params.lastError : session.lastError,
  });
  await recordAutomationEvent({
    workspaceId: session.workspaceId,
    userId: session.userId,
    type: 'agent_session_stopped',
    message: reason,
    meta: { sessionId: session.id },
  });
  return updated;
}

async function reconcileStaleSession(session: AutomationAgentSessionRow): Promise<AutomationAgentSessionRow> {
  if (session.status !== 'running') return session;
  const now = new Date();
  const reference = session.tabSeenAt ?? session.startedAt;
  if (now.getTime() - reference.getTime() <= AGENT_TAB_STALE_MS) return session;
  const counters = normalizeAgentCounters(session.counters);
  try {
    return await applyPause({
      session,
      counters,
      reason: 'Paused: the Reddit tab has not reported back in 10 minutes. Open Reddit, then resume the agent.',
      now,
    });
  } catch (error) {
    if (error instanceof AgentConflictError) {
      const fresh = await findSessionById(session.workspaceId, session.id);
      return fresh ?? session;
    }
    throw error;
  }
}

async function findAgentAction(sessionId: string, idempotencyKey: string): Promise<AutomationAgentActionRow | null> {
  const row = await db.query.automationAgentActions.findFirst({
    where: (t, { and: a, eq: e }) => a(e(t.sessionId, sessionId), e(t.idempotencyKey, idempotencyKey)),
  });
  return row ?? null;
}

async function recordAgentAction(params: {
  session: AutomationAgentSessionRow;
  kind: string;
  status: (typeof AGENT_ACTION_STATUSES)[number];
  idempotencyKey: string;
  revision: number;
  actionParams?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
  opportunityId?: string | null;
  draftId?: string | null;
  completedAt?: Date | null;
}): Promise<void> {
  const inserted = await db
    .insert(automationAgentActions)
    .values({
      workspaceId: params.session.workspaceId,
      sessionId: params.session.id,
      kind: params.kind,
      status: params.status,
      revision: params.revision,
      idempotencyKey: params.idempotencyKey,
      params: params.actionParams ?? {},
      result: params.result ?? null,
      errorMessage: params.errorMessage ?? null,
      opportunityId: params.opportunityId ?? null,
      draftId: params.draftId ?? null,
      completedAt: params.completedAt ?? (params.status === 'completed' ? new Date() : null),
    })
    .onConflictDoNothing({ target: [automationAgentActions.sessionId, automationAgentActions.idempotencyKey] })
    .returning({ id: automationAgentActions.id });
  if (inserted.length === 0) return;
}

async function recordAiUsage(params: {
  workspaceId: string;
  sessionId: string;
  kind: 'analysis' | 'draft';
  usage: AnalysisUsage;
}): Promise<void> {
  const cost = estimateCostUsd(params.usage.model, params.usage.promptTokens, params.usage.completionTokens);
  await db.insert(automationAgentAiUsage).values({
    workspaceId: params.workspaceId,
    sessionId: params.sessionId,
    kind: params.kind,
    model: params.usage.model,
    promptTokens: params.usage.promptTokens,
    completionTokens: params.usage.completionTokens,
    estimatedCostUsd: cost,
  });
}

function normalizePostExternalId(value: string): string | null {
  const match = /^(?:t3_)?([a-z0-9]{4,12})$/i.exec(value.trim());
  return match ? `t3_${match[1].toLowerCase()}` : null;
}

function parsePostedAt(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function getAgentSessionView(workspaceId: string): Promise<{
  session: AgentSessionView | null;
  config: AgentConfig;
  policy: AgentPolicyView;
}> {
  const [found, config] = await Promise.all([findLatestSession(workspaceId), getStoredAgentConfig(workspaceId)]);
  const session = found ? await reconcileStaleSession(found) : null;
  return {
    session: session ? toAgentSessionView(session) : null,
    config,
    policy: agentPolicy(),
  };
}

export async function getExtensionAgentState(
  workspaceId: string,
  installationId: string,
): Promise<{ session: AgentSessionView | null; policy: AgentPolicyView; config: AgentConfig }> {
  const [found, config] = await Promise.all([findLatestSession(workspaceId), getStoredAgentConfig(workspaceId)]);
  let session = found ? await reconcileStaleSession(found) : null;
  if (session && session.installationId && session.installationId !== installationId) session = null;
  return { session: session ? toAgentSessionView(session) : null, policy: agentPolicy(), config };
}

export const controlPayloadSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'stop']),
  sessionId: z.string().uuid().optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
  config: z.unknown().optional(),
});

export async function controlAgentSession(params: {
  workspaceId: string;
  userId: string;
  installationId: string | null;
  payload: z.infer<typeof controlPayloadSchema>;
}): Promise<AgentSessionView> {
  const { workspaceId, userId, installationId, payload } = params;
  const now = new Date();
  const target = payload.sessionId
    ? await findSessionById(workspaceId, payload.sessionId)
    : await findLatestActiveSession(workspaceId);

  if (payload.sessionId && !target) throw new AutomationAuthError(404, 'Agent session not found.');

  if (target && payload.expectedRevision != null && checkRevision(target.revision, payload.expectedRevision) === 'stale') {
    throw new AgentConflictError('This command is based on an outdated session state.', toAgentSessionView(target));
  }

  if (payload.action === 'start') {
    if (target && isActiveAgentStatus(target.status as AgentSessionStatus)) {
      if (target.status === 'paused') {
        return resumeSession(target, payload.config, now);
      }
      return toAgentSessionView(target);
    }
    const [config, installation] = await Promise.all([
      payload.config !== undefined ? normalizeAgentConfig(payload.config) : getStoredAgentConfig(workspaceId),
      installationId ? Promise.resolve({ installationId }) : getLatestExtensionInstallation(workspaceId),
    ]);
    if (config.scopeSubreddits.length === 0) {
      throw new AutomationAuthError(
        400,
        'Add at least one subreddit before starting: open Falbor, go to Automation, open the AI agent card and click Configure.',
      );
    }
    const [created] = await db
      .insert(automationAgentSessions)
      .values({
        workspaceId,
        userId,
        installationId: installation?.installationId ?? null,
        status: 'running',
        revision: 1,
        config,
        counters: EMPTY_AGENT_COUNTERS,
        currentStep: 'starting',
        currentActivity: 'Waiting for the browser extension to pick up the session.',
        startedAt: now,
      })
      .returning();
    await recordAgentAction({
      session: created,
      kind: 'start',
      status: 'completed',
      idempotencyKey: 'control:start',
      revision: created.revision,
      actionParams: { config },
    });
    await recordAutomationEvent({
      workspaceId,
      userId,
      type: 'agent_session_started',
      message: `Agent session started with ${config.scopeSubreddits.length} subreddit${config.scopeSubreddits.length === 1 ? '' : 's'} in scope.`,
      meta: { sessionId: created.id, config },
    });
    return toAgentSessionView(created);
  }

  if (!target) throw new AutomationAuthError(404, 'There is no agent session to control.');

  if (payload.action === 'pause') {
    if (target.status === 'running') {
      const counters = normalizeAgentCounters(target.counters);
      const updated = await applyPause({ session: target, counters, reason: 'Paused by the user.', now });
      await recordAgentAction({
        session: target,
        kind: 'pause',
        status: 'completed',
        idempotencyKey: `control:pause:${target.revision}`,
        revision: updated.revision,
      });
      return toAgentSessionView(updated);
    }
    return toAgentSessionView(target);
  }

  if (payload.action === 'resume') {
    if (target.status === 'paused') {
      return resumeSession(target, payload.config, now);
    }
    if (target.status === 'running') return toAgentSessionView(target);
    throw new AgentConflictError('This session cannot be resumed from its current state.', toAgentSessionView(target));
  }

  if (target.status === 'running') {
    const updated = await updateSession(target, {
      status: 'stopping',
      stopRequestedAt: now,
      currentActivity: 'Stop requested. Waiting for the browser extension to confirm.',
      revision: target.revision + 1,
    });
    await recordAgentAction({
      session: target,
      kind: 'stop',
      status: 'requested',
      idempotencyKey: `control:stop:${target.revision}`,
      revision: updated.revision,
    });
    await recordAutomationEvent({
      workspaceId,
      userId,
      type: 'agent_session_stop_requested',
      message: 'Stop requested. The agent will halt at the next safe point.',
      meta: { sessionId: target.id },
    });
    return toAgentSessionView(updated);
  }

  if (target.status === 'paused') {
    const counters = normalizeAgentCounters(target.counters);
    const updated = await applyStopped({ session: target, counters, reason: 'Stopped by the user.', now });
    await recordAgentAction({
      session: target,
      kind: 'stop',
      status: 'completed',
      idempotencyKey: `control:stop:${target.revision}`,
      revision: updated.revision,
    });
    return toAgentSessionView(updated);
  }

  return toAgentSessionView(target);
}

async function resumeSession(
  target: AutomationAgentSessionRow,
  configInput: unknown,
  now: Date,
): Promise<AgentSessionView> {
  const config = configInput !== undefined ? normalizeAgentConfig(configInput) : normalizeAgentConfig(target.config);
  if (config.scopeSubreddits.length === 0) {
    throw new AutomationAuthError(
      400,
      'Add at least one subreddit before resuming: open Falbor, go to Automation, open the AI agent card and click Configure.',
    );
  }
  const updated = await updateSession(target, {
    status: 'running',
    startedAt: now,
    pausedAt: null,
    stopRequestedAt: null,
    config,
    currentStep: 'resuming',
    currentActivity: 'Running.',
    revision: target.revision + 1,
  });
  await recordAgentAction({
    session: target,
    kind: 'resume',
    status: 'completed',
    idempotencyKey: `control:resume:${target.revision}`,
    revision: updated.revision,
  });
  await recordAutomationEvent({
    workspaceId: target.workspaceId,
    userId: target.userId,
    type: 'agent_session_resumed',
    message: 'Agent session resumed.',
    meta: { sessionId: target.id },
  });
  return toAgentSessionView(updated);
}

const feedCandidateSchema = z.object({
  externalId: z.string().min(1).max(20),
  url: z.string().min(1).max(2048),
  subreddit: z.string().min(1).max(30),
  title: z.string().max(300).optional(),
});

const threadSchema = z.object({
  externalId: z.string().min(1).max(20),
  url: z.string().min(1).max(2048),
  subreddit: z.string().min(1).max(30),
  title: z.string().min(1).max(300),
  body: z.string().max(8000).nullish(),
  author: z.string().max(100).nullish(),
  score: z.number().int().nullish(),
  numComments: z.number().int().nullish(),
  postedAt: z.string().max(64).nullish(),
  comments: z
    .array(
      z.object({
        author: z.string().max(100).nullish(),
        body: z.string().max(2000),
        score: z.number().int().nullish(),
      }),
    )
    .max(12)
    .optional(),
  flags: z
    .object({
      locked: z.boolean().optional(),
      archived: z.boolean().optional(),
      removed: z.boolean().optional(),
      verificationRequired: z.boolean().optional(),
      notSignedIn: z.boolean().optional(),
    })
    .optional(),
});

const tabSchema = z.object({
  url: z.string().max(2048),
  title: z.string().max(300).optional(),
});

export const observePayloadSchema = z.discriminatedUnion('kind', [
  z.object({
    sessionId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    idempotencyKey: z.string().min(3).max(200),
    kind: z.literal('feed'),
    tab: tabSchema.optional(),
    sourceSubreddit: z.string().max(30).optional(),
    scrollAttempts: z.number().int().min(0).max(10).optional(),
    candidates: z.array(feedCandidateSchema).max(MAX_FEED_CANDIDATES),
  }),
  z.object({
    sessionId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    idempotencyKey: z.string().min(3).max(200),
    kind: z.literal('thread'),
    tab: tabSchema.optional(),
    thread: threadSchema,
  }),
]);

export interface AgentObserveResponse {
  session: AgentSessionView;
  decision: AgentDecision | null;
  counters: AgentCounters;
  policy: AgentPolicyView;
}

export async function observeFromExtension(params: {
  workspaceId: string;
  installationId: string;
  userId: string;
  payload: z.infer<typeof observePayloadSchema>;
}): Promise<AgentObserveResponse> {
  const { workspaceId, installationId, userId, payload } = params;
  const session = await findSessionById(workspaceId, payload.sessionId);
  if (!session) throw new AutomationAuthError(404, 'Agent session not found.');
  if (session.installationId && session.installationId !== installationId) {
    throw new AutomationAuthError(403, 'This agent session belongs to another extension installation.');
  }

  const replay = await findAgentAction(session.id, payload.idempotencyKey);
  if (replay && replay.result && (replay.status === 'completed' || replay.status === 'failed')) {
    const stored = replay.result as { decision?: AgentDecision };
    return {
      session: toAgentSessionView(session),
      decision: stored.decision ?? null,
      counters: normalizeAgentCounters(session.counters),
      policy: agentPolicy(),
    };
  }

  if (session.status === 'stopping') {
    return {
      session: toAgentSessionView(session),
      decision: { action: 'stop', reason: 'Stop requested. Halting the agent now.' },
      counters: normalizeAgentCounters(session.counters),
      policy: agentPolicy(),
    };
  }
  if (!isActiveAgentStatus(session.status as AgentSessionStatus) || session.status === 'paused') {
    return {
      session: toAgentSessionView(session),
      decision: null,
      counters: normalizeAgentCounters(session.counters),
      policy: agentPolicy(),
    };
  }
  if (checkRevision(session.revision, payload.revision) === 'stale') {
    throw new AgentConflictError('This observation is based on an outdated session state.', toAgentSessionView(session));
  }

  const now = new Date();
  const counters = normalizeAgentCounters(session.counters);
  const config = normalizeAgentConfig(session.config);

  if (payload.kind === 'feed') {
    return observeFeed({ session, config, counters, payload, now });
  }
  return observeThread({ session, config, counters, payload, now, userId });
}

async function countListingRotations(sessionId: string): Promise<number> {
  const rows = await db
    .select({ result: automationAgentActions.result })
    .from(automationAgentActions)
    .where(and(eq(automationAgentActions.sessionId, sessionId), eq(automationAgentActions.kind, 'feed_scan')));
  let rotations = 0;
  for (const row of rows) {
    const decision = (row.result as { decision?: { action?: string } } | null)?.decision;
    if (decision?.action === 'open_listing') rotations += 1;
  }
  return rotations;
}

async function failedOpenTargetIds(sessionId: string): Promise<Set<string>> {
  const rows = await db
    .select({ idempotencyKey: automationAgentActions.idempotencyKey })
    .from(automationAgentActions)
    .where(
      and(
        eq(automationAgentActions.sessionId, sessionId),
        eq(automationAgentActions.kind, 'open_discussion'),
        eq(automationAgentActions.status, 'failed'),
      ),
    );
  const counts = new Map<string, number>();
  for (const row of rows) {
    const id = row.idempotencyKey.replace(/^open:/, '').toLowerCase();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const blocked = new Set<string>();
  for (const [id, count] of counts) {
    if (count >= AGENT_MAX_OPEN_FAILURES) blocked.add(id);
  }
  return blocked;
}

async function observeFeed(params: {
  session: AutomationAgentSessionRow;
  config: AgentConfig;
  counters: AgentCounters;
  payload: Extract<z.infer<typeof observePayloadSchema>, { kind: 'feed' }>;
  now: Date;
}): Promise<AgentObserveResponse> {
  const { session, config, counters, payload, now } = params;
  const remaining = Math.max(0, config.maxDiscussions - counters.inspected);

  if (remaining === 0) {
    const reason = `Stopped after inspecting the configured maximum of ${config.maxDiscussions} discussions.`;
    const updated = await applyCompletion({ session, counters, reason, now });
    await recordAgentAction({
      session,
      kind: 'feed_scan',
      status: 'completed',
      idempotencyKey: payload.idempotencyKey,
      revision: updated.revision,
      result: { decision: { action: 'stop', reason } },
    });
    return { session: toAgentSessionView(updated), decision: { action: 'stop', reason }, counters, policy: agentPolicy() };
  }

  const [inspectActions, blockedTargets] = await Promise.all([
    db
      .select({ idempotencyKey: automationAgentActions.idempotencyKey })
      .from(automationAgentActions)
      .where(
        and(
          eq(automationAgentActions.sessionId, session.id),
          eq(automationAgentActions.kind, 'inspect'),
          ne(automationAgentActions.status, 'failed'),
        ),
      ),
    failedOpenTargetIds(session.id),
  ]);
  const inspectedExternalIds = inspectActions
    .map((row) => row.idempotencyKey.replace(/^inspect:/, ''))
    .filter(Boolean);
  const candidates = payload.candidates.filter(
    (candidate) => !blockedTargets.has(String(candidate.externalId).trim().toLowerCase()),
  );

  const targets = selectFeedTargets({
    candidates,
    inspectedExternalIds,
    remaining,
    scopeSubreddits: config.scopeSubreddits,
  });

  const sourceSubreddit = normalizeSubredditName(payload.sourceSubreddit ?? '');
  const scrollAttempts = payload.scrollAttempts ?? 0;

  let decision: AgentDecision;
  let step: string;

  if (targets.length > 0) {
    const target = targets[0];
    decision = {
      action: 'inspect',
      reason: `Opening “${(target.title || 'a discussion').slice(0, 120)}” in r/${target.subreddit} to evaluate its relevance.`,
      target,
      actionId: `open:${target.externalId}`,
    };
    step = 'opening_discussion';
  } else if (scrollAttempts < AGENT_MAX_FEED_SCROLLS) {
    decision = {
      action: 'scroll_feed',
      reason: 'No new discussions are visible on screen; scrolling the listing to load more.',
      actionId: `${payload.idempotencyKey}:scroll:${scrollAttempts}`,
    };
    step = 'scrolling_feed';
  } else {
    const scope = config.scopeSubreddits;
    const rotations = await countListingRotations(session.id);
    if (scope.length > 1 && rotations < scope.length * AGENT_MAX_LISTING_ROTATIONS_FACTOR) {
      const currentIndex = sourceSubreddit ? scope.indexOf(sourceSubreddit) : -1;
      const next = scope[(currentIndex + 1 + scope.length) % scope.length];
      decision = {
        action: 'open_listing',
        reason: `No new discussions in r/${sourceSubreddit ?? scope[0]} after scrolling; switching to r/${next}.`,
        listingUrl: `https://www.reddit.com/r/${encodeURIComponent(next)}/new/`,
        actionId: `${payload.idempotencyKey}:listing`,
      };
      step = 'switching_listing';
    } else {
      const reason = `Paused: no new discussions were found after scrolling ${scope
        .map((name) => `r/${name}`)
        .join(', ')}. Resume later for new posts.`;
      const updated = await applyPause({ session, counters, reason, now, eventType: 'agent_limit_reached' });
      await recordAgentAction({
        session,
        kind: 'feed_scan',
        status: 'completed',
        idempotencyKey: payload.idempotencyKey,
        revision: updated.revision,
        result: { decision: { action: 'pause', reason } },
      });
      return {
        session: toAgentSessionView(updated),
        decision: { action: 'pause', reason },
        counters,
        policy: agentPolicy(),
      };
    }
  }

  const updated = await updateSession(session, {
    counters,
    tabUrl: payload.tab?.url ?? session.tabUrl,
    tabTitle: payload.tab?.title ?? session.tabTitle,
    tabSeenAt: now,
    currentStep: step,
    currentActivity: decision.reason,
    revision: session.revision + 1,
  });
  await recordAgentAction({
    session,
    kind: 'feed_scan',
    status: 'completed',
    idempotencyKey: payload.idempotencyKey,
    revision: updated.revision,
    actionParams: {
      sourceSubreddit: sourceSubreddit ?? null,
      candidates: payload.candidates.length,
      scrollAttempts,
    },
    result: { decision },
  });
  if (decision.actionId) {
    const kind =
      decision.action === 'inspect' ? 'open_discussion' : decision.action === 'scroll_feed' ? 'scroll_feed' : 'open_listing';
    await recordAgentAction({
      session,
      kind,
      status: 'requested',
      idempotencyKey: decision.actionId,
      revision: updated.revision,
      actionParams: {
        target: decision.target ?? null,
        listingUrl: decision.listingUrl ?? null,
        reason: decision.reason,
      },
    });
  }
  return {
    session: toAgentSessionView(updated),
    decision,
    counters,
    policy: agentPolicy(),
  };
}

function attachReturn(decision: AgentDecision, externalId: string, subreddit: string): AgentDecision {
  return {
    ...decision,
    actionId: `return:${externalId}`,
    listingUrl: `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new/`,
  };
}

async function observeThread(params: {
  session: AutomationAgentSessionRow;
  config: AgentConfig;
  counters: AgentCounters;
  payload: Extract<z.infer<typeof observePayloadSchema>, { kind: 'thread' }>;
  now: Date;
  userId: string;
}): Promise<AgentObserveResponse> {
  const { session, config, counters, payload, now, userId } = params;
  const thread = payload.thread;
  const workspaceId = session.workspaceId;

  const externalId = normalizePostExternalId(thread.externalId);
  if (!externalId) throw new AutomationAuthError(400, 'The discussion id is not a valid Reddit post id.');
  const subreddit = normalizeSubredditName(thread.subreddit) ?? thread.subreddit.toLowerCase().slice(0, 30);

  const buildResponse = async (
    decision: AgentDecision,
    updated: AutomationAgentSessionRow,
    extraResult: Record<string, unknown>,
  ): Promise<AgentObserveResponse> => {
    await recordAgentAction({
      session,
      kind: 'inspect',
      status: 'completed',
      idempotencyKey: `inspect:${externalId}`,
      revision: updated.revision,
      actionParams: { subreddit, url: thread.url },
      result: { decision, ...extraResult },
      opportunityId: (extraResult.opportunityId as string | undefined) ?? null,
      draftId: (extraResult.draftId as string | undefined) ?? null,
    });
    return { session: toAgentSessionView(updated), decision, counters, policy: agentPolicy() };
  };

  if (thread.flags?.notSignedIn) {
    const reason = 'Paused: you are not signed in to Reddit in this browser. Sign in, then resume the agent.';
    const updated = await applyPause({ session, counters, reason, now });
    return buildResponse({ action: 'pause', reason }, updated, {});
  }
  if (thread.flags?.verificationRequired) {
    const reason = 'Reddit requested human verification. Complete it in the browser, then resume the agent.';
    const updated = await applyPause({ session, counters, reason, now });
    await recordAutomationEvent({
      workspaceId,
      userId: session.userId,
      type: 'agent_policy_blocked',
      message: reason,
      meta: { sessionId: session.id, url: thread.url },
    });
    return buildResponse({ action: 'pause', reason }, updated, {});
  }
  if (thread.flags?.locked || thread.flags?.archived || thread.flags?.removed) {
    counters.skipped += 1;
    const reason = thread.flags?.locked
      ? 'Comments are locked on this discussion.'
      : thread.flags?.archived
        ? 'This discussion is archived.'
        : 'This discussion was removed.';
    const updated = await updateSession(session, {
      counters,
      tabUrl: payload.tab?.url ?? session.tabUrl,
      tabTitle: payload.tab?.title ?? session.tabTitle,
      tabSeenAt: now,
      currentStep: 'inspected',
      currentActivity: reason,
      revision: session.revision + 1,
    });
    const decision = attachReturn({ action: 'skip', reason }, externalId, subreddit);
    await recordAgentAction({
      session,
      kind: 'return_to_feed',
      status: 'requested',
      idempotencyKey: decision.actionId as string,
      revision: updated.revision,
      actionParams: { subreddit, url: thread.url, reason },
    });
    return buildResponse(decision, updated, { skipped: true });
  }

  const inserted = await db
    .insert(automationOpportunities)
    .values({
      workspaceId,
      externalId,
      subreddit,
      title: thread.title.slice(0, 300),
      body: thread.body ? thread.body.slice(0, THREAD_BODY_LIMIT) : null,
      url: thread.url,
      author: thread.author ?? null,
      score: typeof thread.score === 'number' ? thread.score : null,
      numComments: typeof thread.numComments === 'number' ? thread.numComments : null,
      postedAt: parsePostedAt(thread.postedAt),
      source: 'reddit_agent',
      status: 'new',
    })
    .onConflictDoUpdate({
      target: [automationOpportunities.workspaceId, automationOpportunities.externalId],
      set: {
        title: thread.title.slice(0, 300),
        body: thread.body ? thread.body.slice(0, THREAD_BODY_LIMIT) : null,
        url: thread.url,
        author: thread.author ?? null,
        score: typeof thread.score === 'number' ? thread.score : null,
        numComments: typeof thread.numComments === 'number' ? thread.numComments : null,
        source: 'reddit_agent',
        updatedAt: now,
      },
    })
    .returning();

  const opportunity = inserted[0];
  counters.inspected += 1;

  const elapsed = elapsedMs(session, counters, now);
  const precheck = decideAgentAction({ config, counters, elapsedMs: elapsed });
  if (precheck.action === 'pause' || precheck.action === 'stop') {
    const updated =
      precheck.action === 'pause'
        ? await applyPause({ session, counters, reason: precheck.reason, now, eventType: 'agent_limit_reached' })
        : await applyCompletion({ session, counters, reason: precheck.reason, now });
    return buildResponse(precheck, updated, { opportunityId: opportunity.id });
  }

  const usageSink = (kind: 'analysis' | 'draft') => async (usage: AnalysisUsage): Promise<void> => {
    counters.aiCalls += 1;
    counters.promptTokens += usage.promptTokens;
    counters.completionTokens += usage.completionTokens;
    counters.estimatedCostUsd = Math.round((counters.estimatedCostUsd + estimateCostUsd(usage.model, usage.promptTokens, usage.completionTokens)) * 1_000_000) / 1_000_000;
    await recordAiUsage({ workspaceId, sessionId: session.id, kind, usage });
  };

  let relevance: number | null = null;
  let analysisError: string | null = null;
  try {
    const analyzed = await analyzeOpportunityService(workspaceId, userId, opportunity.id, {
      skipReddit: true,
      comments: (thread.comments ?? []).map((comment) => ({
        author: comment.author ?? null,
        body: comment.body,
        score: typeof comment.score === 'number' ? comment.score : null,
      })),
      onUsage: usageSink('analysis'),
    });
    relevance = analyzed.relevanceScore ?? null;
    counters.analyzed += 1;
    counters.consecutiveErrors = 0;
    if (relevance != null && relevance >= config.minRelevanceScore) counters.relevantFound += 1;
  } catch (error) {
    analysisError = error instanceof Error ? error.message : 'The AI analysis failed.';
    counters.errors += 1;
    counters.consecutiveErrors += 1;
  }

  let decision = decideAgentAction({
    config,
    counters,
    elapsedMs: elapsedMs(session, counters, now),
    relevanceScore: analysisError ? null : relevance,
  });
  if (analysisError && decision.action === 'skip') {
    decision = { action: 'skip', reason: `The AI analysis failed: ${analysisError}` };
  }

  let draftId: string | null = null;
  if (decision.action === 'draft_created') {
    const existingDraft = await db.query.automationDrafts.findFirst({
      where: (t, { and: a, eq: e }) => a(e(t.workspaceId, workspaceId), e(t.opportunityId, opportunity.id)),
      orderBy: [desc(automationDrafts.createdAt)],
    });
    const reusable =
      existingDraft &&
      existingDraft.createdAt.getTime() >= session.startedAt.getTime() &&
      existingDraft.status !== 'rejected' &&
      existingDraft.status !== 'cancelled'
        ? existingDraft
        : null;
    if (reusable) {
      draftId = reusable.id;
      counters.consecutiveIrrelevant = 0;
      decision = { ...decision, draftId };
    } else {
      try {
        const draft = await generateDraftService(workspaceId, userId, opportunity.id, {
          onUsage: usageSink('draft'),
        });
        draftId = draft.id;
        counters.draftsCreated += 1;
        counters.consecutiveIrrelevant = 0;
        decision = { ...decision, draftId };
        await recordAutomationEvent({
          workspaceId,
          userId: session.userId,
          type: 'agent_draft_created',
          message: `Draft ready for review: “${thread.title.slice(0, 120)}” in r/${subreddit}.`,
          opportunityId: opportunity.id,
          draftId: draft.id,
          url: thread.url,
          meta: { sessionId: session.id },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Draft generation failed.';
        counters.errors += 1;
        counters.consecutiveErrors += 1;
        const errorDecision = decideAgentAction({
          config,
          counters,
          elapsedMs: elapsedMs(session, counters, now),
          relevanceScore: null,
        });
        decision =
          errorDecision.action === 'pause' || errorDecision.action === 'stop'
            ? errorDecision
            : { action: 'skip', reason: `Draft generation failed: ${message}` };
      }
    }
  } else if (decision.action === 'skip') {
    counters.skipped += 1;
    if (relevance != null && relevance < config.minRelevanceScore) counters.consecutiveIrrelevant += 1;
    else counters.consecutiveIrrelevant = 0;
  }

  await recordAutomationEvent({
    workspaceId,
    userId: session.userId,
    type: 'agent_discussion_inspected',
    message: `Inspected r/${subreddit}: “${thread.title.slice(0, 120)}”${relevance != null ? ` (relevance ${relevance})` : ''}.`,
    opportunityId: opportunity.id,
    url: thread.url,
    meta: { sessionId: session.id, decision: decision.action, reason: decision.reason, relevance },
  });

  let updated: AutomationAgentSessionRow;
  if (decision.action === 'pause') {
    updated = await applyPause({ session, counters, reason: decision.reason, now, eventType: 'agent_limit_reached' });
  } else if (decision.action === 'stop') {
    updated = await applyCompletion({ session, counters, reason: decision.reason, now });
  } else {
    updated = await updateSession(session, {
      counters,
      tabUrl: payload.tab?.url ?? session.tabUrl,
      tabTitle: payload.tab?.title ?? session.tabTitle,
      tabSeenAt: now,
      currentStep: decision.action === 'draft_created' ? 'draft_created' : 'inspected',
      currentActivity: decision.reason,
      revision: session.revision + 1,
    });
  }

  if (decision.action === 'draft_created' || decision.action === 'skip') {
    decision = attachReturn(decision, externalId, subreddit);
    await recordAgentAction({
      session,
      kind: 'return_to_feed',
      status: 'requested',
      idempotencyKey: decision.actionId as string,
      revision: updated.revision,
      actionParams: { subreddit, url: thread.url, reason: decision.reason },
    });
  }

  return buildResponse(decision, updated, {
    opportunityId: opportunity.id,
    draftId,
    relevance,
  });
}

export const reportPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  tab: tabSchema.optional(),
  currentStep: z.string().max(60).optional(),
  currentActivity: z.string().max(300).optional(),
  actions: z
    .array(
      z.object({
        kind: z.string().min(1).max(40),
        status: z.enum(AGENT_ACTION_STATUSES),
        idempotencyKey: z.string().min(3).max(200),
        error: z.string().max(500).optional(),
        result: z.record(z.unknown()).optional(),
      }),
    )
    .max(25),
});

export interface AgentReportResponse {
  session: AgentSessionView;
  counters: AgentCounters;
  policy: AgentPolicyView;
}

export async function reportFromExtension(params: {
  workspaceId: string;
  installationId: string;
  payload: z.infer<typeof reportPayloadSchema>;
}): Promise<AgentReportResponse> {
  const { workspaceId, installationId, payload } = params;
  const session = await findSessionById(workspaceId, payload.sessionId);
  if (!session) throw new AutomationAuthError(404, 'Agent session not found.');
  if (session.installationId && session.installationId !== installationId) {
    throw new AutomationAuthError(403, 'This agent session belongs to another extension installation.');
  }
  if (checkRevision(session.revision, payload.revision) === 'stale') {
    throw new AgentConflictError('This report is based on an outdated session state.', toAgentSessionView(session));
  }

  const now = new Date();
  const counters = normalizeAgentCounters(session.counters);
  let stopAcknowledged = false;
  let fatalError: string | null = null;
  let pauseReason: string | null = null;

  for (const item of payload.actions) {
    const inserted = await db
      .insert(automationAgentActions)
      .values({
        workspaceId,
        sessionId: session.id,
        kind: item.kind,
        status: item.status,
        revision: session.revision,
        idempotencyKey: item.idempotencyKey,
        params: {},
        result: item.result ?? null,
        errorMessage: item.error ?? null,
        completedAt: item.status === 'completed' ? now : null,
      })
      .onConflictDoNothing({ target: [automationAgentActions.sessionId, automationAgentActions.idempotencyKey] })
      .returning({ id: automationAgentActions.id });
    let applied = inserted.length > 0;
    if (!applied) {
      const existing = await db.query.automationAgentActions.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.sessionId, session.id), e(t.idempotencyKey, item.idempotencyKey)),
      });
      if (existing && existing.status === 'requested' && item.status !== 'requested') {
        const promoted = await db
          .update(automationAgentActions)
          .set({
            status: item.status,
            result: item.result ?? null,
            errorMessage: item.error ?? null,
            completedAt: item.status === 'completed' ? now : null,
          })
          .where(and(eq(automationAgentActions.id, existing.id), eq(automationAgentActions.status, 'requested')))
          .returning({ id: automationAgentActions.id });
        applied = promoted.length > 0;
      }
    }
    if (!applied) continue;

    if (item.status === 'failed') {
      counters.errors += 1;
      counters.consecutiveErrors += 1;
    }
    if (
      item.status === 'completed' &&
      ['inspect', 'navigate', 'feed_scan', 'open_discussion', 'scroll_feed', 'open_listing', 'return_to_feed'].includes(
        item.kind,
      )
    ) {
      counters.consecutiveErrors = 0;
    }
    if (item.kind === 'stop' && item.status === 'completed') stopAcknowledged = true;
    if (item.kind === 'pause' && item.status === 'completed') {
      pauseReason = item.error || 'Paused by the browser extension.';
    }
    if (item.kind === 'error' && item.status === 'failed') {
      const fatal = item.result && item.result.fatal === true;
      if (fatal) fatalError = item.error || 'The extension reported a fatal error.';
    }
  }

  const elapsed = elapsedMs(session, counters, now);
  let updated: AutomationAgentSessionRow;

  if (fatalError) {
    counters.activeMs = elapsed;
    updated = await updateSession(session, {
      status: session.status === 'stopping' ? 'stopped' : 'error',
      stoppedAt: session.status === 'stopping' ? now : null,
      counters,
      currentStep: 'error',
      currentActivity: fatalError,
      lastError: fatalError,
      revision: session.revision + 1,
    });
    await recordAutomationEvent({
      workspaceId,
      userId: session.userId,
      type: 'agent_session_error',
      message: fatalError,
      meta: { sessionId: session.id },
    });
  } else if (stopAcknowledged && session.status === 'stopping') {
    updated = await applyStopped({
      session,
      counters,
      reason: 'Stopped by the user.',
      now,
    });
  } else if (pauseReason && session.status === 'running') {
    updated = await applyPause({
      session,
      counters,
      reason: pauseReason,
      now,
      eventType: 'agent_limit_reached',
    });
  } else if (
    session.status === 'running' &&
    counters.consecutiveErrors >= normalizeAgentConfig(session.config).maxConsecutiveErrors
  ) {
    updated = await applyPause({
      session,
      counters,
      reason: `Paused after ${counters.consecutiveErrors} consecutive errors reported by the extension.`,
      now,
      eventType: 'agent_limit_reached',
    });
  } else {
    updated = await updateSession(session, {
      counters,
      tabUrl: payload.tab?.url ?? session.tabUrl,
      tabTitle: payload.tab?.title ?? session.tabTitle,
      tabSeenAt: payload.tab ? now : session.tabSeenAt,
      currentStep: payload.currentStep ?? session.currentStep,
      currentActivity: payload.currentActivity ?? session.currentActivity,
      revision: session.revision + 1,
    });
  }

  return {
    session: toAgentSessionView(updated),
    counters,
    policy: agentPolicy(),
  };
}
