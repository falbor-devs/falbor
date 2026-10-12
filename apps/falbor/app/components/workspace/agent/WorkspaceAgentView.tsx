'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getAgentsList } from '~/lib/actions/agent';
import { sendAgentMessage } from '~/lib/actions/agentChat';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { useStore } from '@nanostores/react';
import { AgentSidebar } from './AgentSidebar';
import { AgentWorkspaceContent } from './AgentWorkspaceContent';
import { AgentDetailPanel } from './AgentDetailPanel';
import { AssignWorkModal } from './AssignWorkModal';
import { TaskReviewModal } from './TaskReviewModal';
import type { AgentTask } from './types';

export function WorkspaceAgentView({ workspaceId }: { workspaceId: string }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [reviewModalTask, setReviewModalTask] = useState<AgentTask | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);

  const isAiActive = useStore(aiSidebarStore.isActive);
  const aiEvents = useStore(aiSidebarStore.events);

  useEffect(() => {
    async function loadAgents() {
      try {
        setLoading(true);
        const data = await getAgentsList(workspaceId);
        setAgents(data || []);
        if (data && data.length > 0 && !selectedAgentId) {
          setSelectedAgentId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load agents', err);
      } finally {
        setLoading(false);
      }
    }
    if (workspaceId) {
      loadAgents();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && workspaceId) {
      try {
        const stored = localStorage.getItem(`falbor_agent_tasks_${workspaceId}`);
        if (stored) {
          setTasks(JSON.parse(stored));
        } else {
          setTasks([]);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [workspaceId]);

  const saveTasks = (newTasks: AgentTask[]) => {
    setTasks(newTasks);
    if (typeof window !== 'undefined' && workspaceId) {
      try {
        localStorage.setItem(`falbor_agent_tasks_${workspaceId}`, JSON.stringify(newTasks));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId && agents.length > 0) return agents[0];
    return agents.find((a) => a.id === selectedAgentId) || agents[0] || null;
  }, [agents, selectedAgentId]);

  const selectedAgentIndex = useMemo(() => {
    if (!selectedAgent) return 0;
    const idx = agents.findIndex((a) => a.id === selectedAgent.id);
    return idx >= 0 ? idx : 0;
  }, [agents, selectedAgent]);

  useEffect(() => {
    async function syncSessionForAgent() {
      if (!workspaceId) return;
      try {
        const { getOrCreateAgentSessionForAgent } = await import('~/lib/actions/agentSession');
        const session = await getOrCreateAgentSessionForAgent(workspaceId, selectedAgent?.id || null);
        if (session && session.id) {
          aiSidebarStore.setWorkspace(
            workspaceId,
            (session.events as any[]) || [],
            session.id,
            session.title || 'Agent Session'
          );
        }
      } catch (err) {
        console.error('Failed to sync session for agent', err);
      }
    }

    if (selectedAgent) {
      aiSidebarStore.setAgent(selectedAgent);
      syncSessionForAgent();
    }
  }, [workspaceId, selectedAgent]);

  useEffect(() => {
    if (!aiEvents || aiEvents.length === 0) return;

    // Check if there are any in_progress tasks that have finished
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
    if (inProgressTasks.length === 0) return;

    // Look for finished response events from the agent in session events
    const lastCompletedEvent = [...aiEvents].reverse().find(
      (e) => (e.type === 'text' || e.type === 'chat' || e.type === 'status') &&
        e.status === 'completed' &&
        Boolean(e.html || e.title)
    );

    if (lastCompletedEvent) {
      const updated = tasks.map((t) => {
        if (t.status === 'in_progress') {
          return {
            ...t,
            status: 'finished' as const,
            resultTitle: `Review ${t.title}`,
            resultContent: lastCompletedEvent.html || lastCompletedEvent.title,
          };
        }
        return t;
      });

      if (JSON.stringify(updated) !== JSON.stringify(tasks)) {
        saveTasks(updated);
      }
    }
  }, [aiEvents, tasks]);

  const handleAssignWork = async (title: string, description: string) => {
    const targetAgentId = selectedAgent?.id || 'default';
    const newTask: AgentTask = {
      id: `task-${Date.now()}`,
      agentId: targetAgentId,
      title,
      description,
      status: 'in_progress',
      requestor: 'You',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextTasks = [newTask, ...tasks];
    saveTasks(nextTasks);

    aiSidebarStore.open();
    const prompt = `[Task for ${selectedAgent?.name || 'Agent'} (${selectedAgent?.role || 'Assistant'})]: ${newTask.title}${newTask.description ? `\nDetails: ${newTask.description}` : ''}`;
    await sendAgentMessage(prompt);
  };

  const agentTasks = tasks.filter((t) => t.agentId === (selectedAgent?.id || 'default') || (!selectedAgent && t.agentId === 'default'));
  const finishedTasks = agentTasks.filter((t) => t.status === 'finished');
  const activeTasks = agentTasks.filter((t) => t.status !== 'finished');

  return (
    <div className="flex w-full h-full overflow-hidden text-gray-900 dark:text-[#ececed]">
      <AgentSidebar
        workspaceId={workspaceId}
        agents={agents}
        selectedAgentId={selectedAgent?.id || null}
        loading={loading}
        onSelectAgent={(id) => setSelectedAgentId(id)}
      />

      <AgentWorkspaceContent
        selectedAgent={selectedAgent}
        agentTasks={agentTasks}
        activeTasks={activeTasks}
        finishedTasks={finishedTasks}
        onOpenAssign={() => setIsAssignOpen(true)}
        onReviewTask={(task) => setReviewModalTask(task)}
        agentIndex={selectedAgentIndex}
      />

      <AgentDetailPanel
        selectedAgent={selectedAgent}
        onOpenAssign={() => setIsAssignOpen(true)}
      />

      <AssignWorkModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        selectedAgent={selectedAgent}
        onSubmit={handleAssignWork}
      />

      <TaskReviewModal
        task={reviewModalTask}
        onClose={() => setReviewModalTask(null)}
      />
    </div>
  );
}
export default WorkspaceAgentView;
