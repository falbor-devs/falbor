'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Switch } from '~/components/ui/Switch';
import { StatusPill } from './StatusPill';
import { getAutomationSettings, updateAutomationSettings } from '~/lib/actions/automation/settings';
import type { AutomationSettingsView } from '~/lib/actions/automation/settings';
import type { AutomationStatusSummary } from '~/lib/automation/types';

const PRIMARY_BUTTON =
  'flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0099FF] hover:bg-[#0084DE] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const INPUT_CLASS =
  'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0d0d10] text-sm text-gray-900 dark:text-white disabled:opacity-50';

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseCommaList(value: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of value.split(',')) {
    const item = part.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
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

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
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

export function AutomationSettingsPanel({
  workspaceId,
  status,
  onChanged,
}: {
  workspaceId: string;
  status: AutomationStatusSummary;
  onChanged: () => void;
}) {
  const [settings, setSettings] = useState<AutomationSettingsView | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [autoDiscovery, setAutoDiscovery] = useState(false);
  const [queriesPerRun, setQueriesPerRun] = useState(5);
  const [maxDraftsPerDay, setMaxDraftsPerDay] = useState(10);
  const [maxPublicationsPerDay, setMaxPublicationsPerDay] = useState(5);
  const [keywordsText, setKeywordsText] = useState('');
  const [blockedText, setBlockedText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyView = useCallback((view: AutomationSettingsView) => {
    setSettings(view);
    setEnabled(view.enabled);
    setAutoDiscovery(view.autoDiscovery);
    setQueriesPerRun(view.queriesPerRun);
    setMaxDraftsPerDay(view.maxDraftsPerDay);
    setMaxPublicationsPerDay(view.maxPublicationsPerDay);
    setKeywordsText(view.keywords.join(', '));
    setBlockedText(view.blockedSubreddits.join(', '));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const view = await getAutomationSettings(workspaceId);
      applyView(view);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automation settings.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, applyView]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const view = await updateAutomationSettings(workspaceId, {
        enabled,
        autoDiscovery,
        queriesPerRun: clampNumber(queriesPerRun, 1, 8, settings?.queriesPerRun ?? 5),
        maxDraftsPerDay: clampNumber(maxDraftsPerDay, 1, 50, settings?.maxDraftsPerDay ?? 10),
        maxPublicationsPerDay: clampNumber(maxPublicationsPerDay, 1, 20, settings?.maxPublicationsPerDay ?? 5),
        keywords: parseCommaList(keywordsText),
        blockedSubreddits: parseCommaList(blockedText).map((item) => item.replace(/^\/?r\//i, '').toLowerCase()),
      });
      applyView(view);
      toast.success('Automation settings saved.');
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save automation settings.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const controlsDisabled = saving || loading;
  const parsedKeywords = parseCommaList(keywordsText);

  if (loading && !settings) {
    return (
      <div className="space-y-3">
        <div className="h-16 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
        <div className="h-16 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
        <div className="h-16 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Automation settings</h3>
          <StatusPill label={enabled ? 'Enabled' : 'Disabled'} tone={enabled ? 'good' : 'neutral'} />
        </div>
        <button onClick={handleSave} disabled={controlsDisabled} className={PRIMARY_BUTTON}>
          {saving ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:floppy-disk" />}
          Save settings
        </button>
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

      {status.reddit.status !== 'connected' && (
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle shrink-0 mt-0.5" />
          <span>Reddit is not connected. Discovery and publication tasks cannot run until it is connected.</span>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4 space-y-4">
        <ToggleRow
          label="Automation enabled"
          description="Allows discovery, analysis, and publication tasks to run for this workspace."
          checked={enabled}
          onChange={setEnabled}
          disabled={controlsDisabled}
        />
        <ToggleRow
          label="Automatic discovery"
          description="Automatic discovery requires a configured scheduler (cron); the manual Run discovery button always works."
          checked={autoDiscovery}
          onChange={setAutoDiscovery}
          disabled={controlsDisabled}
        />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <NumberField
          label="Queries per run"
          hint="1–8"
          value={queriesPerRun}
          min={1}
          max={8}
          onChange={setQueriesPerRun}
          disabled={controlsDisabled}
        />
        <NumberField
          label="Max drafts per day"
          hint="1–50"
          value={maxDraftsPerDay}
          min={1}
          max={50}
          onChange={setMaxDraftsPerDay}
          disabled={controlsDisabled}
        />
        <NumberField
          label="Max publications per day"
          hint="1–20"
          value={maxPublicationsPerDay}
          min={1}
          max={20}
          onChange={setMaxPublicationsPerDay}
          disabled={controlsDisabled}
        />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4 space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">Keywords</span>
          <input
            type="text"
            value={keywordsText}
            disabled={controlsDisabled}
            placeholder="keyword one, keyword two, keyword three"
            onChange={(event) => setKeywordsText(event.target.value)}
            className={INPUT_CLASS}
          />
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            Comma-separated. Added to the discovery queries alongside the product context.
          </span>
        </label>
        {parsedKeywords.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {parsedKeywords.map((keyword) => (
              <span
                key={keyword.toLowerCase()}
                className="px-2 py-0.5 rounded-full bg-white dark:bg-[#0d0d10] border border-gray-200 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">Blocked subreddits</span>
          <input
            type="text"
            value={blockedText}
            disabled={controlsDisabled}
            placeholder="subreddit-one, subreddit-two"
            onChange={(event) => setBlockedText(event.target.value)}
            className={INPUT_CLASS}
          />
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            Comma-separated; discovered discussions from these subreddits are ignored. Values are stored lowercased.
          </span>
        </label>
      </div>

      <p className="text-[11px] text-gray-400 dark:text-gray-500">
        AI analysis and draft generation consume model usage — limits protect against unexpected spend.
      </p>
    </section>
  );
}
