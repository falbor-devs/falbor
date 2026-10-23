'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { Switch } from '~/components/ui/Switch';
import { updateAgentConfig } from '~/lib/actions/automation/agentConfig';
import type { AgentConfig } from '~/lib/automation/agentCore';
import { withTimeout } from './withTimeout';

const PRIMARY_BUTTON =
  'flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0099FF] hover:bg-[#0084DE] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON =
  'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm transition-colors disabled:opacity-50';
const INPUT_CLASS =
  'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0d0d10] text-sm text-gray-900 dark:text-white disabled:opacity-50';

const SAVE_TIMEOUT_MS = process.env.NODE_ENV === 'development' ? 300_000 : 30_000;
const SAVE_TIMEOUT_MESSAGE =
  'The server took too long to save. It may still be compiling after a code change — click Save again.';

function parseSubreddits(value: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of value.split(/[\s,]+/)) {
    const cleaned = part.trim().replace(/^(?:https?:\/\/(?:www\.)?reddit\.com)?\/?r\//i, '').replace(/\/+$/, '');
    if (!/^[a-z0-9_]{2,21}$/i.test(cleaned)) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : ''}
        disabled={disabled}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          onChange(Number.isFinite(parsed) ? parsed : min);
        }}
        className={INPUT_CLASS}
      />
      {hint && <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        {description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export function AgentConfigDialog({
  workspaceId,
  open,
  onOpenChange,
  config,
  onSaved,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AgentConfig | null;
  onSaved: (config: AgentConfig) => void;
}) {
  const [subredditsText, setSubredditsText] = useState('');
  const [minRelevanceScore, setMinRelevanceScore] = useState(55);
  const [maxDiscussions, setMaxDiscussions] = useState(12);
  const [maxRuntimeMinutes, setMaxRuntimeMinutes] = useState(45);
  const [maxAiCalls, setMaxAiCalls] = useState(20);
  const [maxEstimatedCostUsd, setMaxEstimatedCostUsd] = useState(0.5);
  const [maxConsecutiveErrors, setMaxConsecutiveErrors] = useState(3);
  const [maxConsecutiveIrrelevant, setMaxConsecutiveIrrelevant] = useState(6);
  const [allowNavigation, setAllowNavigation] = useState(true);
  const [allowDraftGeneration, setAllowDraftGeneration] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current || !config) return;
    initializedRef.current = true;
    setSubredditsText(config.scopeSubreddits.join(', '));
    setMinRelevanceScore(config.minRelevanceScore);
    setMaxDiscussions(config.maxDiscussions);
    setMaxRuntimeMinutes(config.maxRuntimeMinutes);
    setMaxAiCalls(config.maxAiCalls);
    setMaxEstimatedCostUsd(config.maxEstimatedCostUsd);
    setMaxConsecutiveErrors(config.maxConsecutiveErrors);
    setMaxConsecutiveIrrelevant(config.maxConsecutiveIrrelevant);
    setAllowNavigation(config.allowNavigation);
    setAllowDraftGeneration(config.allowDraftGeneration);
    setError(null);
  }, [open, config]);

  const parsedSubreddits = parseSubreddits(subredditsText);

  if (!config) {
    return (
      <DialogRoot open={open} onOpenChange={onOpenChange}>
        <Dialog className="w-[560px] max-w-[92vw]">
          <div className="p-6">
            <DialogTitle>Agent configuration</DialogTitle>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-12">
              <i className="i-ph:spinner-gap animate-spin" />
              Loading configuration...
            </div>
          </div>
        </Dialog>
      </DialogRoot>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await withTimeout(
        updateAgentConfig(workspaceId, {
          scopeSubreddits: parsedSubreddits,
          minRelevanceScore,
          maxDiscussions,
          maxRuntimeMinutes,
          maxAiCalls,
          maxEstimatedCostUsd,
          allowNavigation,
          allowDraftGeneration,
          maxConsecutiveErrors,
          maxConsecutiveIrrelevant,
        }),
        SAVE_TIMEOUT_MS,
        SAVE_TIMEOUT_MESSAGE,
      );
      onSaved(saved);
      toast.success('Agent configuration saved.');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save the agent configuration.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <Dialog className="w-[560px] max-w-[92vw]">
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <DialogTitle>Agent configuration</DialogTitle>
            <DialogDescription>
              These limits are checked by Falbor on every step, so the agent stays inside your budget.
            </DialogDescription>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
              <i className="i-ph:warning-circle shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
              <button className="ml-auto text-xs font-semibold hover:underline shrink-0" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Subreddits to monitor</span>
            <input
              type="text"
              value={subredditsText}
              disabled={saving}
              placeholder="saas, startups, webdev"
              onChange={(event) => setSubredditsText(event.target.value)}
              className={INPUT_CLASS}
            />
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Comma-separated, up to 20. The agent rotates through their &quot;new&quot; listings.
            </span>
          </label>
          {parsedSubreddits.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {parsedSubreddits.map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded-full bg-white dark:bg-[#0d0d10] border border-gray-200 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300"
                >
                  r/{name}
                </span>
              ))}
            </div>
          )}
          {subredditsText.trim().length > 0 && parsedSubreddits.length === 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400">
              No valid subreddit names detected yet. Names may contain letters, numbers and underscores (2–21
              characters).
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberField
              label="Minimum relevance score"
              hint="0–100; lower drafts less relevant discussions."
              value={minRelevanceScore}
              min={0}
              max={100}
              onChange={setMinRelevanceScore}
              disabled={saving}
            />
            <NumberField
              label="Max discussions to inspect"
              hint="1–100 per session."
              value={maxDiscussions}
              min={1}
              max={100}
              onChange={setMaxDiscussions}
              disabled={saving}
            />
            <NumberField
              label="Max runtime (minutes)"
              hint="5–480."
              value={maxRuntimeMinutes}
              min={5}
              max={480}
              onChange={setMaxRuntimeMinutes}
              disabled={saving}
            />
            <NumberField
              label="Max AI calls"
              hint="1–200 per session."
              value={maxAiCalls}
              min={1}
              max={200}
              onChange={setMaxAiCalls}
              disabled={saving}
            />
            <NumberField
              label="Max estimated cost (USD)"
              hint="0.05–20 per session."
              value={maxEstimatedCostUsd}
              min={0.05}
              max={20}
              step={0.05}
              onChange={setMaxEstimatedCostUsd}
              disabled={saving}
            />
            <NumberField
              label="Max consecutive errors"
              hint="1–10; the agent pauses when this is reached."
              value={maxConsecutiveErrors}
              min={1}
              max={10}
              onChange={setMaxConsecutiveErrors}
              disabled={saving}
            />
            <NumberField
              label="Max consecutive irrelevant"
              hint="1–50; the agent pauses when this is reached."
              value={maxConsecutiveIrrelevant}
              min={1}
              max={50}
              onChange={setMaxConsecutiveIrrelevant}
              disabled={saving}
            />
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4 space-y-4">
            <ToggleRow
              label="Allow navigation"
              description="The agent may open subreddit listings and discussion pages in your Reddit tab. It never navigates away from Reddit."
              checked={allowNavigation}
              onChange={setAllowNavigation}
              disabled={saving}
            />
            <ToggleRow
              label="Allow draft generation"
              description="Generates reply drafts for relevant discussions. Drafts always await your approval before anything else happens."
              checked={allowDraftGeneration}
              onChange={setAllowDraftGeneration}
              disabled={saving}
            />
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Automatic posting is disabled: Reddit&apos;s policies do not currently authorize automated comments, so
            every draft needs your review. Approved drafts are prefilled into the Reddit editor and you click
            Comment yourself.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} disabled={saving} className={SECONDARY_BUTTON}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className={PRIMARY_BUTTON}>
              {saving ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:floppy-disk" />}
              Save configuration
            </button>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
