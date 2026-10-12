import { useState, useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import {
  getAgentSessionsList,
  createNewAgentSession,
  getAgentSessionEvents,
  renameAgentSession,
  deleteAgentSession,
} from '~/lib/actions/agentSession';

export interface AgentSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt?: Date;
  events?: any;
}

export function useAgentSessions() {
  const workspaceId = useStore(aiSidebarStore.currentWorkspaceId);
  const currentSessionId = useStore(aiSidebarStore.currentSessionId);
  const currentSessionTitle = useStore(aiSidebarStore.currentSessionTitle);

  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const sessionCacheRef = useRef<Map<string, any[]>>(new Map());

  useEffect(() => {
    if (workspaceId) {
      getAgentSessionsList(workspaceId).then((list) => {
        setSessions(list);
        list.forEach((s) => {
          if (s.events && Array.isArray(s.events)) {
            sessionCacheRef.current.set(s.id, s.events);
          }
        });
      });
    }
  }, [workspaceId, currentSessionId]);

  const refreshSessions = async () => {
    if (!workspaceId) return [];
    try {
      const list = await getAgentSessionsList(workspaceId);
      setSessions(list);
      list.forEach((s) => {
        if (s.events && Array.isArray(s.events)) {
          sessionCacheRef.current.set(s.id, s.events);
        }
      });
      return list;
    } catch (err) {
      console.error('Failed to refresh sessions:', err);
      return [];
    }
  };

  const handleCreateNewChat = async () => {
    if (!workspaceId) return;
    try {
      const newSession = await createNewAgentSession(workspaceId);
      if (newSession) {
        sessionCacheRef.current.set(newSession.id, []);
        aiSidebarStore.setSession(newSession.id, newSession.title, []);
        const list = await getAgentSessionsList(workspaceId);
        setSessions(list);
      }
    } catch (err) {
      console.error('Failed to create new session:', err);
    }
  };

  const handleSelectSession = async (sessionId: string, sessionTitle: string) => {
    if (sessionId === currentSessionId || !workspaceId) return;

    const cached = sessionCacheRef.current.get(sessionId);
    if (cached !== undefined) {
      aiSidebarStore.setSession(sessionId, sessionTitle, cached);
    } else {
      aiSidebarStore.setSession(sessionId, sessionTitle, []);
    }

    try {
      const res = await getAgentSessionEvents(workspaceId, sessionId);
      const evs = Array.isArray(res) ? res : res?.events || [];
      sessionCacheRef.current.set(sessionId, evs);
      if (aiSidebarStore.currentSessionId.get() === sessionId) {
        aiSidebarStore.events.set(evs);
      }
    } catch (err) {
      console.error('Failed to load session events:', err);
    }
  };

  const handleSaveRename = async (titleInput: string) => {
    if (!currentSessionId || !titleInput.trim()) return;
    const newTitle = titleInput.trim();
    aiSidebarStore.setSession(currentSessionId, newTitle, aiSidebarStore.events.get());
    try {
      await renameAgentSession(currentSessionId, newTitle);
      if (workspaceId) {
        const list = await getAgentSessionsList(workspaceId);
        setSessions(list);
      }
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
  };

  const handleDeleteSession = async () => {
    if (!currentSessionId || !workspaceId) return;
    try {
      await deleteAgentSession(currentSessionId);
      sessionCacheRef.current.delete(currentSessionId);
      const remaining = await getAgentSessionsList(workspaceId);
      setSessions(remaining);
      if (remaining.length > 0) {
        handleSelectSession(remaining[0].id, remaining[0].title);
      } else {
        await handleCreateNewChat();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return {
    sessions,
    workspaceId,
    currentSessionId,
    currentSessionTitle,
    handleCreateNewChat,
    handleSelectSession,
    handleSaveRename,
    handleDeleteSession,
    refreshSessions,
  };
}
