'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteMetaCampaignDraft,
  getMetaCampaignDraft,
  saveMetaCampaignDraft,
} from '~/lib/actions/metaAds';
import { clampStep, createEmptyDraft } from '../constants';
import type { CampaignDraftState, WizardStep } from '../types';

export type DraftSaveStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY = 800;

export interface UseCampaignDraftResult {
  draft: CampaignDraftState;
  step: WizardStep;
  loaded: boolean;
  status: DraftSaveStatus;
  restored: boolean;
  update: (patch: Partial<CampaignDraftState>) => void;
  goToStep: (step: WizardStep) => void;
  discard: () => Promise<void>;
  markComplete: () => Promise<void>;
}

/**
 * Persists the campaign wizard state per (workspace, user) with debounced
 * autosave and restores it on reopen. Saves are serialized so an older request
 * can never overwrite newer changes.
 */
export function useCampaignDraft(workspaceId: string, adAccountId: string): UseCampaignDraftResult {
  const [draft, setDraft] = useState<CampaignDraftState>(createEmptyDraft);
  const [step, setStep] = useState<WizardStep>(1);
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState(false);
  const [status, setStatus] = useState<DraftSaveStatus>('loading');

  const draftRef = useRef(draft);
  const stepRef = useRef(step);
  const loadedRef = useRef(false);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const completedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(async () => {
    if (!loadedRef.current || completedRef.current) return;
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }

    savingRef.current = true;
    pendingRef.current = false;
    dirtyRef.current = false;
    setStatus('saving');

    const stateSnapshot = draftRef.current;
    const stepSnapshot = stepRef.current;

    try {
      await saveMetaCampaignDraft(workspaceId, {
        step: stepSnapshot,
        state: stateSnapshot,
        adAccountId,
      });
      if (!completedRef.current) setStatus('saved');
    } catch {
      if (!completedRef.current) {
        setStatus('error');
        dirtyRef.current = true;
      }
    } finally {
      savingRef.current = false;
      if (pendingRef.current && !completedRef.current) void flushSave();
    }
  }, [workspaceId, adAccountId]);

  const scheduleSave = useCallback(
    (immediate = false) => {
      if (!loadedRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (immediate) {
        void flushSave();
        return;
      }
      debounceRef.current = setTimeout(() => void flushSave(), AUTOSAVE_DELAY);
    },
    [flushSave],
  );

  const update = useCallback(
    (patch: Partial<CampaignDraftState>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        draftRef.current = next;
        return next;
      });
      dirtyRef.current = true;
      scheduleSave();
    },
    [scheduleSave],
  );

  const goToStep = useCallback(
    (next: WizardStep) => {
      setStep(next);
      stepRef.current = next;
      dirtyRef.current = true;
      scheduleSave(true);
    },
    [scheduleSave],
  );

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const saved = await getMetaCampaignDraft(workspaceId);
        if (cancelled) return;
        if (saved) {
          const merged = { ...createEmptyDraft(), ...(saved.state as CampaignDraftState) };
          draftRef.current = merged;
          stepRef.current = clampStep(saved.step);
          setDraft(merged);
          setStep(stepRef.current);
          setRestored(true);
        }
      } catch {
        if (!cancelled) setStatus('error');
      } finally {
        if (!cancelled) {
          loadedRef.current = true;
          setLoaded(true);
          setStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (dirtyRef.current && loadedRef.current) void flushSave();
    };
  }, [flushSave]);

  const discard = useCallback(async () => {
    completedRef.current = true;
    dirtyRef.current = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    while (savingRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await deleteMetaCampaignDraft(workspaceId);
    const empty = createEmptyDraft();
    draftRef.current = empty;
    stepRef.current = 1;
    setDraft(empty);
    setStep(1);
    setRestored(false);
    setStatus('idle');
  }, [workspaceId]);

  const markComplete = useCallback(async () => {
    completedRef.current = true;
    dirtyRef.current = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Let any in-flight save settle so it cannot recreate the draft after deletion.
    while (savingRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    try {
      await deleteMetaCampaignDraft(workspaceId);
    } catch {
      // A failed cleanup must not block the success path.
    }
  }, [workspaceId]);

  return { draft, step, loaded, status, restored, update, goToStep, discard, markComplete };
}
