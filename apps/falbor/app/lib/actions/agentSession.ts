'use server';

import { db } from '~/lib/db';
import { agentSessions, users } from '~/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';

export async function getAgentSessionsList(workspaceId: string) {
  try {
    const authUser = await getAuthUserDetails();
    if (!authUser) return [];

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, authUser.email),
    });

    if (!user) return [];

    let sessionsQuery = db.select().from(agentSessions).where(
      and(eq(agentSessions.workspaceId, workspaceId), eq(agentSessions.userId, user.id))
    ).orderBy(desc(agentSessions.updatedAt));

    const sessions = await sessionsQuery;

    return sessions.map(s => ({
      id: s.id,
      agentId: s.agentId,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      events: (s.events as any[]) || [],
    }));
  } catch (error) {
    console.error('Failed to get agent sessions list:', error);
    return [];
  }
}

export async function createNewAgentSession(workspaceId: string, title?: string, agentId?: string) {
  try {
    const authUser = await getAuthUserDetails();
    if (!authUser) return null;

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, authUser.email),
    });

    if (!user?.id) return null;

    const formattedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const sessionTitle = title || `Chat ${formattedDate}`;

    const [newSession] = await db.insert(agentSessions).values({
      workspaceId,
      userId: user.id,
      title: sessionTitle,
      events: [],
      agentId: agentId || null,
    }).returning();

    return newSession;
  } catch (error) {
    console.error('Failed to create new agent session:', error);
    return null;
  }
}

export async function getOrCreateAgentSessionForAgent(workspaceId: string, agentId: string | null) {
  try {
    const authUser = await getAuthUserDetails();
    if (!authUser) return null;

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, authUser.email),
    });

    if (!user?.id) return null;

    let condition = and(
      eq(agentSessions.workspaceId, workspaceId),
      eq(agentSessions.userId, user.id)
    );

    // Drizzle doesn't perfectly handle `eq(col, null)` so we use isNull for null checks,
    // but here we just grab the first one that matches the agentId
    let sessions;
    if (agentId) {
      sessions = await db.select().from(agentSessions).where(
        and(condition, eq(agentSessions.agentId, agentId))
      ).orderBy(desc(agentSessions.updatedAt)).limit(1);
    } else {
      sessions = await db.select().from(agentSessions).where(
        condition // For template agent, we could just grab the first session or one without agentId, but let's just grab the most recent one overall if no agentId.
      ).orderBy(desc(agentSessions.updatedAt)).limit(1);
    }

    if (sessions.length > 0) {
      return sessions[0];
    }

    // If none exists, create one
    return await createNewAgentSession(workspaceId, undefined, agentId || undefined);
  } catch (error) {
    console.error('Failed to get or create agent session:', error);
    return null;
  }
}

export async function renameAgentSession(sessionId: string, newTitle: string) {
  try {
    await db.update(agentSessions)
      .set({ title: newTitle, updatedAt: new Date() })
      .where(eq(agentSessions.id, sessionId));
    return true;
  } catch (error) {
    console.error('Failed to rename agent session:', error);
    return false;
  }
}

export async function deleteAgentSession(sessionId: string) {
  try {
    await db.delete(agentSessions).where(eq(agentSessions.id, sessionId));
    return true;
  } catch (error) {
    console.error('Failed to delete agent session:', error);
    return false;
  }
}

export async function getAgentSessionEvents(workspaceId: string, sessionId?: string) {
  try {
    const authUser = await getAuthUserDetails();
    if (!authUser) return { id: null, title: 'Onboarding', events: [] };

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, authUser.email),
    });

    if (!user) return { id: null, title: 'Onboarding', events: [] };

    let session;
    if (sessionId) {
      const [found] = await db.select().from(agentSessions).where(
        and(eq(agentSessions.id, sessionId), eq(agentSessions.workspaceId, workspaceId), eq(agentSessions.userId, user.id))
      );
      session = found;
    } else {
      const [found] = await db.select().from(agentSessions).where(
        and(eq(agentSessions.workspaceId, workspaceId), eq(agentSessions.userId, user.id))
      ).orderBy(desc(agentSessions.updatedAt));
      session = found;
    }

    if (!session) {
      const formattedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const [created] = await db.insert(agentSessions).values({
        workspaceId,
        userId: user.id,
        title: `Onboarding (${formattedDate})`,
        events: [],
      }).returning();
      return { id: created.id, title: created.title, events: [] };
    }

    return { id: session.id, title: session.title, events: (session.events as any[]) || [] };
  } catch (error) {
    console.error('Failed to get agent session events:', error);
    return { id: null, title: 'Onboarding', events: [] };
  }
}

export async function saveAgentSessionEvents(workspaceId: string, events: any[], sessionId?: string) {
  try {
    const authUser = await getAuthUserDetails();
    if (!authUser) return;

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, authUser.email),
    });

    if (!user?.id) return;

    const mergeEvents = (current: any[], incoming: any[]) => {
      if (incoming.length === 0) return [];
      const byId = new Map<string, any>();
      const order: string[] = [];
      const requestEventIds = new Map<string, string>();
      for (const event of current) {
        if (!event?.id || byId.has(event.id)) continue;
        byId.set(event.id, event);
        order.push(event.id);
        if (event.requestId && (event.type === 'user' || event.type === 'text')) {
          requestEventIds.set(`${event.requestId}:${event.type}`, event.id);
        }
      }
      for (const event of incoming) {
        if (!event?.id) continue;
        const requestKey = event.requestId && (event.type === 'user' || event.type === 'text')
          ? `${event.requestId}:${event.type}`
          : null;
        const existingId = requestKey ? requestEventIds.get(requestKey) : undefined;
        if (existingId) {
          byId.set(existingId, { ...byId.get(existingId), ...event, id: existingId });
          continue;
        }
        if (!byId.has(event.id)) order.push(event.id);
        byId.set(event.id, event);
        if (requestKey) requestEventIds.set(requestKey, event.id);
      }
      return order.map((id) => byId.get(id)).filter(Boolean);
    };

    if (sessionId) {
      const [existingSession] = await db
        .select({ events: agentSessions.events })
        .from(agentSessions)
        .where(and(
          eq(agentSessions.id, sessionId),
          eq(agentSessions.workspaceId, workspaceId),
          eq(agentSessions.userId, user.id),
        ));
      const currentEvents = Array.isArray(existingSession?.events) ? existingSession.events : [];
      await db
        .update(agentSessions)
        .set({ events: mergeEvents(currentEvents, events), updatedAt: new Date() })
        .where(and(eq(agentSessions.id, sessionId), eq(agentSessions.workspaceId, workspaceId), eq(agentSessions.userId, user.id)));
    } else {
      const [existingSession] = await db.select().from(agentSessions).where(
        and(eq(agentSessions.workspaceId, workspaceId), eq(agentSessions.userId, user.id))
      );

      if (existingSession) {
        await db
          .update(agentSessions)
          .set({ events: mergeEvents(Array.isArray(existingSession.events) ? existingSession.events : [], events), updatedAt: new Date() })
          .where(eq(agentSessions.id, existingSession.id));
      } else {
        await db.insert(agentSessions).values({
          workspaceId,
          userId: user.id,
          title: 'Onboarding',
          events,
        });
      }
    }
  } catch (error) {
    console.error('Failed to save agent session events:', error);
  }
}
