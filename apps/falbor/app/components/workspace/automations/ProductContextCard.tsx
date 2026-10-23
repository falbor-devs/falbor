'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAutomationProductContext } from '~/lib/actions/automation/connections';
import type { ProductContext } from '~/lib/automation/types';
import { LOAD_TIMEOUT_MS, TIMEOUT_MESSAGE, withTimeout } from './withTimeout';

const FIELD_LABELS: Record<string, string> = {
  productName: 'Product name',
  websiteUrl: 'Website',
  description: 'Description',
  category: 'Category',
  problem: 'Problem',
  positioning: 'Positioning',
  pricing: 'Pricing',
  targetAudience: 'Target audience',
  useCases: 'Use cases',
  features: 'Features',
  competitors: 'Competitors',
  keywords: 'Keywords',
};

function missingLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

function TextRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-32 shrink-0 text-gray-400 dark:text-gray-500">{label}</span>
      <span className="text-gray-700 dark:text-gray-300 break-words">{value && value.trim() ? value : '—'}</span>
    </div>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-32 shrink-0 text-gray-400 dark:text-gray-500">{label}</span>
      {items.length > 0 ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          {items.map((item) => (
            <span
              key={item}
              className="px-2 py-0.5 rounded-full bg-white dark:bg-[#0d0d10] border border-gray-200 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-gray-700 dark:text-gray-300">—</span>
      )}
    </div>
  );
}

export function ProductContextCard({
  workspaceId,
  onOpenWorkspaceOverview,
}: {
  workspaceId: string;
  onOpenWorkspaceOverview?: () => void;
}) {
  const [context, setContext] = useState<ProductContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await withTimeout(getAutomationProductContext(workspaceId), LOAD_TIMEOUT_MS, TIMEOUT_MESSAGE);
      setContext(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the product context.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <i className="i-ph:package text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Product context</h3>
        </div>
        {onOpenWorkspaceOverview && (
          <button
            onClick={onOpenWorkspaceOverview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 text-xs transition-colors"
          >
            <i className="i-ph:sliders" />
            Open workspace setup
          </button>
        )}
      </div>

      {loading && !context && (
        <div className="space-y-2">
          <div className="h-6 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
          <div className="h-6 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
          <div className="h-6 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
        </div>
      )}

      {error && !context && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
          <button className="ml-auto text-xs font-semibold hover:underline shrink-0" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      {context && (
        <>
          {context.missing.length > 0 && (
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400 text-xs flex items-start gap-2">
              <i className="i-ph:warning-circle shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium">Incomplete product context — the AI results may be generic.</p>
                <p className="mt-0.5">
                  Missing: {context.missing.map((field) => missingLabel(field)).join(', ')}.
                </p>
                <a
                  href={`/workspace/${workspaceId}`}
                  className="inline-flex items-center gap-1 mt-1.5 font-medium underline hover:no-underline"
                >
                  <i className="i-ph:arrow-right" />
                  Complete product setup
                </a>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <TextRow label="Product name" value={context.productName} />
            <TextRow label="Website" value={context.websiteUrl} />
            <TextRow label="Description" value={context.description} />
            <TextRow label="Category" value={context.category} />
            <TextRow label="Problem" value={context.problem} />
            <TextRow label="Positioning" value={context.positioning} />
            <TextRow label="Target audience" value={context.targetAudience} />
            <TextRow label="Pricing" value={context.pricing} />
            <ChipList label="Use cases" items={context.useCases} />
            <ChipList label="Features" items={context.features} />
            <ChipList label="Competitors" items={context.competitors} />
            <ChipList label="Keywords" items={context.keywords} />
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-800 pt-3">
            The AI uses exactly this context when analyzing discussions and writing drafts.
          </p>
        </>
      )}
    </section>
  );
}
