import 'server-only';
import { tool } from 'ai';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { agentSessions, agentTaskMessages, agentTasks, agents } from '~/lib/db/schema';
import { appendAgentTaskEvent } from './task-queue';
import { hasAnyKey } from './types';

export function buildChatAgentTools(input: { workspaceId: string; userId: string; agentId: string; parentTaskId: string | null }) {
  return {
    inspect_team: tool({
      description: 'Inspect the real agents available in this workspace, including roles, tools, permissions, and active workload.',
      parameters: z.object({}),
      execute: async () => {
        const team = await db.select({ id: agents.id, name: agents.name, role: agents.role, goal: agents.goal, tools: agents.tools, permissions: agents.permissions }).from(agents).where(eq(agents.workspaceId, input.workspaceId));
        const workloads = await db.select({ agentId: agentTasks.assignedAgentId, status: agentTasks.status }).from(agentTasks).where(and(eq(agentTasks.workspaceId, input.workspaceId), eq(agentTasks.status, 'running')));
        return team.map((member) => ({ ...member, activeTasks: workloads.filter((task) => task.agentId === member.id).length }));
      },
    }),
    delegate_agent_task: tool({
      description: 'Queue a real durable task for another authorized agent. Use this tool when the user asks you to involve another agent; do not merely describe delegation.',
      parameters: z.object({ agentId: z.string().uuid(), title: z.string().min(1).max(200), message: z.string().min(1).max(20000) }),
      execute: async ({ agentId, title, message }) => {
        const source = await db.query.agents.findFirst({ where: (table, helpers) => helpers.and(helpers.eq(table.id, input.agentId), helpers.eq(table.workspaceId, input.workspaceId)) });
        if (!source || !hasAnyKey(source.permissions, ['tasks.delegate'])) return { success: false, error: 'This agent is not authorized to delegate tasks.' };
        const target = await db.query.agents.findFirst({ where: (table, helpers) => helpers.and(helpers.eq(table.id, agentId), helpers.eq(table.workspaceId, input.workspaceId)) });
        if (!target) return { success: false, error: 'Target agent is not available in this workspace.' };
        const [existingSession] = await db.select().from(agentSessions).where(and(eq(agentSessions.workspaceId, input.workspaceId), eq(agentSessions.userId, input.userId), eq(agentSessions.agentId, target.id))).orderBy(desc(agentSessions.updatedAt)).limit(1);
        const session = existingSession || (await db.insert(agentSessions).values({ workspaceId: input.workspaceId, userId: input.userId, agentId: target.id, title: `${target.name} Session`, events: [] }).returning())[0];
        const sessionEvents = Array.isArray(session?.events) ? [...session.events] : [];
        sessionEvents.push({ id: `task-${Date.now()}`, type: 'user', title: message, status: 'completed', source: 'delegation', taskTitle: title });
        const [child] = await db.insert(agentTasks).values({
          workspaceId: input.workspaceId,
          createdByUserId: input.userId,
          assignedAgentId: target.id,
          parentTaskId: input.parentTaskId,
          title,
          input: { message, sessionId: session?.id || null, context: { parentTaskId: input.parentTaskId, source: 'agent_chat' }, source: 'delegated_task' },
          maxSteps: 20,
          maxCostUsd: 1,
        }).returning();
        if (session?.id) await db.update(agentSessions).set({ events: sessionEvents, updatedAt: new Date() }).where(and(eq(agentSessions.id, session.id), eq(agentSessions.workspaceId, input.workspaceId), eq(agentSessions.userId, input.userId)));
        await db.insert(agentTaskMessages).values({
          workspaceId: input.workspaceId,
          taskId: child.id,
          fromAgentId: source.id,
          toAgentId: target.id,
          kind: 'delegation',
          payload: { title, message, parentTaskId: input.parentTaskId },
        });
        await appendAgentTaskEvent({ workspaceId: input.workspaceId, taskId: child.id, agentId: source.id, type: 'task_queued', payload: { title, targetAgentId: target.id, parentTaskId: input.parentTaskId } });
        return { success: true, taskId: child.id, assignedAgentId: target.id, assignedAgent: target.name, status: child.status };
      },
    }),
  };
}
