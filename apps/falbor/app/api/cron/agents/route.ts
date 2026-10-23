import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/lib/db";
import { agentTasks } from "~/lib/db/schema";
import { executeAgentTask } from "~/lib/agents/runtime";
import {
  claimNextAgentTask,
  recoverStaleAgentTasks,
} from "~/lib/agents/task-queue";
import { executeProductLabTask } from "~/lib/product-lab/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const isLocalWorker =
    /^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/.test(
      request.headers.get("host") || "",
    ) && request.headers.get("Authorization") === "Bearer local-agent-worker";
  if (
    !isLocalWorker &&
    (!cronSecret ||
      request.headers.get("Authorization") !== `Bearer ${cronSecret}`)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const workspaceId =
    typeof body?.workspaceId === "string" ? body.workspaceId : undefined;
  const recovered = await recoverStaleAgentTasks();
  const processed: Array<{ taskId: string; status?: string; error?: string }> =
    [];
  for (let index = 0; index < 5; index += 1) {
    const claimed = await claimNextAgentTask(workspaceId);
    if (!claimed) break;
    const workspace = await db.query.workspaces.findFirst({
      where: (table, helpers) => helpers.eq(table.id, claimed.task.workspaceId),
    });
    if (!workspace) {
      await db
        .update(agentTasks)
        .set({
          status: "failed",
          error: "Workspace not found.",
          updatedAt: new Date(),
        })
        .where(eq(agentTasks.id, claimed.task.id));
      processed.push({
        taskId: claimed.task.id,
        status: "failed",
        error: "Workspace not found.",
      });
      continue;
    }
    const input = (claimed.task.input || {}) as { source?: string };
    const result =
      input.source === "product_lab_simulation"
        ? await executeProductLabTask(claimed.task, workspace)
        : await executeAgentTask(claimed.task, claimed.agent, workspace);
    processed.push({
      taskId: claimed.task.id,
      status: result.status,
      error: result.error,
    });
    if (result.status === "failed") {
      console.error("Agent worker task failed", {
        taskId: claimed.task.id,
        workspaceId: claimed.task.workspaceId,
        source: input.source || "agent",
        error: result.error,
      });
    }
  }
  const failures = processed.filter((item) => item.status === "failed");
  return NextResponse.json({
    ok: failures.length === 0,
    recovered: recovered.length,
    processed,
    failures,
  });
}
