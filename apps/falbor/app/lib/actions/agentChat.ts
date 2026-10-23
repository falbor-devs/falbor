"use client";

import { v4 } from "uuid";
import { aiSidebarStore, AIEvent } from "~/lib/stores/aiSidebar";
import { consumeAgentStream } from "~/lib/agent-ui/consumeStream";
import { beginUiRun } from "~/lib/agent-ui/apply";

import { useMCPStore } from "~/lib/stores/mcp";
import { askProductLabAgents } from "~/lib/actions/productLab";

let controller: AbortController | null = null;

function buildHistory(events: AIEvent[]) {
  return events
    .filter(
      (e) =>
        (e.type === "user" || e.type === "text" || e.type === "chat") &&
        e.status !== "error" &&
        e.title?.trim(),
    )
    .slice(-20)
    .map((e) => ({
      role: e.type === "user" ? "user" : "assistant",
      content: e.title,
    }));
}

export function stopAgent() {
  controller?.abort();
  controller = null;
  aiSidebarStore.settleActive();
  aiSidebarStore.finishGeneration();
}

/** Sends a message to the agent. `apiText` lets the visible bubble differ from what the model receives. */
export async function sendAgentMessage(
  text: string,
  opts: { apiText?: string; imageData?: string } = {},
) {
  const workspaceId = aiSidebarStore.currentWorkspaceId.get();
  if (!workspaceId || aiSidebarStore.isActive.get() || !text.trim()) return;

  const history = buildHistory(aiSidebarStore.events.get());
  const selectedMCPs = useMCPStore.getState().selectedMCPs;
  const currentAgent = aiSidebarStore.currentAgent.get();
  const productLabSimulationId = aiSidebarStore.productLabSimulationId.get();
  const productLabAgentIds = aiSidebarStore.productLabAgentIds.get();
  const userEventId = v4();

  aiSidebarStore.resolvePending(["options", "button"]);
  aiSidebarStore.addEvent({
    id: userEventId,
    requestId: userEventId,
    type: "user",
    title: text,
    status: "completed",
    details: opts.imageData ? ["Image attached"] : undefined,
    selectedMCPs: selectedMCPs.length > 0 ? [...selectedMCPs] : undefined,
  } as any);
  aiSidebarStore.startGeneration();
  beginUiRun();

  if (productLabSimulationId && productLabAgentIds.length) {
    try {
      const result = await askProductLabAgents(
        workspaceId,
        productLabSimulationId,
        productLabAgentIds,
        opts.apiText ?? text,
      );
      for (const response of result.responses) {
        aiSidebarStore.addEvent({
          id: v4(),
          type: "text",
          title: response.content,
          status: "completed",
          agentId: response.agentId,
        } as any);
      }
      aiSidebarStore.finishGeneration();
      aiSidebarStore.persistNow();
    } catch (err: any) {
      aiSidebarStore.addEvent({
        id: v4(),
        type: "text",
        title: `Sorry, I couldn't process your request: ${err?.message ?? "unknown error"}`,
        status: "error",
      });
      aiSidebarStore.finishGeneration();
    }
    return;
  }

  const ctrl = new AbortController();
  controller = ctrl;

  const currentSessionId = aiSidebarStore.currentSessionId.get();

  try {
    const res = await fetch("/api/intelligence/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        sessionId: currentSessionId,
        clientEventId: userEventId,
        message: opts.apiText ?? text,
        imageData: opts.imageData,
        history,
        selectedMCPs,
        agentId: currentAgent?.id,
        browserSessionId: aiSidebarStore.activeBrowserSessionId.get(),
        browserActiveTabId: aiSidebarStore.activeBrowserTabId.get(),
      }),
      signal: ctrl.signal,
    });
    if (res.status === 402) {
      aiSidebarStore.addEvent({
        id: v4(),
        type: "text",
        title: "Not enough credits",
        html: `<div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="i-ph:warning-circle-fill text-lg" />
                <span>Not enough credits</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                You don't have enough credits to run this request. Upgrade your plan or add more credits to continue.
              </p>
              <div className="pt-2">
                <a href="/workspace/${workspaceId}/upgrade" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  <span className="i-ph:sparkle-fill" />
                  Upgrade Plan
                </a>
              </div>
            </div>`,
        status: "error",
      });
      return;
    }
    if (res.status === 204) {
      return;
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(detail.trim() || `AI Agent request failed (${res.status})`);
    }
    if (!res.body) throw new Error("AI Agent returned an empty response");

    const { errors } = await consumeAgentStream(res, {
      onToolCall: (name, args) => {
        if (name === "ui_update_agent_contact_table") {
          const existingContactEvent = [...aiSidebarStore.events.get()]
            .reverse()
            .find((e) => e.title === "Updated Contact Table");
          const targetId = existingContactEvent?.id || v4();

          aiSidebarStore.upsertEvent({
            id: targetId,
            type: "text",
            title: "Updated Contact Table",
            html: `\`\`\`json\n${JSON.stringify(args?.prospects || [], null, 2)}\n\`\`\``,
            status: "completed",
          });
        } else if (name === "ui_update_signal_posts") {
          const existingEvent = [...aiSidebarStore.events.get()]
            .reverse()
            .find((e) => e.title === "Signal Radar Updated");
          const targetId = existingEvent?.id || v4();

          aiSidebarStore.upsertEvent({
            id: targetId,
            type: "text",
            title: "Signal Radar Updated",
            html: `\`\`\`signal_posts\n${JSON.stringify(args?.posts || [], null, 2)}\n\`\`\``,
            status: "completed",
          });
        } else if (name === "ui_update_brand_mention_posts") {
          const existingEvent = [...aiSidebarStore.events.get()]
            .reverse()
            .find((e) => e.title === "Mentions Updated");
          const targetId = existingEvent?.id || v4();

          aiSidebarStore.upsertEvent({
            id: targetId,
            type: "text",
            title: "Mentions Updated",
            html: `\`\`\`mention_posts\n${JSON.stringify(args?.posts || [], null, 2)}\n\`\`\``,
            status: "completed",
          });
        } else if (name === "ui_generate_source_post") {
          const existingEvent = [...aiSidebarStore.events.get()]
            .reverse()
            .find((e) => e.title === "Source Post Generated");
          const targetId = existingEvent?.id || v4();

          aiSidebarStore.upsertEvent({
            id: targetId,
            type: "text",
            title: "Source Post Generated",
            html: `\`\`\`source_post\n${JSON.stringify(args || {}, null, 2)}\n\`\`\``,
            status: "completed",
          });
        } else if (name === "run_browser_task") {
          const existingBrowserEvent = [...aiSidebarStore.events.get()]
            .reverse()
            .find((e) => e.type === "browser");
          const targetId = existingBrowserEvent?.id || v4();

          aiSidebarStore.upsertEvent({
            id: targetId,
            type: "browser",
            title: args?.task
              ? `Browser Task: ${args.task}`
              : "Browser Use Session",
            status: "active",
            browserSession: {
              url: args?.startUrl || "https://cloud.browser-use.com",
              statusText: "Navigating browser microVM...",
              isFinished: false,
            },
          });
        }
      },
      onToolResult: (name, result) => {
        if (name === "run_browser_task" && result) {
          const existingBrowserEvent = [...aiSidebarStore.events.get()]
            .reverse()
            .find((e) => e.type === "browser");
          const targetId = existingBrowserEvent?.id || v4();

          const outputFiles =
            result.data?.outputFiles ||
            result.outputFiles ||
            result.files ||
            [];
          const foundVideo = outputFiles.find((f: any) =>
            typeof f === "string"
              ? /\.(mp4|webm)$/i.test(f)
              : /\.(mp4|webm)$/i.test(f.url || f.path || f.file || ""),
          );
          const recordingUrl =
            result.recordingUrl ||
            (typeof foundVideo === "string"
              ? foundVideo
              : foundVideo?.url || foundVideo?.path);
          const liveStreamUrl = result.liveStreamUrl || result.liveUrl;

          aiSidebarStore.upsertEvent({
            id: targetId,
            type: "browser",
            title: result.task
              ? `Browser Task: ${result.task}`
              : "Browser Use Session",
            status:
              result.status === "completed" || recordingUrl
                ? "completed"
                : "active",
            browserSession: {
              url:
                result.url ||
                existingBrowserEvent?.browserSession?.url ||
                "https://cloud.browser-use.com",
              liveStreamUrl:
                liveStreamUrl ||
                existingBrowserEvent?.browserSession?.liveStreamUrl,
              recordingUrl:
                recordingUrl ||
                existingBrowserEvent?.browserSession?.recordingUrl,
              statusText:
                result.status === "completed" || recordingUrl
                  ? "Browser task finished"
                  : "Navigating browser microVM...",
              isFinished:
                result.status === "completed" || Boolean(recordingUrl),
            },
          });
        }
      },
    }, userEventId);
    if (errors.length) throw new Error(errors[0]);
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      aiSidebarStore.addEvent({
        id: v4(),
        type: "text",
        title: `Sorry, I couldn't process your request: ${err?.message ?? "unknown error"}`,
        status: "error",
      });
    }
  } finally {
    if (controller === ctrl) controller = null;
    const isCurrentSession =
      aiSidebarStore.currentWorkspaceId.get() === workspaceId &&
      aiSidebarStore.currentSessionId.get() === currentSessionId;
    if (isCurrentSession) {
      aiSidebarStore.settleActive();
      aiSidebarStore.finishGeneration();
      aiSidebarStore.persistNow();
    }
  }
}
