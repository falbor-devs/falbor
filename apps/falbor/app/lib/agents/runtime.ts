import 'server-only';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { agentApprovals, agentProposals, agentSessions, agentTaskDependencies, agentTaskMessages, agentTaskRuns, agentTasks, agents, workspaces } from '~/lib/db/schema';
import { buildAgentTools } from '~/lib/agent/core';
import { getAgentRolePrompt } from '~/lib/common/prompts/agents-rule';
import { appendAgentTaskEvent, isAgentTaskCancelled } from './task-queue';
import { hasAnyKey, type AgentTaskInput } from './types';
import { isLocalAgentModel, LOCAL_AGENT_BASE_URL, LOCAL_AGENT_MODEL } from './local-model';

const MODEL_PRICES: Record<string, number> = {
  'falbor-local:qwen2.5-vl-3b': 0,
  'gpt-4o': 0.00001,
  'gpt-4o-mini': 0.000001,
  'claude-sonnet-4-5': 0.00001,
  'claude-haiku-4-5': 0.000001,
};

function resolveModel(modelId: string | null | undefined) {
  const model = modelId?.trim() || 'gpt-4o-mini';
  if (isLocalAgentModel(model)) {
    if (!LOCAL_AGENT_BASE_URL) throw new Error('The local Agent Model is not configured on this server.');
    return createOpenAI({ apiKey: process.env.FALBOR_LOCAL_AGENT_KEY || 'local-agent', baseURL: LOCAL_AGENT_BASE_URL })(LOCAL_AGENT_MODEL);
  }
  if (model.toLowerCase().startsWith('deepseek')) return createOpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' })(model);
  if (model.toLowerCase().startsWith('claude')) return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(model);
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(model);
}

function estimateCost(model: string, promptTokens: number, completionTokens: number) {
  const rate = MODEL_PRICES[model] || 0.00001;
  return (promptTokens + completionTokens) * rate;
}

function normalizeLegacyToolKeys(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.toLowerCase());
}

async function buildAuthorizedTools(agent: any, workspace: any, task: any, input: AgentTaskInput, onApproval: (approvalId: string) => void, onSummaryPreview: (html: string) => void) {
  const configured = normalizeLegacyToolKeys(agent.tools);
  const selectedMCPs = Array.isArray(input.selectedMCPs) ? input.selectedMCPs : [];
  const allTools = await buildAgentTools(workspace, hasAnyKey(configured, ['mcp', 'mcp.use']) ? selectedMCPs : [], task.createdByUserId, input.browserSessionId, input.browserActiveTabId);
  const canBrowse = hasAnyKey(configured, ['web search browser', 'browser.use', 'browser']);
  const canSearch = hasAnyKey(configured, ['web search browser', 'web.search', 'web search', 'research']);
  const canMcp = hasAnyKey(configured, ['mcp', 'mcp.use']);
  const allowed = new Set<string>(['read_workspace']);
  if (canBrowse) ['browser_navigate', 'browser_click', 'browser_type', 'browser_get_elements', 'browser_new_tab', 'browser_read'].forEach((key) => allowed.add(key));
  if (canSearch) ['serp_search', 'verify_post_links', 'tomba_search_prospects'].forEach((key) => allowed.add(key));
  if (canMcp) selectedMCPs.forEach((connector) => Object.keys(allTools).filter((key) => key.toLowerCase().includes(connector.toLowerCase())).forEach((key) => allowed.add(key)));
  const tools: Record<string, any> = {};
  for (const [name, definition] of Object.entries(allTools)) if (allowed.has(name)) tools[name] = definition;
  tools.request_approval = tool({
    description: 'Request persistent user approval before a consequential external action. Do not execute the action before approval is granted.',
    parameters: z.object({ actionType: z.string(), reason: z.string(), payload: z.record(z.unknown()).default({}) }),
    execute: async ({ actionType, reason, payload }) => {
      const [approval] = await db.insert(agentApprovals).values({
        workspaceId: task.workspaceId,
        taskId: task.id,
        runId: task.runId || null,
        agentId: agent.id,
        actionType,
        payload: { reason, ...payload },
        status: 'pending',
      }).returning({ id: agentApprovals.id });
      onApproval(approval.id);
      return { status: 'pending_approval', approvalId: approval.id };
    },
  });
  if (agent.role === 'Summary Agent') {
    tools.create_summary_preview = tool({
      description: 'Create a polished HTML preview from the structured findings. The user sees the rendered preview, not its source code.',
      parameters: z.object({ title: z.string().min(1).max(200), html: z.string().min(1).max(50000) }),
      execute: async ({ title, html }) => {
        const safeHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+\s*=\s*["'][^"']*["']/gi, '').replace(/javascript:/gi, '');
        onSummaryPreview(safeHtml);
        return { success: true, title, status: 'preview_created' };
      },
    });
  }
  const canDelegate = hasAnyKey(agent.permissions, ['tasks.delegate', 'delegate tasks']);
  const canReplan = hasAnyKey(agent.permissions, ['tasks.replan', 'replan tasks']);
  if (canDelegate) {
    tools.inspect_team = tool({
      description: 'Inspect the real agents in this workspace, including roles, configured tools, permissions, and active workload.',
      parameters: z.object({}),
      execute: async () => {
        const team = await db.select({ id: agents.id, name: agents.name, role: agents.role, goal: agents.goal, tools: agents.tools, permissions: agents.permissions }).from(agents).where(eq(agents.workspaceId, task.workspaceId));
        const workloads = await db.select({ agentId: agentTasks.assignedAgentId, status: agentTasks.status }).from(agentTasks).where(and(eq(agentTasks.workspaceId, task.workspaceId), eq(agentTasks.status, 'running')));
        return team.map((member) => ({ ...member, activeTasks: workloads.filter((item) => item.agentId === member.id).length }));
      },
    });
    tools.inspect_task = tool({
      description: 'Inspect a delegated task and its persisted execution events.',
      parameters: z.object({ taskId: z.string().uuid() }),
      execute: async ({ taskId }) => {
        const child = await db.query.agentTasks.findFirst({ where: (table, helpers) => helpers.and(helpers.eq(table.id, taskId), helpers.eq(table.workspaceId, task.workspaceId)) });
        if (!child) return { error: 'Task not found in this workspace.' };
        const events = await db.query.agentTaskEvents.findMany({ where: (table, helpers) => helpers.eq(table.taskId, taskId), orderBy: (table, helpers) => [helpers.asc(table.createdAt)] });
        return { task: child, events };
      },
    });
    tools.delegate_task = tool({
      description: 'Create and queue a real child task for another authorized workspace agent. Use this instead of describing delegation in text.',
      parameters: z.object({ agentId: z.string().uuid(), title: z.string().min(1).max(200), message: z.string().min(1).max(20000), dependsOnTaskIds: z.array(z.string().uuid()).max(20).default([]) }),
      execute: async ({ agentId, title, message, dependsOnTaskIds }) => {
        const target = await db.query.agents.findFirst({ where: (table, helpers) => helpers.and(helpers.eq(table.id, agentId), helpers.eq(table.workspaceId, task.workspaceId)) });
        if (!target) return { success: false, error: 'Target agent is not in this workspace.' };
        const [child] = await db.insert(agentTasks).values({ workspaceId: task.workspaceId, createdByUserId: task.createdByUserId, assignedAgentId: target.id, parentTaskId: task.id, title, input: { message, context: { parentTaskId: task.id } }, maxSteps: task.maxSteps, maxCostUsd: task.maxCostUsd }).returning();
        const dependencies = dependsOnTaskIds.filter((dependencyId) => dependencyId !== child.id);
        if (dependencies.length) {
          const validDependencies = await db.query.agentTasks.findMany({ where: (table, helpers) => helpers.and(helpers.eq(table.workspaceId, task.workspaceId)) });
          const validIds = new Set(validDependencies.map((dependency) => dependency.id));
          const rows = dependencies.filter((dependencyId) => validIds.has(dependencyId)).map((dependencyId) => ({ taskId: child.id, dependsOnTaskId: dependencyId }));
          if (rows.length) await db.insert(agentTaskDependencies).values(rows);
        }
        await db.insert(agentTaskMessages).values({ workspaceId: task.workspaceId, taskId: task.id, fromAgentId: agent.id, toAgentId: target.id, kind: 'delegation', payload: { childTaskId: child.id, title, message } });
        await appendAgentTaskEvent({ workspaceId: task.workspaceId, taskId: task.id, runId: task.runId, agentId: agent.id, type: 'task_delegated', payload: { childTaskId: child.id, targetAgentId: target.id, title, dependsOnTaskIds: dependencies } });
        return { success: true, childTaskId: child.id, assignedAgentId: target.id, status: child.status };
      },
    });
  }
  if (canReplan) {
    tools.record_replan = tool({
      description: 'Persist a Chief of Staff replan after a failure, blocker, approval change, or new evidence.',
      parameters: z.object({ reason: z.string().min(1).max(4000), changes: z.array(z.string().max(1000)).max(30), nextSteps: z.array(z.string().max(1000)).max(30) }),
      execute: async ({ reason, changes, nextSteps }) => {
        await appendAgentTaskEvent({ workspaceId: task.workspaceId, taskId: task.id, runId: task.runId, agentId: agent.id, type: 'plan_revised', payload: { reason, changes, nextSteps } });
        return { success: true, status: 'replanned', reason, changes, nextSteps };
      },
    });
    tools.propose_agent = tool({
      description: 'Persist a proposed agent configuration for user review. Never create the agent automatically.',
      parameters: z.object({ reason: z.string().min(1).max(4000), configuration: z.object({ name: z.string().min(1).max(120), role: z.string().min(1).max(120), goal: z.string().max(4000), instructions: z.string().max(12000), tools: z.array(z.string()).max(30), permissions: z.array(z.string()).max(30), knowledge: z.array(z.string()).max(100), model: z.string().max(160) }) }),
      execute: async ({ reason, configuration }) => {
        const [proposal] = await db.insert(agentProposals).values({ workspaceId: task.workspaceId, taskId: task.id, proposedByAgentId: agent.id, reason, configuration }).returning({ id: agentProposals.id });
        await appendAgentTaskEvent({ workspaceId: task.workspaceId, taskId: task.id, runId: task.runId, agentId: agent.id, type: 'agent_proposed', payload: { proposalId: proposal.id, reason, configuration } });
        return { success: true, proposalId: proposal.id, status: 'pending_user_approval' };
      },
    });
  }
  return tools;
}

function buildExecutionPrompt(agent: any, workspace: any, input: AgentTaskInput) {
  return `${getAgentRolePrompt(agent.role)}

AGENT IDENTITY
Name: ${agent.name}
Role: ${agent.role || 'Specialist'}
Goal: ${agent.goal || 'Complete the assigned task accurately.'}
Custom instructions: ${agent.instructions || 'None'}
Persistent agent memory: ${agent.memory || 'None'}
Configured knowledge: ${JSON.stringify(agent.knowledge || [])}

WORKSPACE
ID: ${workspace.id}
Name: ${workspace.name || 'Untitled Workspace'}
Context: ${workspace.contextPrompt || 'None'}

TASK
${input.message}
${input.context ? `Structured context: ${JSON.stringify(input.context)}` : ''}

EXECUTION RULES
Use tools when they are needed to complete the task. Inspect every tool result before deciding the next step. Do not describe an action instead of executing it. Stop when the task is complete, blocked, awaiting approval, or at the step limit. Return a concise result with completed actions, evidence, blockers, and verified business outcomes. A lead, draft, sent message, reply, signup, and paying customer are separate outcomes; never upgrade one into another without evidence.
`;
}

function parseBusinessProposal(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] || text;
  try {
    const value = JSON.parse(fenced);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

async function persistBusinessResearchResult(task: any, text: string, status: 'completed' | 'failed') {
  const input = (task.input || {}) as any;
  if (input.source !== 'new_business_research') return;
  const proposal = status === 'completed' ? parseBusinessProposal(text) : null;
  await db.update(workspaces).set({
    businessConcept: proposal || { rawResult: text },
    businessConceptStatus: status === 'completed' && proposal ? 'awaiting_approval' : 'research_failed',
    updatedAt: new Date(),
  }).where(eq(workspaces.id, task.workspaceId));
}

async function queueParentSynthesis(task: any, agent: any, result: string) {
  if (!task.parentTaskId) return;
  const parent = await db.query.agentTasks.findFirst({ where: (table, helpers) => helpers.and(helpers.eq(table.id, task.parentTaskId), helpers.eq(table.workspaceId, task.workspaceId)) });
  if (!parent?.assignedAgentId) return;
  const parentInput = (parent.input || {}) as any;
  if (parentInput.source === 'agent_synthesis') return;
  const summaryAgent = await db.query.agents.findFirst({ where: (table, helpers) => helpers.and(helpers.eq(table.workspaceId, task.workspaceId), helpers.eq(table.role, 'Summary Agent')) });
  const recipientAgentId = summaryAgent?.id || parent.assignedAgentId;
  const [followup] = await db.insert(agentTasks).values({
    workspaceId: task.workspaceId,
    createdByUserId: task.createdByUserId,
    assignedAgentId: recipientAgentId,
    parentTaskId: parent.id,
    title: `${summaryAgent ? 'Summarize' : 'Synthesize'} ${task.title}`.slice(0, 200),
    input: {
      message: `A delegated agent completed the task "${task.title}". Synthesize the result for the Chief of Staff and the user. Preserve evidence, uncertainty, blockers, and the distinction between completed actions and verified business outcomes.\n\nDelegated result:\n${result}`,
      context: { childTaskId: task.id, sourceAgentId: agent.id, sessionId: parentInput.sessionId || null },
      sessionId: parentInput.sessionId || null,
      source: 'agent_synthesis',
    },
    maxSteps: parent.maxSteps || 20,
    maxCostUsd: parent.maxCostUsd || 1,
  }).returning();
  await db.insert(agentTaskMessages).values({
    workspaceId: task.workspaceId,
    taskId: parent.id,
    fromAgentId: agent.id,
    toAgentId: recipientAgentId,
    kind: 'completion',
    payload: { childTaskId: task.id, followupTaskId: followup.id, result },
  });
  await appendAgentTaskEvent({ workspaceId: task.workspaceId, taskId: parent.id, agentId: agent.id, type: 'agent_result_received', payload: { childTaskId: task.id, followupTaskId: followup.id, result } });
}

async function appendAgentSessionEvent(sessionId: string | null | undefined, workspaceId: string, userId: string, event: Record<string, unknown>) {
  if (!sessionId) return;
  const [session] = await db.select({ events: agentSessions.events }).from(agentSessions).where(and(eq(agentSessions.id, sessionId), eq(agentSessions.workspaceId, workspaceId), eq(agentSessions.userId, userId)));
  if (!session) return;
  const events = Array.isArray(session.events) ? [...session.events, event] : [event];
  await db.update(agentSessions).set({ events, updatedAt: new Date() }).where(and(eq(agentSessions.id, sessionId), eq(agentSessions.workspaceId, workspaceId), eq(agentSessions.userId, userId)));
}

export async function executeAgentTask(task: any, agent: any, workspace: any) {
  const input = (task.input || {}) as AgentTaskInput;
  let inputSessionId = (input as any).sessionId || (input as any).context?.sessionId;
  if (!inputSessionId) {
    const [existingSession] = await db.select().from(agentSessions).where(and(eq(agentSessions.workspaceId, task.workspaceId), eq(agentSessions.userId, task.createdByUserId), eq(agentSessions.agentId, agent.id))).orderBy(desc(agentSessions.updatedAt)).limit(1);
    const session = existingSession || (await db.insert(agentSessions).values({ workspaceId: task.workspaceId, userId: task.createdByUserId, agentId: agent.id, title: `${agent.name} Session`, events: [] }).returning())[0];
    inputSessionId = session?.id || null;
    await db.update(agentTasks).set({ input: { ...input, sessionId: inputSessionId }, updatedAt: new Date() }).where(eq(agentTasks.id, task.id));
    await appendAgentSessionEvent(inputSessionId, task.workspaceId, task.createdByUserId, { id: `task-${task.id}`, type: 'user', title: input.message, status: 'completed', source: 'delegation', taskId: task.id });
  }
  const run = await db.insert(agentTaskRuns).values({ taskId: task.id, agentId: agent.id, attempt: task.attempts, status: 'running' }).returning();
  const currentRun = run[0];
  let approvalId: string | null = null;
  let summaryPreviewHtml: string | null = null;
  await appendAgentTaskEvent({ workspaceId: task.workspaceId, taskId: task.id, runId: currentRun.id, agentId: agent.id, type: 'run_started', payload: { attempt: task.attempts, model: agent.model || 'gpt-4o-mini' } });
  await appendAgentSessionEvent(inputSessionId, task.workspaceId, task.createdByUserId, { id: `run-${currentRun.id}`, type: 'status', title: `${agent.name} is working`, status: 'active', agentId: agent.id, taskId: task.id });
  try {
    const tools = await buildAuthorizedTools({ ...agent }, workspace, { ...task, runId: currentRun.id }, input, (id) => { approvalId = id; }, (html) => { summaryPreviewHtml = html; });
    const result = await generateText({
      model: resolveModel(agent.model),
      system: buildExecutionPrompt(agent, workspace, input),
      messages: [{ role: 'user', content: input.message }],
      tools,
      maxSteps: Math.min(Math.max(task.maxSteps || 20, 1), 50),
      maxTokens: 4000,
      onStepFinish: async (step) => {
        if (await isAgentTaskCancelled(task.id)) throw new Error('Task cancelled');
        await db.update(agentTaskRuns).set({ stepCount: (step as any).stepNumber || 0 }).where(eq(agentTaskRuns.id, currentRun.id));
        await appendAgentTaskEvent({ workspaceId: task.workspaceId, taskId: task.id, runId: currentRun.id, agentId: agent.id, type: 'step_completed', payload: { text: step.text || '', toolCalls: step.toolCalls || [], toolResults: step.toolResults || [] } });
      },
    });
    const usage = result.usage || { promptTokens: 0, completionTokens: 0 };
    const cost = estimateCost(agent.model || 'gpt-4o-mini', usage.promptTokens || 0, usage.completionTokens || 0);
    if (cost > Number(task.maxCostUsd || 1)) throw new Error('Agent task spending limit exceeded');
    const status = approvalId ? 'blocked' : 'completed';
    const completedAt = new Date();
    await db.update(agentTaskRuns).set({ status, promptTokens: usage.promptTokens || 0, completionTokens: usage.completionTokens || 0, estimatedCostUsd: cost, completedAt }).where(eq(agentTaskRuns.id, currentRun.id));
    await db.update(agentTasks).set({ status, result: { text: result.text, previewHtml: summaryPreviewHtml, approvalId, usage: { ...usage, estimatedCostUsd: cost } }, leaseExpiresAt: null, completedAt: status === 'completed' ? completedAt : null, updatedAt: completedAt }).where(eq(agentTasks.id, task.id));
    await persistBusinessResearchResult(task, result.text, status === 'completed' ? 'completed' : 'failed');
    await appendAgentTaskEvent({ workspaceId: task.workspaceId, taskId: task.id, runId: currentRun.id, agentId: agent.id, type: status === 'blocked' ? 'approval_requested' : 'task_completed', payload: { text: result.text, approvalId, usage: { ...usage, estimatedCostUsd: cost } } });
    if (status === 'completed') await queueParentSynthesis(task, agent, result.text);
    if (status === 'completed' && (input as any).source === 'agent_synthesis' && inputSessionId && result.text) {
      const [session] = await db.select({ events: agentSessions.events }).from(agentSessions).where(and(eq(agentSessions.id, inputSessionId), eq(agentSessions.workspaceId, task.workspaceId), eq(agentSessions.userId, task.createdByUserId)));
      const events = Array.isArray(session?.events) ? [...session.events] : [];
      events.push(summaryPreviewHtml ? { id: `agent-${task.id}`, type: 'summary_preview', title: 'Summary preview', status: 'completed', html: summaryPreviewHtml, agentId: agent.id } : { id: `agent-${task.id}`, type: 'text', title: result.text, status: 'completed', agentId: agent.id });
      await db.update(agentSessions).set({ events, updatedAt: new Date() }).where(and(eq(agentSessions.id, inputSessionId), eq(agentSessions.workspaceId, task.workspaceId), eq(agentSessions.userId, task.createdByUserId)));
    } else if (status === 'completed') {
      await appendAgentSessionEvent(inputSessionId, task.workspaceId, task.createdByUserId, summaryPreviewHtml ? { id: `result-${task.id}`, type: 'summary_preview', title: 'Summary preview', status: 'completed', html: summaryPreviewHtml, agentId: agent.id, taskId: task.id } : { id: `result-${task.id}`, type: 'text', title: result.text || 'Task completed', status: 'completed', agentId: agent.id, taskId: task.id });
    }
    return { status, result: result.text, approvalId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent execution failed';
    const terminal = message === 'Task cancelled' || task.attempts >= task.maxAttempts;
    const status = message === 'Task cancelled' ? 'cancelled' : terminal ? 'failed' : 'queued';
    const nextRun = new Date(Date.now() + Math.min(15 * 60_000, 30_000 * Math.max(task.attempts, 1)));
    await db.update(agentTaskRuns).set({ status, error: message, completedAt: new Date() }).where(eq(agentTaskRuns.id, currentRun.id));
    await db.update(agentTasks).set({ status, error: message, runAfter: nextRun, leaseExpiresAt: null, updatedAt: new Date() }).where(eq(agentTasks.id, task.id));
    if (status === 'failed') await persistBusinessResearchResult(task, message, 'failed');
    await appendAgentTaskEvent({ workspaceId: task.workspaceId, taskId: task.id, runId: currentRun.id, agentId: agent.id, type: terminal ? 'task_failed' : 'task_retry_scheduled', payload: { error: message, nextRun: terminal ? null : nextRun.toISOString() } });
    await appendAgentSessionEvent(inputSessionId, task.workspaceId, task.createdByUserId, { id: `error-${task.id}-${Date.now()}`, type: 'text', title: `Task ${status}: ${message}`, status: 'error', agentId: agent.id, taskId: task.id });
    return { status, error: message };
  }
}
