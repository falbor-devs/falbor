import { useEffect } from 'react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';

export function useAgentSessionPolling(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      if (aiSidebarStore.isActive.get()) return;

      const workspaceId = aiSidebarStore.currentWorkspaceId.get();
      const sessionId = aiSidebarStore.currentSessionId.get();
      if (!workspaceId || !sessionId) return;

      import('~/lib/actions/agentSession').then(({ getAgentSessionEvents }) => {
        getAgentSessionEvents(workspaceId, sessionId).then((res: any) => {
          if (aiSidebarStore.isActive.get()) return;
          const evs = Array.isArray(res) ? res : res?.events || [];
          if (Array.isArray(evs) && evs.length > 0) {
            aiSidebarStore.mergeEvents(evs);
          }
        });
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen]);
}
