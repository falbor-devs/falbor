import { streamText } from 'ai';
import { db } from '~/lib/db';
import { agentSessions, agentTasks } from '~/lib/db/schema';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import { and, eq } from 'drizzle-orm';
import {
  getAgentModel,
  buildAgentSystemPrompt,
  buildAgentTools,
  sanitizeHistory,
} from '~/lib/agent/core';
import { buildChatAgentTools } from '~/lib/agents/chat-tools';
import { LOCAL_AGENT_MODEL } from '~/lib/agents/local-model';

export async function POST(req: Request) {
  const body = await req.json();

  if (body.errorLog) {
    console.log('\n\n===========================================');
    console.log('🚨 CANVAS TOOL ZOD VALIDATION ERROR DETECTED 🚨');
    console.log(JSON.stringify(body.errorLog, null, 2));
    console.log('===========================================\n\n');
    return new Response('Logged', { status: 200 });
  }

  const { workspaceId, sessionId, clientEventId, message, history, selectedMCPs, agentId, imageData } = body;
  const requestId = typeof clientEventId === 'string' && clientEventId.trim()
    ? clientEventId
    : `request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const authUser = await getAuthUserDetails();
  if (!authUser) return new Response('Unauthorized', { status: 401 });
  const user = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.email, authUser.email) });
  if (!user) return new Response('Unauthorized', { status: 401 });

  const workspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq }) => eq(workspaces.id, workspaceId),
  });

  if (!workspace) return new Response('Workspace not found', { status: 404 });

  if (workspace.userId !== user.id) {
    const membership = await db.query.workspaceMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, user.id)),
    });
    if (!membership) return new Response('Unauthorized workspace member', { status: 403 });
  }

  if (typeof message !== 'string' || !message.trim()) return new Response('Bad request', { status: 400 });
  const validImageData = typeof imageData === 'string' && /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageData) && imageData.length <= 12_000_000 ? imageData : null;

  let agent = null;
  if (agentId) {
    const { agents } = await import('~/lib/db/schema');
    const { eq } = await import('drizzle-orm');
    agent = await db.query.agents.findFirst({
      where: (table, helpers) => helpers.and(helpers.eq(table.id, agentId), helpers.eq(table.workspaceId, workspaceId)),
    });
  }

  const isLocalAgent = agent?.model === LOCAL_AGENT_MODEL;
  if (user.balance !== null && Number(user.balance) <= 0 && !isLocalAgent) {
    return new Response('INSUFFICIENT_CREDITS', { status: 402 });
  }

  if (Array.isArray(selectedMCPs) && selectedMCPs.length > 0) {
    try {
      const { mcpConnections } = await import('~/lib/db/schema');
      const { eq } = await import('drizzle-orm');
      const userConnections = await db
        .select()
        .from(mcpConnections)
        .where(eq(mcpConnections.userId, user.id));

      const mcpServers: Record<string, any> = {};
      userConnections.forEach((conn: any) => {
        if (conn.connectorId && conn.config) {
          mcpServers[conn.connectorId] = conn.config;
        }
      });

      if (Object.keys(mcpServers).length > 0) {
        const { MCPService } = await import('~/lib/services/mcpService');
        await MCPService.getInstance().updateConfig({ mcpServers });
      }
    } catch (err) {
      console.error('Failed to sync MCP connections from DB for AI agent:', err);
    }
  }

  const agentTools = await buildAgentTools(workspace, selectedMCPs, user.id, body.browserSessionId, body.browserActiveTabId);
  let chatTask: { id: string } | null = null;

  if (sessionId) {
    const [session] = await db
      .select({ events: agentSessions.events, agentId: agentSessions.agentId })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.id, sessionId),
        eq(agentSessions.workspaceId, workspaceId),
        eq(agentSessions.userId, user.id),
      ));

    if (!session) return new Response('Agent session not found', { status: 404 });
    if (agent && session.agentId !== agent.id) {
      return new Response('Agent session does not belong to this agent', { status: 409 });
    }

    const existingEvents = Array.isArray(session.events) ? [...session.events] : [];
    const duplicate = existingEvents.some((event: any) => event?.requestId === requestId || event?.id === requestId);
    if (duplicate) return new Response(null, { status: 204 });

    existingEvents.push({
      id: requestId,
      requestId,
      type: 'user',
      title: message,
      status: 'completed',
      selectedMCPs: Array.isArray(selectedMCPs) && selectedMCPs.length > 0 ? selectedMCPs : undefined,
    });
    await db
      .update(agentSessions)
      .set({ events: existingEvents, updatedAt: new Date() })
      .where(and(
        eq(agentSessions.id, sessionId),
        eq(agentSessions.workspaceId, workspaceId),
        eq(agentSessions.userId, user.id),
      ));

  }

  if (agent) {
    const [createdTask] = await db.insert(agentTasks).values({
      workspaceId,
      createdByUserId: user.id,
      assignedAgentId: agent.id,
      title: message.slice(0, 200),
      input: { message, sessionId: sessionId || null, source: 'agent_chat', requestId },
      status: 'running',
      leaseExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      maxSteps: 20,
      maxCostUsd: 1,
    }).returning({ id: agentTasks.id });
    chatTask = createdTask || null;
  }
  const collaborationTools = agent && chatTask
    ? buildChatAgentTools({ workspaceId, userId: user.id, agentId: agent.id, parentTaskId: chatTask.id })
    : {};

  const result = streamText({
    model: getAgentModel(agent?.model || undefined),
    system: buildAgentSystemPrompt(workspace, 'web', selectedMCPs, agent),
    messages: [...sanitizeHistory(history), validImageData ? { role: 'user' as const, content: [{ type: 'text' as const, text: message }, { type: 'image' as const, image: validImageData }] } : { role: 'user' as const, content: message }],
    tools: { ...agentTools, ...collaborationTools },
    maxSteps: 20,
    maxTokens: 3000,
    onStepFinish: async (step) => {
      try {
        if (!sessionId) return;

        const [session] = await db
          .select({ events: agentSessions.events })
          .from(agentSessions)
          .where(and(
            eq(agentSessions.id, sessionId),
            eq(agentSessions.workspaceId, workspaceId),
            eq(agentSessions.userId, user.id),
          ));

        const existingEvents = Array.isArray(session?.events) ? [...session.events] : [];

        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const tc of step.toolCalls) {
            const alreadyExists = existingEvents.some((e: any) => e.id === tc.toolCallId);
            if (!alreadyExists) {
              existingEvents.push({
                id: tc.toolCallId,
                requestId,
                type: 'tool',
                title: tc.toolName,
                status: 'completed',
                toolInvocations: [
                  {
                    type: 'tool-invocation',
                    toolInvocation: {
                      state: 'call',
                      toolCallId: tc.toolCallId,
                      toolName: tc.toolName,
                      args: tc.args,
                    },
                  },
                ],
              });
            }
          }
        }

        if (step.text && step.text.trim()) {
          const stepText = step.text.trim();
          const existingResponse = existingEvents.find((event: any) => event.requestId === requestId && event.type === 'text');
          if (existingResponse) {
            existingResponse.title = stepText;
            existingResponse.status = 'completed';
          } else {
            existingEvents.push({
              id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              requestId,
              type: 'text',
              title: stepText,
              status: 'completed',
            });
          }
        }

        await db
          .update(agentSessions)
          .set({ events: existingEvents, updatedAt: new Date() })
          .where(and(
            eq(agentSessions.id, sessionId),
            eq(agentSessions.workspaceId, workspaceId),
            eq(agentSessions.userId, user.id),
          ));
      } catch (err) {
        console.error('Error in onStepFinish persisting events:', err);
      }
    },
    onFinish: async ({ usage, text }) => {
      try {
        if (chatTask) {
          await db.update(agentTasks).set({ status: 'completed', result: { text, source: 'agent_chat' }, completedAt: new Date(), leaseExpiresAt: null, updatedAt: new Date() }).where(and(eq(agentTasks.id, chatTask.id), eq(agentTasks.workspaceId, workspaceId), eq(agentTasks.createdByUserId, user.id)));
        }
        if (sessionId && text && text.trim()) {
          const [session] = await db
            .select({ events: agentSessions.events })
            .from(agentSessions)
            .where(and(
              eq(agentSessions.id, sessionId),
              eq(agentSessions.workspaceId, workspaceId),
              eq(agentSessions.userId, user.id),
            ));

          const existingEvents = Array.isArray(session?.events) ? [...session.events] : [];
          const textTrimmed = text.trim();
          const existingResponse = existingEvents.find((event: any) => event.requestId === requestId && event.type === 'text');

          if (existingResponse) {
            existingResponse.title = textTrimmed;
            existingResponse.status = 'completed';
            await db
              .update(agentSessions)
              .set({ events: existingEvents, updatedAt: new Date() })
              .where(and(
                eq(agentSessions.id, sessionId),
                eq(agentSessions.workspaceId, workspaceId),
                eq(agentSessions.userId, user.id),
              ));
          } else {
            existingEvents.push({
              id: `finish-${Date.now()}`,
              requestId,
              type: 'text',
              title: textTrimmed,
              status: 'completed',
            });
            await db
              .update(agentSessions)
              .set({ events: existingEvents, updatedAt: new Date() })
              .where(and(
                eq(agentSessions.id, sessionId),
                eq(agentSessions.workspaceId, workspaceId),
                eq(agentSessions.userId, user.id),
              ));
          }
        }
      } catch (err) {
        console.error('Error persisting final agent events on finish:', err);
      }

      try {
        if (isLocalAgent) return;
        const { calculateCreditCost } = await import('~/lib/billing/config');
        const { users } = await import('~/lib/db/schema');
        const { eq, sql } = await import('drizzle-orm');
        const totalTokens = usage?.totalTokens || 500;
        const tier = (user.subscriptionTier || 'free').toLowerCase() as any;
        const creditCost = Math.max(1, Math.round(calculateCreditCost(totalTokens, 'gpt-4o', tier)));

        await db
          .update(users)
          .set({ balance: sql`${users.balance} - ${creditCost}` })
          .where(eq(users.id, user.id));
      } catch (err) {
        console.error('Error deducting credits for agent stream:', err);
      }
    },
  });

  return result.toDataStreamResponse({
    getErrorMessage: (error) => (error instanceof Error ? error.message : String(error)),
  });
}
