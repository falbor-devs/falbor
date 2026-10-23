'use server';

import { db } from '~/lib/db';
import { agents, users } from '~/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import { BILLING_CONFIG, PlanId } from '~/lib/billing/config';
import { requireWorkspaceActor } from '~/lib/agents/authorization';
import { z } from 'zod';
import { getDefaultAgentModel, isLocalAgentModel, isLocalAgentRuntimeAvailable } from '~/lib/agents/local-model';

const AGENT_PERMISSION_KEYS = ['tasks.execute', 'tasks.delegate', 'tasks.replan', 'external.read', 'external.write', 'external.send', 'external.publish', 'spend.money'] as const;
const LEGACY_PERMISSION_KEYS: Record<string, string> = {
  'Read Files': 'external.read',
  'Write Files': 'external.write',
  'Execute Code': 'tasks.execute',
  'Send Messages': 'external.send',
};
const agentPermissionSchema = z.string().trim().max(120).transform((permission) => LEGACY_PERMISSION_KEYS[permission] || permission);

const agentInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  goal: z.string().trim().max(4000).optional().default(''),
  instructions: z.string().trim().max(12000).optional().default(''),
  memory: z.string().trim().max(12000).optional().default(''),
  tools: z.array(z.string().trim().max(120)).max(30).optional().default([]),
  knowledge: z.array(z.string().trim().max(2000)).max(100).optional().default([]),
  permissions: z.array(agentPermissionSchema).max(30).optional().default([]).transform((permissions) => Array.from(new Set(permissions))).refine((permissions) => permissions.every((permission) => AGENT_PERMISSION_KEYS.includes(permission as typeof AGENT_PERMISSION_KEYS[number])), 'Unsupported agent permission'),
  model: z.string().trim().min(1).max(160).optional().default(getDefaultAgentModel()),
  avatarUrl: z.string().max(1000000).optional().nullable(),
});

const FALBOR_AGENT_TEMPLATE = {
  name: 'Falbor Agent',
  role: 'Chief of Staff',
  goal: 'Coordinate workspace work, research, and execution through authorized tools and collaborating agents.',
  instructions: 'Act as the user\'s default Falbor workspace agent. Use the available tools, inspect real results, collaborate through persisted tasks, and report verified outcomes separately from completed actions.',
  memory: '',
  tools: ['Web Search Browser', 'MCP'],
  knowledge: [],
  permissions: ['tasks.execute', 'tasks.delegate', 'tasks.replan', 'external.read'],
  model: getDefaultAgentModel(),
  avatarUrl: null,
};

export async function ensureFalborAgent(workspaceId: string) {
  const actor = await requireWorkspaceActor(workspaceId);
  const existing = await db.query.agents.findFirst({
    where: (table, helpers) => helpers.and(helpers.eq(table.workspaceId, workspaceId), helpers.eq(table.name, FALBOR_AGENT_TEMPLATE.name)),
  });
  if (!existing) await db.insert(agents).values({ workspaceId, userId: actor.user.id, ...FALBOR_AGENT_TEMPLATE });
  return db.query.agents.findFirst({
    where: (table, helpers) => helpers.and(helpers.eq(table.workspaceId, workspaceId), helpers.eq(table.name, FALBOR_AGENT_TEMPLATE.name)),
  });
}

export async function createAgent(workspaceId: string, data: any) {
  try {
    const actor = await requireWorkspaceActor(workspaceId, 'editor');
    const parsed = agentInputSchema.parse(data);
    if (isLocalAgentModel(parsed.model) && !isLocalAgentRuntimeAvailable()) return { error: 'The Open Source Agent is only available when the local Agent Model runtime is configured.' };
    const authUser = await getAuthUserDetails();
    if (!authUser) return { error: 'Unauthorized' };

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, authUser.email),
    });

    if (!user?.id) return { error: 'User not found' };

    const tier = (user.subscriptionTier || 'free').toLowerCase() as PlanId;
    const planConfig = BILLING_CONFIG.plans[tier] || BILLING_CONFIG.plans.free;

    if (planConfig.maxAgents !== 'unlimited') {
      const [existingCount] = await db
        .select({ val: count() })
        .from(agents)
        .where(eq(agents.workspaceId, workspaceId));

      if ((existingCount?.val || 0) >= planConfig.maxAgents) {
        return {
          error: `Free plan is limited to ${planConfig.maxAgents} Agents per workspace. Please upgrade your plan for unlimited agents.`,
          requiresUpgrade: true,
        };
      }
    }

    const [newAgent] = await db
      .insert(agents)
      .values({
        workspaceId,
        userId: actor.user.id,
        name: parsed.name,
        role: parsed.role,
        goal: parsed.goal,
        instructions: parsed.instructions,
        memory: parsed.memory,
        tools: parsed.tools,
        knowledge: parsed.knowledge,
        permissions: parsed.permissions,
        model: parsed.model,
        avatarUrl: parsed.avatarUrl,
      })
      .returning();

    return { agent: newAgent };
  } catch (error: any) {
    console.error('Failed to create agent:', error);
    return { error: error.message || 'Failed to create agent' };
  }
}

export async function getAgentsList(workspaceId: string) {
  try {
    await ensureFalborAgent(workspaceId);

    const agentList = await db
      .select()
      .from(agents)
      .where(eq(agents.workspaceId, workspaceId))
      .orderBy(desc(agents.createdAt));

    return agentList;
  } catch (error) {
    console.error('Failed to get agents list:', error);
    return [];
  }
}

export async function getAgentById(workspaceId: string, agentId: string) {
  try {
    await requireWorkspaceActor(workspaceId);

    const agent = await db.query.agents.findFirst({
      where: (a, { eq, and }) => and(eq(a.id, agentId), eq(a.workspaceId, workspaceId)),
    });

    return agent || null;
  } catch (error) {
    console.error('Failed to get agent by id:', error);
    return null;
  }
}

export async function updateAgent(workspaceId: string, agentId: string, data: any) {
  try {
    await requireWorkspaceActor(workspaceId, 'editor');
    const parsed = agentInputSchema.parse(data);
    if (isLocalAgentModel(parsed.model) && !isLocalAgentRuntimeAvailable()) return false;

    const [updatedAgent] = await db
      .update(agents)
      .set({
        name: parsed.name,
        role: parsed.role,
        goal: parsed.goal,
        instructions: parsed.instructions,
        memory: parsed.memory,
        tools: parsed.tools,
        knowledge: parsed.knowledge,
        permissions: parsed.permissions,
        model: parsed.model,
        avatarUrl: parsed.avatarUrl,
        updatedAt: new Date(),
      })
      .where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))
      .returning();

    return updatedAgent || true;
  } catch (error) {
    console.error('Failed to update agent:', error);
    return false;
  }
}

export async function deleteAgent(workspaceId: string, agentId: string) {
  try {
    await requireWorkspaceActor(workspaceId, 'editor');

    await db
      .delete(agents)
      .where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)));

    return true;
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return false;
  }
}
