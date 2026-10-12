'use server';

import { db } from '~/lib/db';
import { agents, users } from '~/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import { BILLING_CONFIG, PlanId } from '~/lib/billing/config';

export async function createAgent(workspaceId: string, data: any) {
  try {
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
        userId: user.id,
        name: data.name,
        role: data.role,
        goal: data.goal,
        instructions: data.instructions,
        memory: data.memory,
        tools: data.tools || [],
        knowledge: data.knowledge || [],
        permissions: data.permissions || [],
        model: data.model || 'gpt-4o',
        avatarUrl: data.avatarUrl,
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
    const authUser = await getAuthUserDetails();
    if (!authUser) return [];

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, authUser.email),
    });

    if (!user) return [];

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
    const authUser = await getAuthUserDetails();
    if (!authUser) return null;

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
    const authUser = await getAuthUserDetails();
    if (!authUser) return false;

    const [updatedAgent] = await db
      .update(agents)
      .set({
        name: data.name,
        role: data.role,
        goal: data.goal,
        instructions: data.instructions,
        memory: data.memory,
        tools: data.tools || [],
        knowledge: data.knowledge || [],
        permissions: data.permissions || [],
        model: data.model || 'gpt-4o',
        avatarUrl: data.avatarUrl,
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
    const authUser = await getAuthUserDetails();
    if (!authUser) return false;

    await db
      .delete(agents)
      .where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)));

    return true;
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return false;
  }
}


