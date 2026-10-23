import type { DraftStatus, PublicationStatus, TaskStatus } from './types';

const DRAFT_TRANSITIONS: Record<DraftStatus, DraftStatus[]> = {
  draft: ['awaiting_approval', 'approved', 'rejected', 'cancelled'],
  awaiting_approval: ['approved', 'rejected', 'cancelled', 'draft'],
  approved: ['queued', 'cancelled', 'draft'],
  queued: ['submitting', 'approved', 'failed', 'cancelled', 'outcome_unknown'],
  submitting: ['submitted', 'failed', 'outcome_unknown'],
  submitted: ['verified', 'failed', 'outcome_unknown', 'removed_or_unavailable'],
  verified: ['removed_or_unavailable'],
  failed: ['draft', 'queued', 'cancelled'],
  outcome_unknown: ['verified', 'failed', 'removed_or_unavailable'],
  removed_or_unavailable: [],
  rejected: ['draft'],
  cancelled: ['draft'],
};

const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  queued: ['running', 'cancelled', 'expired'],
  running: ['completed', 'failed', 'queued', 'expired'],
  completed: [],
  failed: ['queued'],
  cancelled: [],
  expired: [],
};

const PUBLICATION_TRANSITIONS: Record<PublicationStatus, PublicationStatus[]> = {
  pending: ['submitted', 'failed', 'outcome_unknown', 'removed_or_unavailable'],
  submitted: ['verified', 'failed', 'outcome_unknown', 'removed_or_unavailable'],
  verified: ['removed_or_unavailable'],
  failed: [],
  outcome_unknown: ['verified', 'failed', 'removed_or_unavailable'],
  removed_or_unavailable: [],
};

export function canTransitionDraft(from: DraftStatus, to: DraftStatus): boolean {
  return DRAFT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionPublication(from: PublicationStatus, to: PublicationStatus): boolean {
  return PUBLICATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertDraftTransition(from: DraftStatus, to: DraftStatus): void {
  if (!canTransitionDraft(from, to)) {
    throw new Error(`Invalid draft transition: ${from} → ${to}`);
  }
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransitionTask(from, to)) {
    throw new Error(`Invalid task transition: ${from} → ${to}`);
  }
}

export function assertPublicationTransition(from: PublicationStatus, to: PublicationStatus): void {
  if (!canTransitionPublication(from, to)) {
    throw new Error(`Invalid publication transition: ${from} → ${to}`);
  }
}

export function normalizeCommentText(input: string): string {
  return input
    .replace(/\u200b|\u200c|\u200d|\ufeff/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .toLowerCase();
}

export function textsMatch(a: string, b: string): boolean {
  const na = normalizeCommentText(a);
  const nb = normalizeCommentText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (shorter.length < 40) return false;
  return longer.includes(shorter);
}

export function isPublishableDraft(
  draft: { status: DraftStatus; body: string; approvedContentHash: string | null },
  currentHash: string,
): { ok: boolean; reason?: string } {
  if (draft.status !== 'approved') {
    return { ok: false, reason: `Draft is not approved (current status: ${draft.status}).` };
  }
  if (!draft.approvedContentHash || draft.approvedContentHash !== currentHash) {
    return { ok: false, reason: 'Draft content changed after approval. Approve the current version again.' };
  }
  return { ok: true };
}
