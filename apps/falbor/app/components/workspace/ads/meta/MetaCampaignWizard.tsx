'use client';

import React, { useState } from 'react';
import { Dialog, DialogRoot } from '~/components/ui/Dialog';
import { classNames } from '~/utils/classNames';
import { createMetaCampaign } from '~/lib/actions/metaAds';
import { WIZARD_STEPS } from './constants';
import { useCampaignDraft } from './hooks/useCampaignDraft';
import { validateStep } from './validation';
import { CampaignGoalStep } from './steps/CampaignGoalStep';
import { AudienceStep } from './steps/AudienceStep';
import { PlacementsStep } from './steps/PlacementsStep';
import { BudgetScheduleStep } from './steps/BudgetScheduleStep';
import { AdCreativeStep } from './steps/AdCreativeStep';
import { ReviewPublishStep } from './steps/ReviewPublishStep';
import type { WizardStep } from './types';

interface MetaCampaignWizardProps {
  workspaceId: string;
  adAccountId: string;
  currency: string | null;
  onClose: () => void;
  onCreated: (campaignName: string) => void;
}

export function MetaCampaignWizard({ workspaceId, adAccountId, currency, onClose, onCreated }: MetaCampaignWizardProps) {
  const { draft, step, loaded, status, restored, update, goToStep, discard, markComplete } = useCampaignDraft(
    workspaceId,
    adAccountId,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoredNotice, setRestoredNotice] = useState(true);
  const [showDiscard, setShowDiscard] = useState(false);

  const next = () => {
    const err = validateStep(step, draft);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step < 6) goToStep((step + 1) as WizardStep);
  };

  const back = () => {
    setError(null);
    if (step > 1) goToStep((step - 1) as WizardStep);
  };

  const handleSubmit = async () => {
    const err = validateStep(5, draft);
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createMetaCampaign(workspaceId, {
        name: draft.name.trim(),
        objective: draft.objective,
        specialAdCategories: draft.specialCategories,
        budgetType: draft.budgetType,
        budgetAmount: parseFloat(draft.budgetAmount),
        startDate: draft.startDate ? new Date(draft.startDate).toISOString() : undefined,
        endDate: draft.endDate ? new Date(draft.endDate).toISOString() : undefined,
        targeting: {
          countries: draft.countries,
          ageMin: draft.ageMin,
          ageMax: draft.ageMax,
          gender: draft.gender,
          interests: draft.interests,
        },
        placements: { publisherPlatforms: draft.platforms },
        optimizationGoal: draft.optimizationGoal,
        pageId: draft.pageId,
        instagramAccountId: draft.instagramAccountId || undefined,
        primaryText: draft.primaryText,
        headline: draft.headline,
        description: draft.description,
        linkUrl: draft.linkUrl.trim(),
        callToAction: draft.callToAction,
        mediaId: draft.media?.mediaId,
      });
      await markComplete();
      onCreated(draft.name.trim());
    } catch (err: any) {
      setError(err?.message || 'Failed to create campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscard = async () => {
    setShowDiscard(false);
    await discard();
    onClose();
  };

  return (
    <>
      <DialogRoot open onOpenChange={(open) => { if (!open) onClose(); }}>
        <Dialog
          className="!w-[960px] !max-w-[95vw] h-[88vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#0d0d10] border border-gray-200 dark:border-gray-800"
          showCloseButton={false}
          onBackdrop={onClose}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <img src="/icons/meta.svg" alt="" className="w-6 h-5" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Create Campaign</h2>
              <SaveBadge status={status} />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDiscard(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Discard draft
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                <i className="i-ph:x-bold" />
              </button>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-200 dark:border-gray-800 overflow-x-auto shrink-0">
            {WIZARD_STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => s.id < step && goToStep(s.id)}
                  className={classNames(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    step === s.id
                      ? 'bg-[#0866FF] text-white'
                      : s.id < step
                        ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 cursor-pointer'
                        : 'text-gray-400',
                  )}
                >
                  <i className={s.id < step ? 'i-ph:check-bold' : s.icon} />
                  {s.label}
                </button>
                {i < WIZARD_STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800 min-w-[12px]" />}
              </React.Fragment>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-5 space-y-4">
            {!loaded ? (
              <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                <i className="i-ph:spinner-gap animate-spin text-xl mr-2" /> Restoring your draft…
              </div>
            ) : (
              <>
                {restored && restoredNotice && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs flex items-center gap-2">
                    <i className="i-ph:clock-counter-clockwise shrink-0" />
                    <span>We restored your previous progress.</span>
                    <button className="ml-auto text-xs font-semibold hover:underline" onClick={() => setRestoredNotice(false)}>
                      Dismiss
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
                    <i className="i-ph:warning-circle-fill shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {step === 1 && <CampaignGoalStep draft={draft} update={update} />}
                {step === 2 && <AudienceStep draft={draft} update={update} workspaceId={workspaceId} />}
                {step === 3 && <PlacementsStep draft={draft} update={update} />}
                {step === 4 && <BudgetScheduleStep draft={draft} update={update} currency={currency} />}
                {step === 5 && (
                  <AdCreativeStep draft={draft} update={update} workspaceId={workspaceId} onError={setError} />
                )}
                {step === 6 && <ReviewPublishStep draft={draft} update={update} currency={currency} />}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
            <button
              onClick={step === 1 ? onClose : back}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step < 6 ? (
              <button
                onClick={next}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0866FF] hover:bg-[#0050CC] text-white text-sm font-medium transition-colors"
              >
                Continue <i className="i-ph:arrow-right-bold" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0866FF] hover:bg-[#0050CC] text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {submitting ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:rocket-launch-bold" />}
                {submitting ? 'Creating…' : 'Create Campaign'}
              </button>
            )}
          </div>
        </Dialog>
      </DialogRoot>

      {showDiscard && (
        <DialogRoot open onOpenChange={(open) => { if (!open) setShowDiscard(false); }}>
          <Dialog className="!w-[420px] !max-w-[92vw] p-6 bg-white dark:bg-[#0d0d10]" showCloseButton={false} onBackdrop={() => setShowDiscard(false)}>
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Discard draft?</h3>
              <p className="text-xs text-gray-500">
                This permanently deletes your saved progress. You will start from a blank campaign next time.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDiscard(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Keep draft
                </button>
                <button
                  onClick={handleDiscard}
                  className="px-4 py-2 rounded-lg text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          </Dialog>
        </DialogRoot>
      )}
    </>
  );
}

function SaveBadge({ status }: { status: 'idle' | 'loading' | 'saving' | 'saved' | 'error' }) {
  if (status === 'saving') {
    return (
      <span className="text-[11px] text-gray-400 flex items-center gap-1">
        <i className="i-ph:spinner-gap animate-spin" /> Saving…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1">
        <i className="i-ph:check-circle-fill" /> Saved
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="text-[11px] text-red-500 flex items-center gap-1">
        <i className="i-ph:warning-circle-fill" /> Draft not saved
      </span>
    );
  }
  return null;
}
