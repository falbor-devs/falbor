'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AutomationStatusSummary } from '~/lib/automation/types';

const POLL_INTERVAL_MS = 20_000;

export function useAutomationStatus(workspaceId: string): {
  status: AutomationStatusSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [status, setStatus] = useState<AutomationStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(
    async (force: boolean) => {
      if (!force && typeof document !== 'undefined' && document.hidden) return;

      try {
        const response = await fetch(
          `/api/automation/status?workspaceId=${encodeURIComponent(workspaceId)}`,
          { cache: 'no-store' },
        );
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            payload && typeof payload.error === 'string'
              ? payload.error
              : `Failed to load automation status (HTTP ${response.status}).`;
          throw new Error(message);
        }

        if (mountedRef.current) {
          setStatus(payload as AutomationStatusSummary);
          setError(null);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load automation status.');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setStatus(null);
    void load(true);

    const interval = setInterval(() => {
      void load(false);
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return { status, loading, error, refresh };
}
