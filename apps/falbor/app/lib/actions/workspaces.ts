'use server'

import { db } from '~/lib/db'
import { v4 } from 'uuid'
import { agentTasks, agents, workspaces } from '~/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { getAuthUserDetails } from '~/lib/visual-editor/queries'
import { getAccessibleWorkspace } from '~/lib/workspace-build/access'
import { triggerWorkspaceBuild } from '~/lib/workspace-build/orchestrator'
import { ensureBuild } from '~/lib/workspace-build/state'
import { appendAgentTaskEvent } from '~/lib/agents/task-queue'

import { BILLING_CONFIG, PlanId } from '~/lib/billing/config'

async function getUserId() {
  const authUser = await getAuthUserDetails()
  if (!authUser) return null;
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, authUser.email),
  })
  return user?.id || null;
}

async function getUserIdAndTier() {
  const authUser = await getAuthUserDetails()
  if (!authUser) return null;
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, authUser.email),
  })
  if (!user) return null;
  return {
    id: user.id,
    tier: ((user as any).subscriptionTier || 'free').toLowerCase() as PlanId,
  };
}

export async function createWorkspace(name: string = "Untitled Workspace") {
  const userAuth = await getUserIdAndTier();
  if (!userAuth) throw new Error("Unauthorized");

  const existingWorkspaces = await db.query.workspaces.findMany({
    where: (workspaces, { eq }) => eq(workspaces.userId, userAuth.id),
  });

  const planConfig = BILLING_CONFIG.plans[userAuth.tier] || BILLING_CONFIG.plans.free;
  const maxAllowed = planConfig.maxWorkspaces;

  if (existingWorkspaces.length >= maxAllowed) {
    if (userAuth.tier === 'free') {
      throw new Error("You are on the free plan; you cannot create a workspace. A paid subscription is required to create more than one workspace.");
    }
    throw new Error(`You have reached your limit of ${maxAllowed} workspaces on the ${planConfig.name} plan. Please upgrade your subscription to create more workspaces.`);
  }

  const id = v4();
  await db.insert(workspaces).values({
    id,
    userId: userAuth.id,
    name,
  });
  await db.insert(agents).values({
    workspaceId: id,
    userId: userAuth.id,
    name: 'Falbor Agent',
    role: 'Chief of Staff',
    goal: 'Coordinate workspace work, research, and execution through authorized tools and collaborating agents.',
    instructions: 'Act as the user\'s default Falbor workspace agent. Use the available tools, inspect real results, collaborate through persisted tasks, and report verified outcomes separately from completed actions.',
    memory: '',
    tools: ['Web Search Browser', 'MCP'],
    knowledge: [],
    permissions: ['tasks.execute', 'tasks.delegate', 'tasks.replan', 'external.read'],
    model: 'gpt-4o-mini',
    avatarUrl: null,
  });
  return id;
}

export async function getLastUsedWorkspace() {
  const userId = await getUserId();
  if (!userId) return null;

  const userWorkspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq }) => eq(workspaces.userId, userId),
    orderBy: [desc(workspaces.updatedAt)],
  });

  return userWorkspace || null;
}

export async function getWorkspaceById(id: string) {
  const userId = await getUserId();
  if (!userId || !id) return null;

  try {
    const workspace = await db.query.workspaces.findFirst({
      where: (workspaces, { eq }) => eq(workspaces.id, id),
    });
    if (!workspace) return null;

    if (workspace.userId === userId) return workspace;

    const membership = await db.query.workspaceMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.workspaceId, id), eq(m.userId, userId)),
    });

    return membership ? workspace : null;
  } catch (error) {
    console.error("Error looking up workspace by ID:", error);
    return null;
  }
}

export async function updateWorkspaceName(id: string, name: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  const accessible = await getAccessibleWorkspace(id, userId);
  if (!accessible) throw new Error("Forbidden");

  await db.update(workspaces)
    .set({ name, updatedAt: new Date() })
    .where(eq(workspaces.id, id));

  return true;
}

export async function updateWorkspaceOnboarding(id: string, contextPrompt?: string, options?: { businessMode?: 'existing' | 'new'; businessGoal?: string }) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  const accessible = await getAccessibleWorkspace(id, userId);
  if (!accessible) throw new Error("Forbidden");

  const businessMode = options?.businessMode === 'new' ? 'new' : 'existing';
  const businessGoal = options?.businessGoal?.trim() || null;
  const updateData: any = {
    onboardingCompleted: true,
    businessMode,
    businessGoal,
    businessConceptStatus: businessMode === 'new' ? 'pending_research' : 'not_started',
    updatedAt: new Date(),
  };
  if (contextPrompt) {
    updateData.contextPrompt = contextPrompt;

    // Extract product/project name if present in the prompt
    const nameMatch = contextPrompt.match(/(?:Product Name|Project Name|App Name|Name):\s*([^\n]+)/i);
    if (nameMatch && nameMatch[1]?.trim()) {
      updateData.name = nameMatch[1].trim();
    }

    // Extract domain or website URL if present in onboarding context
    const domainMatch = contextPrompt.match(/(?:Domain|Website|Site|URL):\s*([^\n]+)/i) || contextPrompt.match(/https?:\/\/([^\s\/]+)/i);
    if (domainMatch && domainMatch[1]?.trim()) {
      updateData.domain = domainMatch[1].trim().replace(/^https?:\/\//i, '');
    }
  }

  await db.update(workspaces)
    .set(updateData)
    .where(eq(workspaces.id, id));

  if (businessMode === 'existing') {
    const build = await ensureBuild(id);
    if (build.status === 'pending') triggerWorkspaceBuild(id);
  } else {
    await queueNewBusinessResearch(id, userId, businessGoal || '');
  }

  return true;
}

async function queueNewBusinessResearch(workspaceId: string, userId: string, goal: string) {
  const agent = await db.query.agents.findFirst({
    where: (table, helpers) => helpers.and(helpers.eq(table.workspaceId, workspaceId), helpers.eq(table.role, 'Chief of Staff')),
  });
  if (!agent) throw new Error('Workspace agent is not configured');

  const activeTask = await db.query.agentTasks.findFirst({
    where: (table, helpers) => helpers.and(
      helpers.eq(table.workspaceId, workspaceId),
      helpers.eq(table.assignedAgentId, agent.id),
      helpers.eq(table.title, 'Research SaaS business opportunity'),
      helpers.inArray(table.status, ['queued', 'running']),
    ),
  });
  if (activeTask) return activeTask.id;

  const [task] = await db.insert(agentTasks).values({
    workspaceId,
    createdByUserId: userId,
    assignedAgentId: agent.id,
    title: 'Research SaaS business opportunity',
    input: {
      source: 'new_business_research',
      message: `Research and propose a SaaS business based on this user goal:\n\n${goal}\n\nUse authorized research tools to gather real evidence about demand, competitors, audiences, pricing, and distribution. Do not invent sources or evidence. Return a single JSON object with keys: concept, evidence, competitors, audience, valueProposition, monetization, mvp, channels, risks, unknowns. Every evidence item must include a source URL or be marked unknown. The proposal requires user approval before it is treated as the workspace strategy.`,
      maxSteps: 30,
    },
    maxSteps: 30,
    maxCostUsd: 2,
  }).returning();
  await appendAgentTaskEvent({ workspaceId, taskId: task.id, agentId: agent.id, type: 'task_queued', payload: { title: task.title, source: 'new_business_research' } });
  return task.id;
}

export async function updateWorkspaceDomain(id: string, domain: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  const accessible = await getAccessibleWorkspace(id, userId);
  if (!accessible) throw new Error("Forbidden");

  await db.update(workspaces)
    .set({ domain: domain.trim(), updatedAt: new Date() })
    .where(eq(workspaces.id, id));

  return true;
}

export async function approveBusinessConcept(id: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');
  const accessible = await getAccessibleWorkspace(id, userId);
  if (!accessible) throw new Error('Forbidden');
  await db.update(workspaces).set({ businessConceptStatus: 'approved', updatedAt: new Date() }).where(eq(workspaces.id, id));
  return true;
}

export async function requestBusinessConceptChanges(id: string, feedback: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');
  const accessible = await getAccessibleWorkspace(id, userId);
  if (!accessible) throw new Error('Forbidden');
  const trimmed = feedback.trim();
  if (!trimmed) throw new Error('Feedback is required');
  await db.update(workspaces).set({ businessConceptStatus: 'pending_research', updatedAt: new Date() }).where(eq(workspaces.id, id));
  await queueNewBusinessResearch(id, userId, `${accessible.businessGoal || ''}\n\nUser requested these changes to the proposal:\n${trimmed}`);
  return true;
}

export async function regenerateBusinessConcept(id: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');
  const accessible = await getAccessibleWorkspace(id, userId);
  if (!accessible) throw new Error('Forbidden');
  await db.update(workspaces).set({ businessConceptStatus: 'pending_research', updatedAt: new Date() }).where(eq(workspaces.id, id));
  await queueNewBusinessResearch(id, userId, `${accessible.businessGoal || ''}\n\nGenerate a materially different concept from the previous proposal.`);
  return true;
}

export async function getUserWorkspaces() {
  const userId = await getUserId();
  if (!userId) return [];

  const owned = await db.query.workspaces.findMany({
    where: (workspaces, { eq }) => eq(workspaces.userId, userId),
    orderBy: [desc(workspaces.updatedAt)],
  });

  const memberRows = await db.query.workspaceMembers.findMany({
    where: (m, { eq }) => eq(m.userId, userId),
  });

  if (memberRows.length === 0) return owned;

  const memberWsIds = memberRows.map((r) => r.workspaceId);
  const memberWorkspaces = await db.query.workspaces.findMany({
    where: (w, { inArray }) => inArray(w.id, memberWsIds),
  });

  const allMap = new Map();
  owned.forEach((w) => allMap.set(w.id, w));
  memberWorkspaces.forEach((w) => allMap.set(w.id, w));

  return Array.from(allMap.values());
}
