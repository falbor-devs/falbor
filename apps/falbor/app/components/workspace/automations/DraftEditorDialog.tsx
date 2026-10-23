'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ConfirmationDialog, Dialog, DialogRoot } from '~/components/ui/Dialog';
import { classNames } from '~/utils/classNames';
import { DRAFT_MAX_BODY_CHARS } from '~/lib/automation/constants';
import {
  approveDraft,
  cancelDraft,
  regenerateDraft,
  rejectDraft,
  requestPublication,
  saveDraft,
  type DraftListItem,
} from '~/lib/actions/automation/drafts';
import { StatusPill, type StatusTone } from './StatusPill';
import { formatRelativeTime } from './format';

interface DraftEditorDialogProps {
  workspaceId: string;
  draft: DraftListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extensionConnected: boolean;
  onChanged: () => void;
}

type PendingKind = 'save' | 'regenerate' | 'approve' | 'publish' | 'reject' | 'cancel';

const PRIMARY_BUTTON =
  'flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0099FF] hover:bg-[#0084DE] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON =
  'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed';

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'warn' },
  approved: { label: 'Approved', tone: 'good' },
  queued: { label: 'Queued for extension', tone: 'info' },
  submitting: { label: 'Submitting', tone: 'info' },
  submitted: { label: 'Submitted (unverified)', tone: 'info' },
  verified: { label: 'Verified', tone: 'good' },
  failed: { label: 'Failed', tone: 'bad' },
  outcome_unknown: { label: 'Outcome unknown', tone: 'warn' },
  removed_or_unavailable: { label: 'Removed/unavailable', tone: 'bad' },
  rejected: { label: 'Rejected', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

const STATUS_PANELS: Record<string, { tone: StatusTone; text: string }> = {
  queued: {
    tone: 'info',
    text: "Queued. The extension will open the discussion and prefill the exact approved comment; you click Reddit's Comment button yourself. Falbor detects the result.",
  },
  submitting: {
    tone: 'info',
    text: 'The extension is submitting this comment now. Leave this draft untouched until it finishes.',
  },
  submitted: {
    tone: 'info',
    text: 'Submitted — the extension reported that it posted the comment. Falbor still needs to verify it; verification runs automatically.',
  },
  verified: {
    tone: 'good',
    text: 'Verified — the comment is live on Reddit. Verification method comes from Reddit API when available.',
  },
  failed: {
    tone: 'bad',
    text: 'Publication failed. Regenerate a new version from the opportunity, or cancel this draft, then try again.',
  },
  outcome_unknown: {
    tone: 'warn',
    text: 'Falbor could not confirm whether Reddit accepted it. Use Performance → Reconcile before attempting anything again — do not repost blindly.',
  },
  removed_or_unavailable: {
    tone: 'bad',
    text: 'The comment is no longer available — Reddit may have removed it or the discussion is gone.',
  },
  rejected: {
    tone: 'neutral',
    text: 'This draft was rejected and will not be published. You can regenerate a new draft from the opportunity.',
  },
  cancelled: {
    tone: 'neutral',
    text: 'This draft was cancelled and will not be published.',
  },
};

const PANEL_BY_TONE: Record<StatusTone, string> = {
  neutral: 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114]',
  good: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30',
  info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30',
  warn: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30',
  bad: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30',
};

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Something went wrong.';
}

export function DraftEditorDialog({
  workspaceId,
  draft,
  open,
  onOpenChange,
  extensionConnected,
  onChanged,
}: DraftEditorDialogProps) {
  const [localDraft, setLocalDraft] = useState<DraftListItem | null>(draft);
  const [body, setBody] = useState(draft?.body ?? '');
  const [pending, setPending] = useState<PendingKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLocalDraft(draft);
    setBody(draft?.body ?? '');
    setPending(null);
    setError(null);
    setInstructionsOpen(false);
    setInstructions('');
    setSavedNotice(false);
    setShowApprove(false);
    setShowReject(false);
    setShowCancel(false);
    setShowDiscard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft?.id]);

  if (!localDraft) return null;

  const status = localDraft.status;
  const dirty = body !== localDraft.body;
  const statusInfo = STATUS_META[status] ?? { label: status, tone: 'neutral' as StatusTone };
  const statusPanel = STATUS_PANELS[status];
  const canApprove = status === 'draft' || status === 'awaiting_approval';
  const canReject = status === 'draft' || status === 'awaiting_approval';
  const canCancel = ['draft', 'awaiting_approval', 'approved', 'queued', 'failed', 'outcome_unknown'].includes(status);
  const busy = pending !== null;

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    if (dirty) {
      setShowDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (pending || !dirty) return;
    setPending('save');
    setError(null);
    setSavedNotice(false);
    try {
      const wasApproved = localDraft.status === 'approved';
      const updated = await saveDraft(workspaceId, localDraft.id, body);
      setLocalDraft(updated);
      setBody(updated.body);
      setSavedNotice(wasApproved);
      onChanged();
      toast.success('Draft saved.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(null);
    }
  };

  const handleRegenerate = async (useInstructions: boolean) => {
    if (pending) return;
    setPending('regenerate');
    setError(null);
    try {
      const revisionInstructions = useInstructions && instructions.trim() ? instructions.trim() : undefined;
      const updated = await regenerateDraft(workspaceId, localDraft.id, revisionInstructions);
      setLocalDraft(updated);
      setBody(updated.body);
      setInstructions('');
      setInstructionsOpen(false);
      setSavedNotice(false);
      onChanged();
      toast.success('Draft regenerated.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(null);
    }
  };

  const handleApprove = async () => {
    if (pending) return;
    setPending('approve');
    setError(null);
    try {
      const updated = await approveDraft(workspaceId, localDraft.id);
      setLocalDraft(updated);
      setShowApprove(false);
      onChanged();
      toast.success('Draft approved — ready to publish.');
    } catch (err) {
      setShowApprove(false);
      setError(messageOf(err));
    } finally {
      setPending(null);
    }
  };

  const handlePublish = async () => {
    if (pending) return;
    setPending('publish');
    setError(null);
    try {
      const result = await requestPublication(workspaceId, localDraft.id);
      setLocalDraft(result.draft);
      onChanged();
      toast.success('Publication queued — the extension will prefill the comment.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(null);
    }
  };

  const handleReject = async () => {
    if (pending) return;
    setPending('reject');
    setError(null);
    try {
      const updated = await rejectDraft(workspaceId, localDraft.id);
      setLocalDraft(updated);
      setShowReject(false);
      onChanged();
      toast.success('Draft rejected.');
    } catch (err) {
      setShowReject(false);
      setError(messageOf(err));
    } finally {
      setPending(null);
    }
  };

  const handleCancel = async () => {
    if (pending) return;
    setPending('cancel');
    setError(null);
    try {
      const updated = await cancelDraft(workspaceId, localDraft.id);
      setLocalDraft(updated);
      setShowCancel(false);
      onChanged();
      toast.success('Draft cancelled.');
    } catch (err) {
      setShowCancel(false);
      setError(messageOf(err));
    } finally {
      setPending(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success('Draft text copied to clipboard.');
    } catch {
      toast.error('Could not copy the draft text.');
    }
  };

  return (
    <>
      <DialogRoot open={open} onOpenChange={handleOpenChange}>
        <Dialog
          className="!w-[820px] !max-w-[94vw] !max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-[#0d0d10]"
          onBackdrop={() => handleOpenChange(false)}
        >
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Draft comment</h2>
                {localDraft.opportunity ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    For “{localDraft.opportunity.title}” in r/{localDraft.opportunity.subreddit}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Standalone draft</p>
                )}
              </div>
              <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
                <i className="i-ph:warning-circle-fill shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
                <button type="button" className="text-xs font-semibold hover:underline" onClick={() => setError(null)}>
                  Dismiss
                </button>
              </div>
            )}

            <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Target</h3>
              {localDraft.opportunity ? (
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {localDraft.opportunity.title}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      r/{localDraft.opportunity.subreddit}
                      {localDraft.opportunity.externalId ? ` · ${localDraft.opportunity.externalId}` : ''}
                    </p>
                  </div>
                  <a
                    href={localDraft.opportunity.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={SECONDARY_BUTTON}
                  >
                    Open thread <i className="i-ph:arrow-square-out" />
                  </a>
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The discussion for this draft no longer exists, so it cannot be published.
                </p>
              )}
              <p className="text-[11px] text-gray-400">
                Post exactly in this thread. You will submit it yourself in Reddit; Falbor only prefills it.
              </p>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Comment text</h3>
                <span className={classNames('text-[11px]', body.length >= DRAFT_MAX_BODY_CHARS ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400')}>
                  {body.length} / {DRAFT_MAX_BODY_CHARS}
                </span>
              </div>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                disabled={busy}
                maxLength={DRAFT_MAX_BODY_CHARS}
                rows={12}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-3 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-[#0099FF] resize-y disabled:opacity-60"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void handleSave()} disabled={!dirty || busy} className={PRIMARY_BUTTON}>
                  {pending === 'save' ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:floppy-disk" />}
                  Save
                </button>
                <button type="button" onClick={() => void handleRegenerate(false)} disabled={busy} className={SECONDARY_BUTTON}>
                  {pending === 'regenerate' && !instructionsOpen ? (
                    <i className="i-ph:spinner-gap animate-spin" />
                  ) : (
                    <i className="i-ph:arrows-clockwise" />
                  )}
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => setInstructionsOpen((value) => !value)}
                  disabled={busy}
                  className={SECONDARY_BUTTON}
                >
                  <i className="i-ph:sliders-horizontal" />
                  {instructionsOpen ? 'Hide instructions' : 'Custom instructions'}
                </button>
                <button type="button" onClick={() => void handleCopy()} className={SECONDARY_BUTTON}>
                  <i className="i-ph:copy" />
                  Copy text
                </button>
              </div>
              {instructionsOpen && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-3 space-y-2">
                  <textarea
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    disabled={busy}
                    rows={2}
                    placeholder="Optional revision instructions — e.g. “shorter and less promotional”"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#18181b] p-2 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-[#0099FF] resize-y disabled:opacity-60"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInstructions('');
                        setInstructionsOpen(false);
                      }}
                      disabled={busy}
                      className={SECONDARY_BUTTON}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRegenerate(true)}
                      disabled={busy}
                      className={PRIMARY_BUTTON}
                    >
                      {pending === 'regenerate' ? (
                        <i className="i-ph:spinner-gap animate-spin" />
                      ) : (
                        <i className="i-ph:arrows-clockwise" />
                      )}
                      Regenerate with instructions
                    </button>
                  </div>
                </div>
              )}
              {savedNotice && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs flex items-start gap-2">
                  <i className="i-ph:info shrink-0 mt-0.5" />
                  <span>Content changed — approval was reset if it was approved.</span>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">AI reasoning</h3>
              {localDraft.aiReasoning ? (
                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{localDraft.aiReasoning}</p>
              ) : (
                <p className="text-xs text-gray-400">No AI reasoning recorded.</p>
              )}
              {localDraft.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">Warnings</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                    {localDraft.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                <span>Model: {localDraft.model ?? '—'}</span>
                <span>Generation: {localDraft.generation}</span>
                {localDraft.productMentioned && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 font-medium">
                    Mentions product
                  </span>
                )}
                {localDraft.updatedAt && <span>Updated {formatRelativeTime(localDraft.updatedAt)}</span>}
              </div>
            </section>

            {canApprove && (
              <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Approval</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Approval binds to this exact text and this exact thread. If you edit the text afterwards, the approval
                  is reset and you must approve again.
                </p>
                <button
                  type="button"
                  onClick={() => setShowApprove(true)}
                  disabled={busy || dirty}
                  title={dirty ? 'Save your changes before approving' : undefined}
                  className={PRIMARY_BUTTON}
                >
                  <i className="i-ph:seal-check" />
                  Approve for publication
                </button>
                {dirty && (
                  <p className="text-[11px] text-gray-400">Save your changes to enable approval.</p>
                )}
              </section>
            )}

            {status === 'approved' && (
              <section className={classNames('rounded-xl border p-4 space-y-3', PANEL_BY_TONE.good)}>
                <StatusPill label="Approved — ready to publish" tone="good" />
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  The approved text is frozen and will be prefilled exactly as it is. Editing it resets the approval.
                </p>
                <button
                  type="button"
                  onClick={() => void handlePublish()}
                  disabled={busy || !extensionConnected || dirty}
                  title={!extensionConnected ? 'Connect your browser extension to publish' : undefined}
                  className={PRIMARY_BUTTON}
                >
                  {pending === 'publish' ? (
                    <i className="i-ph:spinner-gap animate-spin" />
                  ) : (
                    <i className="i-ph:paper-plane-tilt" />
                  )}
                  Send to browser extension
                </button>
                {!extensionConnected && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Connect your browser extension to publish.
                  </p>
                )}
                {extensionConnected && dirty && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Save your changes first — saving will reset the approval.
                  </p>
                )}
              </section>
            )}

            {statusPanel && (
              <section className={classNames('rounded-xl border p-4 space-y-2', PANEL_BY_TONE[statusPanel.tone])}>
                <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
                <p className="text-xs text-gray-600 dark:text-gray-300">{statusPanel.text}</p>
              </section>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
              {canReject && (
                <button
                  type="button"
                  onClick={() => setShowReject(true)}
                  disabled={busy}
                  className={classNames(SECONDARY_BUTTON, 'hover:text-red-500 dark:hover:text-red-400')}
                >
                  <i className="i-ph:x-circle" />
                  Reject
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancel(true)}
                  disabled={busy}
                  className={SECONDARY_BUTTON}
                >
                  <i className="i-ph:prohibit" />
                  Cancel draft
                </button>
              )}
              <button type="button" onClick={() => handleOpenChange(false)} className={classNames(SECONDARY_BUTTON, 'ml-auto')}>
                Close
              </button>
            </div>
          </div>
        </Dialog>
      </DialogRoot>

      <ConfirmationDialog
        isOpen={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={() => void handleApprove()}
        isLoading={pending === 'approve'}
        title="Approve this exact text?"
        description="Approval binds to THIS exact text and this exact thread. If you edit the text later, the approval is reset and you must approve again. The extension will prefill this comment for you to submit."
        confirmLabel="Approve for publication"
      />

      <ConfirmationDialog
        isOpen={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={() => void handleReject()}
        isLoading={pending === 'reject'}
        variant="destructive"
        title="Reject this draft?"
        description="The draft will not be published. You can still regenerate a new draft from the opportunity later."
        confirmLabel="Reject"
      />

      <ConfirmationDialog
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={() => void handleCancel()}
        isLoading={pending === 'cancel'}
        variant="destructive"
        title="Cancel this draft?"
        description="Any queued publication will be stopped. This cannot be undone."
        confirmLabel="Cancel draft"
      />

      <ConfirmationDialog
        isOpen={showDiscard}
        onClose={() => setShowDiscard(false)}
        onConfirm={() => {
          setShowDiscard(false);
          setBody(localDraft.body);
          onOpenChange(false);
        }}
        variant="destructive"
        title="Discard unsaved changes?"
        description="Your edits have not been saved and will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
      />
    </>
  );
}
