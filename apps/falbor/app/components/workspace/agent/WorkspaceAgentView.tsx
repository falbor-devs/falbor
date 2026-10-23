"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { getAgentsList, updateAgent } from "~/lib/actions/agent";
import { stopAgent } from "~/lib/actions/agentChat";
import { getAgentSessionEvents } from "~/lib/actions/agentSession";
import { cancelAgentTask, listAgentTasks } from "~/lib/actions/agentTasks";
import { aiSidebarStore } from "~/lib/stores/aiSidebar";
import { AgentChatInput } from "~/components/ai-side/AgentChatInput";
import { AgentMessages } from "~/components/ai-side/AgentMessages";
import { AgentSidebar } from "./AgentSidebar";
import { AgentDetailPanel, type AgentSettingsDraft } from "./AgentDetailPanel";
import { getAgentIcon } from "./types";

interface WorkspaceAgentViewProps {
  workspaceId: string;
  initialAgentId?: string;
}

export function WorkspaceAgentView({
  workspaceId,
  initialAgentId,
}: WorkspaceAgentViewProps) {
  const router = useRouter();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    initialAgentId || null,
  );
  const [events, setEvents] = useState(aiSidebarStore.events.get());
  const [isActive, setIsActive] = useState(aiSidebarStore.isActive.get());
  const [sessionReady, setSessionReady] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, "running" | "offline">
  >({});
  const [agentTasks, setAgentTasks] = useState<any[]>([]);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<AgentSettingsDraft | null>(
    null,
  );

  useEffect(
    () => aiSidebarStore.events.subscribe((next) => setEvents([...next])),
    [],
  );
  useEffect(() => aiSidebarStore.isActive.subscribe(setIsActive), []);

  useEffect(() => {
    let cancelled = false;
    let refreshSequence = 0;
    const refreshStatuses = async () => {
      const sequence = ++refreshSequence;
      const tasks = await listAgentTasks(workspaceId);
      if (cancelled || sequence !== refreshSequence) return;
      setAgentTasks(tasks);
      const next: Record<string, "running" | "offline"> = {};
      const now = Date.now();
      for (const task of tasks) {
        if (!task.assignedAgentId) continue;
        if (!next[task.assignedAgentId]) next[task.assignedAgentId] = "offline";
        const leaseExpiresAt = task.leaseExpiresAt
          ? new Date(task.leaseExpiresAt).getTime()
          : 0;
        if (task.status === "running" && leaseExpiresAt > now)
          next[task.assignedAgentId] = "running";
      }
      setAgentStatuses(next);
    };
    refreshStatuses();
    const interval = window.setInterval(refreshStatuses, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [workspaceId]);

  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(
        /\/workspace\/[^/]+\/agent\/([^/]+)/,
      );
      if (match?.[1]) setSelectedAgentId(match[1]);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAgents() {
      try {
        setLoading(true);
        const data = await getAgentsList(workspaceId);
        if (cancelled) return;
        setAgents(data || []);
        const nextAgentId =
          initialAgentId && data.some((agent) => agent.id === initialAgentId)
            ? initialAgentId
            : data[0]?.id || null;
        setSelectedAgentId(nextAgentId);
        if (!initialAgentId && nextAgentId)
          router.replace(`/workspace/${workspaceId}/agent/${nextAgentId}`);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load agents", error);
          toast.error("Unable to load agents");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (workspaceId) loadAgents();
    return () => {
      cancelled = true;
    };
  }, [router, workspaceId]);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) || null,
    [agents, selectedAgentId],
  );

  useEffect(() => {
    if (!selectedAgent) {
      setSettingsDraft(null);
      return;
    }
    setSettingsDraft({
      name: selectedAgent.name || "",
      role: selectedAgent.role || "",
      goal: selectedAgent.goal || "",
      instructions: selectedAgent.instructions || "",
      memory: selectedAgent.memory || "",
      model: selectedAgent.model || "gpt-4o-mini",
      tools: Array.isArray(selectedAgent.tools) ? [...selectedAgent.tools] : [],
      permissions: Array.isArray(selectedAgent.permissions)
        ? [...selectedAgent.permissions]
        : [],
      knowledge: Array.isArray(selectedAgent.knowledge)
        ? selectedAgent.knowledge.join(", ")
        : "",
      avatarUrl: selectedAgent.avatarUrl || null,
    });
    setNameDraft(selectedAgent.name || "");
    setIsEditingName(false);
  }, [selectedAgent]);

  const saveAgentConfig = useCallback(
    async (overrides: Partial<AgentSettingsDraft> = {}) => {
      if (!selectedAgent || !settingsDraft || isSaving) return false;
      const next = { ...settingsDraft, ...overrides };
      if (!next.name.trim() || !next.role.trim()) {
        toast.error("Agent name and role are required");
        return false;
      }
      setIsSaving(true);
      try {
        const result = await updateAgent(workspaceId, selectedAgent.id, {
          ...next,
          knowledge: next.knowledge
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        });
        if (!result) throw new Error("Unable to save agent configuration");
        setSettingsDraft(next);
        setNameDraft(next.name);
        setAgents((current) =>
          current.map((agent) =>
            agent.id === selectedAgent.id
              ? {
                ...agent,
                ...next,
                knowledge: next.knowledge
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              }
              : agent,
          ),
        );
        setIsEditingName(false);
        toast.success("Agent saved");
        return true;
      } catch (error: any) {
        toast.error(error?.message || "Unable to save agent");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, selectedAgent, settingsDraft, workspaceId],
  );

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveAgentConfig();
      }
    };
    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, [saveAgentConfig]);
  const selectedAgentIndex = Math.max(
    0,
    agents.findIndex((agent) => agent.id === selectedAgent?.id),
  );
  const selectedAgentTasks = useMemo(
    () =>
      agentTasks.filter((task) => task.assignedAgentId === selectedAgent?.id),
    [agentTasks, selectedAgent?.id],
  );
  const activeTask =
    selectedAgentTasks.find(
      (task) =>
        task.status === "running" &&
        task.leaseExpiresAt &&
        new Date(task.leaseExpiresAt).getTime() > Date.now(),
    ) || null;
  const selectedAgentIsRunning = Boolean(activeTask);
  const visibleEvents = useMemo(() => {
    const taskEvents = selectedAgentTasks
      .filter((task) => task.input?.source !== "agent_chat")
      .filter((task) => !events.some((event: any) => event.taskId === task.id))
      .map((task) => ({
        id: `task-status-${task.id}`,
        taskId: task.id,
        type: task.status === "completed" ? "text" : "status",
        title:
          task.status === "completed"
            ? `Completed: ${task.title}${task.result?.text ? `\n${task.result.text}` : ""}`
            : `${task.status === "running" ? "Working on" : "Waiting to run"}: ${task.title}`,
        status:
          task.status === "running"
            ? "active"
            : task.status === "failed"
              ? "error"
              : "completed",
      }));
    return [...events, ...taskEvents] as any[];
  }, [agentTasks, events, selectedAgentTasks]);

  useEffect(() => {
    let cancelled = false;
    async function syncSession() {
      if (!selectedAgent) return;
      setSessionReady(false);
      stopAgent();
      aiSidebarStore.setWorkspace(workspaceId, [], null, "Agent Session");
      try {
        const { getOrCreateAgentSessionForAgent } =
          await import("~/lib/actions/agentSession");
        const session = await getOrCreateAgentSessionForAgent(
          workspaceId,
          selectedAgent.id,
        );
        if (cancelled || !session?.id) return;
        aiSidebarStore.setWorkspace(
          workspaceId,
          (session.events as any[]) || [],
          session.id,
          session.title || "Agent Session",
        );
        aiSidebarStore.setAgent(selectedAgent);
        setSessionReady(true);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load agent session", error);
          toast.error("Unable to load this agent session");
        }
      }
    }
    syncSession();
    return () => {
      cancelled = true;
    };
  }, [selectedAgent, workspaceId]);

  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;
    const refreshSession = async () => {
      if (aiSidebarStore.isActive.get()) return;
      const sessionId = aiSidebarStore.currentSessionId.get();
      const session = await getAgentSessionEvents(
        workspaceId,
        sessionId || undefined,
      );
      if (
        cancelled ||
        !session.id ||
        session.id !== aiSidebarStore.currentSessionId.get()
      )
        return;
      aiSidebarStore.mergeEvents((session.events as any[]) || []);
    };
    const interval = window.setInterval(refreshSession, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [sessionReady, workspaceId, selectedAgentId]);

  const handleSelectAgent = (agentId: string) => {
    if (agentId === selectedAgentId) return;
    stopAgent();
    setSessionReady(false);
    setSelectedAgentId(agentId);
    window.history.pushState(
      {},
      "",
      `/workspace/${workspaceId}/agent/${agentId}`,
    );
  };

  const handleQuickAction = (prompt: string) => {
    window.dispatchEvent(
      new CustomEvent("falbor:send_agent_message", { detail: { prompt } }),
    );
  };

  const handleDraftChange = (updates: Partial<AgentSettingsDraft>) => {
    setSettingsDraft((current) =>
      current ? { ...current, ...updates } : current,
    );
  };

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveAgentConfig({ name: nameDraft.trim() });
    }
    if (event.key === "Escape") {
      setNameDraft(selectedAgent?.name || "");
      setIsEditingName(false);
    }
  };

  const handleStop = async () => {
    if (activeTask) {
      await cancelAgentTask(workspaceId, activeTask.id);
      setAgentTasks((current) =>
        current.map((task) =>
          task.id === activeTask.id
            ? { ...task, status: "cancelled", leaseExpiresAt: null }
            : task,
        ),
      );
      setAgentStatuses((current) => ({
        ...current,
        [activeTask.assignedAgentId]: "offline",
      }));
    }
    stopAgent();
  };

  return (
    <div className="flex w-full h-full overflow-hidden bg-white dark:bg-[#212121] text-gray-900 dark:text-[#ececed]">
      <AgentSidebar
        workspaceId={workspaceId}
        agents={agents}
        selectedAgentId={selectedAgent?.id || null}
        loading={loading}
        agentStatuses={agentStatuses}
        onSelectAgent={handleSelectAgent}
      />
      <main className="relative isolate flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-white dark:bg-[#212121]">
        <div className="h-[52px] min-h-[52px] max-h-[52px] border-b border-gray-200 dark:border-[#26262b] px-6 flex items-center gap-3 shrink-0">
          {selectedAgent && (
            <img
              src={getAgentIcon(selectedAgent, selectedAgentIndex)}
              alt=""
              className="w-6 h-6 rounded-md object-contain"
            />
          )}
          {selectedAgent && isEditingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={handleNameKeyDown}
              onBlur={() => setIsEditingName(false)}
              className="min-w-0 w-48 bg-transparent border-b border-blue-500 text-base font-semibold text-gray-900 dark:text-white outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
              title="Edit agent name"
            >
              {selectedAgent?.name || "Agents"}
            </button>
          )}
          {selectedAgent && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#25252b] text-gray-600 dark:text-[#9e9ea7]">
              {selectedAgent.role || "Teammate"}
            </span>
          )}
          {selectedAgent && (
            <span
              className="text-[11px] text-gray-400 dark:text-[#777780]"
              title={selectedAgent.id}
            >
              Agent ID: {selectedAgent.id.slice(0, 8)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsQuickActionsOpen((open) => !open)}
            className="ml-auto w-8 h-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-[#8e8e93] dark:hover:text-white dark:hover:bg-white/10"
            aria-label={
              isQuickActionsOpen ? "Close quick actions" : "Open quick actions"
            }
          >
            <span
              className={`${isQuickActionsOpen ? "i-ph:sidebar-simple" : "i-ph:sidebar-simple-fill"} inline-block w-4 h-4`}
            />
          </button>
        </div>
        <img
          src="/background/testst236.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-[150px] w-[150px] -translate-x-1/2 object-contain"
        />
        <div className="relative z-10 flex-1 min-h-0 flex flex-col w-full max-w-3xl mx-auto">
          <AgentMessages
            events={visibleEvents}
            isActive={isActive || selectedAgentIsRunning}
          />
          <AgentChatInput
            ready={sessionReady}
            activeOverride={selectedAgentIsRunning}
            onStop={handleStop}
          />
        </div>
      </main>
      <AgentDetailPanel
        selectedAgent={selectedAgent}
        draft={settingsDraft}
        isOpen={isQuickActionsOpen}
        isSaving={isSaving}
        onDraftChange={handleDraftChange}
        onQuickAction={handleQuickAction}
        onSave={() => {
          void saveAgentConfig();
        }}
        onClose={() => setIsQuickActionsOpen(false)}
      />
    </div>
  );
}

export default WorkspaceAgentView;
