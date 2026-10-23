'use server';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '~/lib/db';
import { agentApprovals, agentProposals, agentTaskEvents, agentTasks } from '~/lib/db/schema';
import { createAgent } from '~/lib/actions/agent';
import { requireWorkspaceActor } from '~/lib/agents/authorization';
import { appendAgentTaskEvent } from '~/lib/agents/task-queue';
import { z } from 'zod';

const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(20000),
  agentId: z.string().uuid(),
  parentTaskId: z.string().uuid().optional(),
  selectedMCPs: z.array(z.string().max(100)).max(20).optional(),
  maxSteps: z.number().int().min(1).max(50).optional(),
  maxCostUsd: z.number().positive().max(25).optional(),
});

export async function createAgentTask(workspaceId: string, input: unknown) {
  const actor = await requireWorkspaceActor(workspaceId, 'editor');
  const data = taskInputSchema.parse(input);
  const agent = await db.query.agents.findFirst({ where: (table, helpers) => helpers.and(helpers.eq(table.id, data.agentId), helpers.eq(table.workspaceId, workspaceId)) });
  if (!agent) throw new Error('Agent not found');
  const [task] = await db.insert(agentTasks).values({
    workspaceId,
    createdByUserId: actor.user.id,
    assignedAgentId: agent.id,
    parentTaskId: data.parentTaskId || null,
    title: data.title,
    input: { message: data.message, selectedMCPs: data.selectedMCPs || [] },
    maxSteps: data.maxSteps || 20,
    maxCostUsd: data.maxCostUsd || 1,
  }).returning();
  await appendAgentTaskEvent({ workspaceId, taskId: task.id, agentId: agent.id, type: 'task_queued', payload: { title: task.title, agentId: agent.id } });
  return task;
}

export async function getAgentTask(workspaceId: string, taskId: string) {
  await requireWorkspaceActor(workspaceId);
  const task = await db.query.agentTasks.findFirst({ where: (table, helpers) => helpers.and(helpers.eq(table.id, taskId), helpers.eq(table.workspaceId, workspaceId)) });
  if (!task) return null;
  const events = await db.select().from(agentTaskEvents).where(eq(agentTaskEvents.taskId, taskId)).orderBy(asc(agentTaskEvents.createdAt));
  return { task, events };
}

export async function listAgentTasks(workspaceId: string) {
  await requireWorkspaceActor(workspaceId);
  return db.select().from(agentTasks).where(eq(agentTasks.workspaceId, workspaceId)).orderBy(desc(agentTasks.createdAt)).limit(100);
}

export async function cancelAgentTask(workspaceId: string, taskId: string) {
  const actor = await requireWorkspaceActor(workspaceId, 'editor');
  const now = new Date();
  const updated = await db.update(agentTasks).set({ status: 'cancelled', leaseExpiresAt: null, completedAt: now, updatedAt: now }).where(and(eq(agentTasks.id, taskId), eq(agentTasks.workspaceId, workspaceId), inArray(agentTasks.status, ['queued', 'running']))).returning({ id: agentTasks.id });
  if (!updated.length) return false;
  await appendAgentTaskEvent({ workspaceId, taskId, type: 'task_cancelled', payload: { userId: actor.user.id } });
  return true;
}

export async function decideAgentApproval(workspaceId: string, approvalId: string, decision: 'approved' | 'rejected') {
  const actor = await requireWorkspaceActor(workspaceId, 'editor');
  const updated = await db.update(agentApprovals).set({ status: decision, decidedByUserId: actor.user.id, decidedAt: new Date() }).where(and(eq(agentApprovals.id, approvalId), eq(agentApprovals.workspaceId, workspaceId), eq(agentApprovals.status, 'pending'))).returning({ taskId: agentApprovals.taskId });
  if (!updated.length) return false;
  await db.update(agentTasks).set({ status: decision === 'approved' ? 'queued' : 'failed', runAfter: new Date(), error: decision === 'rejected' ? 'User rejected the requested action.' : null, updatedAt: new Date() }).where(and(eq(agentTasks.id, updated[0].taskId), eq(agentTasks.workspaceId, workspaceId)));
  await appendAgentTaskEvent({ workspaceId, taskId: updated[0].taskId, type: `approval_${decision}`, payload: { approvalId, userId: actor.user.id } });
  return true;
}

export async function listAgentProposals(workspaceId: string) {
  await requireWorkspaceActor(workspaceId);
  return db.select().from(agentProposals).where(eq(agentProposals.workspaceId, workspaceId)).orderBy(desc(agentProposals.createdAt)).limit(50);
}

export async function decideAgentProposal(workspaceId: string, proposalId: string, decision: 'approved' | 'rejected') {
  const actor = await requireWorkspaceActor(workspaceId, 'editor');
  const proposal = await db.query.agentProposals.findFirst({ where: (table, helpers) => helpers.and(helpers.eq(table.id, proposalId), helpers.eq(table.workspaceId, workspaceId), helpers.eq(table.status, 'pending')) });
  if (!proposal) return { success: false, error: 'Proposal not found or already decided.' };
  if (decision === 'rejected') {
    await db.update(agentProposals).set({ status: 'rejected', decidedByUserId: actor.user.id, decidedAt: new Date() }).where(eq(agentProposals.id, proposalId));
    if (proposal.taskId) await appendAgentTaskEvent({ workspaceId, taskId: proposal.taskId, agentId: proposal.proposedByAgentId, type: 'agent_proposal_rejected', payload: { proposalId } });
    return { success: true, agent: null };
  }
  const created = await createAgent(workspaceId, proposal.configuration);
  if (!created.agent) return { success: false, error: created.error || 'Failed to create proposed agent.' };
  await db.update(agentProposals).set({ status: 'approved', decidedByUserId: actor.user.id, decidedAt: new Date() }).where(eq(agentProposals.id, proposalId));
  if (proposal.taskId) await appendAgentTaskEvent({ workspaceId, taskId: proposal.taskId, agentId: proposal.proposedByAgentId, type: 'agent_proposal_approved', payload: { proposalId, agentId: created.agent.id } });
  return { success: true, agent: created.agent };
}
