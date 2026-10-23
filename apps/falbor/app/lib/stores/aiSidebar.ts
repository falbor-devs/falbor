import { atom } from "nanostores";
import { saveAgentSessionEvents } from "~/lib/actions/agentSession";

export type AIEventType =
  // Agent-controlled primitives
  | "user"
  | "status"
  | "text"
  | "button"
  | "progress"
  | "options"
  | "links"
  | "widget"
  | "browser"
  // Legacy types kept only so old saved sessions still render
  | "thinking"
  | "searching"
  | "reading"
  | "planning"
  | "done"
  | "chat";

export type AIEventStatus = "pending" | "active" | "completed" | "error";

export type AIEvent = {
  id: string;
  type: AIEventType;
  requestId?: string;
  title: string;
  details?: string[];
  links?: { url: string; title: string; favicon?: string }[];
  status: AIEventStatus;
  action?: string;
  progressValue?: number;
  html?: string;
  recommended?: string;
  browserSession?: {
    url: string;
    liveStreamUrl?: string;
    recordingUrl?: string;
    statusText?: string;
    actionText?: string;
    isFinished?: boolean;
  };
};

const OPEN_STATE_KEY = "falbor_ai_agent_open";

const getInitialOpenState = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(OPEN_STATE_KEY) === "true";
  } catch (e) {
    return false;
  }
};

const saveOpenState = (open: boolean) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OPEN_STATE_KEY, String(open));
  } catch (e) {}
};

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const aiSidebarStore = {
  isOpen: atom<boolean>(getInitialOpenState()),
  isActive: atom<boolean>(false),
  isBrowserOpen: atom<boolean>(false),
  activeBrowserSessionId: atom<string | null>(null),
  activeBrowserDebugUrl: atom<string | null>(null),
  activeBrowserTabId: atom<number>(0),
  events: atom<AIEvent[]>([]),
  currentWorkspaceId: atom<string | null>(null),
  currentSessionId: atom<string | null>(null),
  currentSessionTitle: atom<string>("Onboarding"),
  currentAgent: atom<any>(null),
  productLabSimulationId: atom<string | null>(null),
  productLabAgents: atom<Array<{ id: string; name: string; role?: string }>>(
    [],
  ),
  productLabAgentIds: atom<string[]>([]),
  productLabChatMode: atom<boolean>(false),

  setWorkspace(
    workspaceId: string,
    initialEvents: AIEvent[] = [],
    sessionId: string | null = null,
    title: string = "Onboarding",
  ) {
    this.currentWorkspaceId.set(workspaceId);
    this.events.set(initialEvents);
    this.currentSessionId.set(sessionId);
    this.currentSessionTitle.set(title);
    this.isBrowserOpen.set(false);
  },

  setSession(sessionId: string | null, title: string, events: AIEvent[]) {
    this.currentSessionId.set(sessionId);
    this.currentSessionTitle.set(title);
    this.events.set(events);
  },

  setAgent(agent: any) {
    this.currentAgent.set(agent);
  },

  setProductLabContext(
    simulationId: string | null,
    agents: Array<{ id: string; name: string; role?: string }>,
  ) {
    this.productLabSimulationId.set(simulationId);
    this.productLabAgents.set(agents);
  },

  setProductLabAgentIds(agentIds: string[]) {
    this.productLabAgentIds.set([...new Set(agentIds)].slice(0, 3));
  },

  clearProductLabContext() {
    this.productLabSimulationId.set(null);
    this.productLabAgents.set([]);
    this.productLabAgentIds.set([]);
    this.productLabChatMode.set(false);
  },

  openProductLabChat() {
    this.productLabChatMode.set(true);
    this.isOpen.set(true);
    saveOpenState(true);
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("falbor:open-product-lab-chat"));
  },

  open() {
    this.isOpen.set(true);
    saveOpenState(true);
  },
  close() {
    this.isOpen.set(false);
    if (this.productLabSimulationId.get() || this.productLabChatMode.get()) {
      this.productLabChatMode.set(false);
      if (typeof window !== "undefined")
        window.dispatchEvent(new CustomEvent("falbor:close-product-lab-chat"));
    }
    saveOpenState(false);
  },
  toggle() {
    const next = !this.isOpen.get();
    this.isOpen.set(next);
    saveOpenState(next);
  },
  startGeneration() {
    this.isActive.set(true);
    this.isOpen.set(true);
  },
  finishGeneration() {
    this.isActive.set(false);
  },

  // ---- persistence (debounced so streaming doesn't hit the DB on every chunk) ----
  persistNow() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const wsId = this.currentWorkspaceId.get();
    const sId = this.currentSessionId.get();
    if (wsId) saveAgentSessionEvents(wsId, this.events.get(), sId || undefined);
  },
  schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      aiSidebarStore.persistNow();
    }, 500);
  },

  // ---- event lifecycle ----
  addEvent(event: AIEvent) {
    const existing = this.events.get();
    const requestKey = event.requestId && `${event.requestId}:${event.type}`;
    const existingIndex = requestKey
      ? existing.findIndex(
          (item) =>
            item.requestId && `${item.requestId}:${item.type}` === requestKey,
        )
      : -1;
    if (existingIndex >= 0 && event.type === "text") {
      const next = [...existing];
      next[existingIndex] = { ...next[existingIndex], ...event };
      this.events.set(next);
    } else {
      this.events.set([...existing, event]);
    }
    this.schedulePersist();
  },
  updateEvent(id: string, updates: Partial<AIEvent>) {
    this.events.set(
      this.events.get().map((e) => (e.id === id ? { ...e, ...updates } : e)),
    );
    this.schedulePersist();
  },
  mergeEvents(incoming: AIEvent[]) {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    const current = this.events.get();
    const next = [...current];
    for (const event of incoming) {
      if (!event?.id) continue;
      const index = next.findIndex((item) => item.id === event.id);
      const requestIndex = event.requestId
        ? next.findIndex(
            (item) =>
              item.requestId === event.requestId && item.type === event.type,
          )
        : -1;
      const targetIndex = index >= 0 ? index : requestIndex;
      if (targetIndex < 0) {
        next.push(event);
        continue;
      }
      const existing = next[targetIndex];
      if (existing.status === "active" || event.status !== "active") {
        next[targetIndex] = { ...existing, ...event, id: existing.id };
      }
    }
    this.events.set(next);
  },
  /** Update the event with this id, or create it if it doesn't exist yet. */
  upsertEvent(event: Partial<AIEvent> & { id: string }) {
    const list = this.events.get();
    const idx = list.findIndex((e) => e.id === event.id);
    const next =
      idx === -1
        ? [
            ...list,
            {
              type: "status",
              title: "",
              status: "active",
              ...event,
            } as AIEvent,
          ]
        : list.map((e, i) => (i === idx ? { ...e, ...event } : e));
    this.events.set(next);
    this.schedulePersist();
  },
  /** Stops every active animation (optionally only some types / except one id). */
  settleActive(
    opts: {
      except?: string;
      types?: AIEventType[];
      finalState?: "completed" | "error";
    } = {},
  ) {
    const { except, types, finalState = "completed" } = opts;
    let changed = false;
    const next = this.events.get().map((e) => {
      if (
        e.status !== "active" ||
        e.id === except ||
        (types && !types.includes(e.type))
      )
        return e;
      changed = true;
      return { ...e, status: finalState };
    });
    if (changed) {
      this.events.set(next);
      this.schedulePersist();
    }
  },
  /** Marks unanswered interactive elements (options/buttons) as resolved. */
  resolvePending(types: AIEventType[]) {
    let changed = false;
    const next = this.events.get().map((e) => {
      if (e.status !== "pending" || !types.includes(e.type)) return e;
      changed = true;
      return { ...e, status: "completed" as const };
    });
    if (changed) {
      this.events.set(next);
      this.schedulePersist();
    }
  },

  clearEvents() {
    this.events.set([]);
    this.persistNow();
  },
};
