import "server-only";
import { and, asc, eq, lte, or, isNull, lt } from "drizzle-orm";
import { db } from "~/lib/db";
import {
  agentTaskDependencies,
  agentTaskEvents,
  agentTaskRuns,
  agentTasks,
  agents,
} from "~/lib/db/schema";

const LEASE_MS = 15 * 60 * 1000;

export async function appendAgentTaskEvent(input: {
  workspaceId: string;
  taskId: string;
  runId?: string | null;
  agentId?: string | null;
  type: string;
  payload?: Record<string, unknown>;
}) {
  await db.insert(agentTaskEvents).values({
    workspaceId: input.workspaceId,
    taskId: input.taskId,
    runId: input.runId || null,
    agentId: input.agentId || null,
    type: input.type,
    payload: input.payload || {},
  });
}

export async function recoverStaleAgentTasks() {
  const now = new Date();
  const stale = await db
    .update(agentTasks)
    .set({
      status: "queued",
      leaseExpiresAt: null,
      runAfter: now,
      error: "Recovered after an interrupted worker lease.",
      updatedAt: now,
    })
    .where(
      and(
        eq(agentTasks.status, "running"),
        or(
          lt(agentTasks.leaseExpiresAt, now),
          isNull(agentTasks.leaseExpiresAt),
        ),
      ),
    )
    .returning({ id: agentTasks.id, workspaceId: agentTasks.workspaceId });
  return stale;
}

export async function renewAgentTaskLease(taskId: string) {
  const leaseExpiresAt = new Date(Date.now() + LEASE_MS);
  const updated = await db
    .update(agentTasks)
    .set({ leaseExpiresAt, updatedAt: new Date() })
    .where(and(eq(agentTasks.id, taskId), eq(agentTasks.status, "running")))
    .returning({ id: agentTasks.id });
  return updated.length > 0;
}

export async function claimNextAgentTask(workspaceId?: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const now = new Date();
    const candidate = await db
      .select({ task: agentTasks, agent: agents })
      .from(agentTasks)
      .innerJoin(agents, eq(agentTasks.assignedAgentId, agents.id))
      .where(
        and(
          eq(agentTasks.status, "queued"),
          lte(agentTasks.runAfter, now),
          workspaceId ? eq(agentTasks.workspaceId, workspaceId) : undefined,
        ),
      )
      .orderBy(asc(agentTasks.priority), asc(agentTasks.createdAt))
      .limit(1);
    const selected = candidate[0];
    if (!selected) return null;
    const dependencies = await db
      .select({ status: agentTasks.status })
      .from(agentTaskDependencies)
      .innerJoin(
        agentTasks,
        eq(agentTaskDependencies.dependsOnTaskId, agentTasks.id),
      )
      .where(eq(agentTaskDependencies.taskId, selected.task.id));
    if (dependencies.some((dependency) => dependency.status !== "completed")) {
      await db
        .update(agentTasks)
        .set({ runAfter: new Date(now.getTime() + 10_000), updatedAt: now })
        .where(
          and(
            eq(agentTasks.id, selected.task.id),
            eq(agentTasks.status, "queued"),
          ),
        );
      continue;
    }
    const leaseExpiresAt = new Date(now.getTime() + LEASE_MS);
    const claimed = await db
      .update(agentTasks)
      .set({
        status: "running",
        attempts: selected.task.attempts + 1,
        startedAt: selected.task.startedAt || now,
        leaseExpiresAt,
        updatedAt: now,
      })
      .where(
        and(
          eq(agentTasks.id, selected.task.id),
          eq(agentTasks.status, "queued"),
        ),
      )
      .returning();
    if (!claimed.length) continue;
    return { task: claimed[0], agent: selected.agent };
  }
  return null;
}

export async function createAgentRun(
  taskId: string,
  agentId: string,
  attempt: number,
) {
  const [run] = await db
    .insert(agentTaskRuns)
    .values({ taskId, agentId, attempt, status: "running" })
    .returning();
  return run;
}

export async function isAgentTaskCancelled(taskId: string) {
  const task = await db.query.agentTasks.findFirst({
    where: (table, helpers) => helpers.eq(table.id, taskId),
  });
  return task?.status === "cancelled";
}
