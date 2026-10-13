import { useCallback, useEffect, useRef, useState } from 'react';
import type { BuildState } from '~/lib/workspace-build/stages';

const POLL_INTERVAL_MS = 3000;

export function useWorkspaceBuild(workspaceId: string | undefined) {
  const [build, setBuild] = useState<BuildState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const running = useRef(false);

  const startRun = useCallback(() => {
    if (!workspaceId || running.current) {
      return;
    }

    running.current = true;
    fetch(`/api/workspace/${workspaceId}/build/run`, { method: 'POST' })
      .catch(() => undefined)
      .finally(() => {
        running.current = false;
      });
  }, [workspaceId]);

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      return null;
    }

    try {
      const response = await fetch(`/api/workspace/${workspaceId}/build`, { cache: 'no-store' });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { build: BuildState | null };
      setBuild(data.build);

      return data.build;
    } catch {
      return null;
    } finally {
      setLoaded(true);
    }
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const current = await refresh();

      if (!cancelled && current && current.status !== 'completed' && current.status !== 'failed') {
        startRun();
        timer.current = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    setBuild(null);
    setLoaded(false);
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, [refresh, startRun]);

  const retry = useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    await fetch(`/api/workspace/${workspaceId}/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retry' }),
    });

    clearTimeout(timer.current);
    const poll = async () => {
      const current = await refresh();

      if (current && current.status !== 'completed' && current.status !== 'failed') {
        startRun();
        timer.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };
    poll();
  }, [workspaceId, refresh, startRun]);

  const isBuilding = Boolean(build) && build?.status !== 'completed';

  return { build, loaded, isBuilding, retry };
}
