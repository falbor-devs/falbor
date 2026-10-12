import { streamText } from 'ai';
import { db } from '~/lib/db';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import {
  getAgentModel,
  buildAgentSystemPrompt,
  buildAgentTools,
  sanitizeHistory,
} from '~/lib/agent/core';

export async function POST(req: Request) {
  const body = await req.json();

  if (body.errorLog) {
    console.log('\n\n===========================================');
    console.log('🚨 CANVAS TOOL ZOD VALIDATION ERROR DETECTED 🚨');
    console.log(JSON.stringify(body.errorLog, null, 2));
    console.log('===========================================\n\n');
    return new Response('Logged', { status: 200 });
  }

  const { workspaceId, sessionId, message, history, selectedMCPs, agentId } = body;

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

  if (user.balance !== null && Number(user.balance) <= 0) {
    return new Response('INSUFFICIENT_CREDITS', { status: 402 });
  }

  if (typeof message !== 'string' || !message.trim()) return new Response('Bad request', { status: 400 });

  let agent = null;
  if (agentId) {
    const { agents } = await import('~/lib/db/schema');
    const { eq } = await import('drizzle-orm');
    agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });
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

  const accumulatedEvents: any[] = [];
  if (Array.isArray(body.historyEvents)) {
    accumulatedEvents.push(...body.historyEvents);
  }

  const result = streamText({
    model: getAgentModel(),
    system: buildAgentSystemPrompt(workspace, 'web', selectedMCPs, agent),
    messages: [...sanitizeHistory(history), { role: 'user' as const, content: message }],
    tools: agentTools,
    maxSteps: 20,
    maxTokens: 3000,
    onStepFinish: async (step) => {
      try {
        if (!sessionId) return;
        const { agentSessions } = await import('~/lib/db/schema');
        const { eq } = await import('drizzle-orm');

        const [session] = await db
          .select({ events: agentSessions.events })
          .from(agentSessions)
          .where(eq(agentSessions.id, sessionId));

        const existingEvents = Array.isArray(session?.events) ? [...session.events] : [];

        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const tc of step.toolCalls) {
            const alreadyExists = existingEvents.some((e: any) => e.id === tc.toolCallId);
            if (!alreadyExists) {
              existingEvents.push({
                id: tc.toolCallId,
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
          const lastEvent = existingEvents[existingEvents.length - 1];
          if (lastEvent && lastEvent.type === 'text' && lastEvent.status === 'active') {
            lastEvent.title = stepText;
            lastEvent.status = 'completed';
          } else {
            existingEvents.push({
              id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: 'text',
              title: stepText,
              status: 'completed',
            });
          }
        }

        await db
          .update(agentSessions)
          .set({ events: existingEvents, updatedAt: new Date() })
          .where(eq(agentSessions.id, sessionId));
      } catch (err) {
        console.error('Error in onStepFinish persisting events:', err);
      }
    },
    onFinish: async ({ usage, text }) => {
      try {
        if (sessionId && text && text.trim()) {
          const { agentSessions } = await import('~/lib/db/schema');
          const { eq } = await import('drizzle-orm');
          const [session] = await db
            .select({ events: agentSessions.events })
            .from(agentSessions)
            .where(eq(agentSessions.id, sessionId));

          const existingEvents = Array.isArray(session?.events) ? [...session.events] : [];
          const textTrimmed = text.trim();
          const alreadyLogged = existingEvents.some(
            (e: any) => e.type === 'text' && (e.title === textTrimmed || textTrimmed.includes(e.title))
          );

          if (!alreadyLogged) {
            existingEvents.push({
              id: `finish-${Date.now()}`,
              type: 'text',
              title: textTrimmed,
              status: 'completed',
            });
            await db
              .update(agentSessions)
              .set({ events: existingEvents, updatedAt: new Date() })
              .where(eq(agentSessions.id, sessionId));
          }
        }
      } catch (err) {
        console.error('Error persisting final agent events on finish:', err);
      }

      try {
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