"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { toast } from "react-toastify";
import { Button } from "~/components/ui/Button";
import { Dialog, DialogRoot } from "~/components/ui/Dialog";
import { Dropdown, DropdownItem } from "~/components/ui/Dropdown";
import {
  createProductLabSimulation,
  getProductLabExperiments,
  getProductLabSimulationDetails,
  startProductLabSimulation,
  updateProductLabAgentPosition,
  updateProductLabProject,
} from "~/lib/actions/productLab";
import { ProductInformationForm } from "./components/ProductInformationForm";
import { SimulationConfiguration } from "./components/SimulationConfiguration";
import { SimulationHistory } from "./components/SimulationHistory";
import { AgentDetailsPanel } from "./components/AgentDetailsPanel";
import {
  ProductLabCanvas,
  type ProductLabCanvasAgent,
  type ProductLabCanvasRelationship,
} from "./components/ProductLabCanvas";
import { VoteSummary } from "./components/VoteSummary";
import { SimulationActivity } from "./components/SimulationActivity";
import { ProductLabExperiments } from "./components/ProductLabExperiments";
import { aiSidebarStore } from "~/lib/stores/aiSidebar";
import { Slider } from "~/components/ui/Slider";
import type {
  ProductLabInteractionData,
  ProductLabProjectData,
  ProductLabProjectForm,
  ProductLabReportData,
  ProductLabSimulationRow,
} from "./types";

interface ProductLabViewProps {
  workspaceId: string;
  initialProject: ProductLabProjectData;
  initialSimulations: ProductLabSimulationRow[];
  initialAgents: ProductLabCanvasAgent[];
  initialRelationships: ProductLabCanvasRelationship[];
  initialInteractions: ProductLabInteractionData[];
  initialSimulationId: string | null;
  initialReport: ProductLabReportData | null;
  canvasOnly?: boolean;
}

type ProductLabSection =
  "new-simulation" | "final-report" | "agent-insights" | "live-activity";
type ProductLabSliderDisplay = "full" | "text" | "icons";

function featureText(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .join("\n")
    : "";
}

function projectToForm(project: ProductLabProjectData): ProductLabProjectForm {
  return {
    name: project.name || "",
    websiteUrl: project.websiteUrl || "",
    productDescription: project.productDescription || "",
    targetAudience: project.targetAudience || "",
    features: featureText(project.features),
    pricing: project.pricing || "",
  };
}

function readableSimulationError(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { stage?: string; message?: string };
    if (parsed.stage || parsed.message)
      return `${parsed.stage || "execution"}: ${parsed.message || "Unknown failure"}`;
  } catch {
    return value;
  }
  return value;
}

function averageAgentRating(agents: ProductLabCanvasAgent[]) {
  const ratings = agents.flatMap((agent) =>
    Object.values(agent.initialEvaluation || {}).filter(
      (value): value is number => typeof value === "number",
    ),
  );
  return ratings.length
    ? `${(ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)} / 5`
    : "—";
}

export function ProductLabView({
  workspaceId,
  initialProject,
  initialSimulations,
  initialAgents,
  initialRelationships,
  initialInteractions,
  initialSimulationId,
  initialReport,
  canvasOnly = false,
}: ProductLabViewProps) {
  const router = useRouter();
  const requestIdRef = useRef<string | null>(null);
  const [project, setProject] = useState(initialProject);
  const [form, setForm] = useState(() => projectToForm(initialProject));
  const [simulations, setSimulations] = useState(initialSimulations);
  const [simulationError, setSimulationError] = useState<string | null>(
    initialSimulations.find((row) => row.simulation.id === initialSimulationId)
      ?.simulation.error || null,
  );
  const [agents, setAgents] = useState(initialAgents);
  const [relationships, setRelationships] = useState(initialRelationships);
  const [interactions, setInteractions] =
    useState<ProductLabInteractionData[]>(initialInteractions);
  const [report, setReport] = useState<ProductLabReportData | null>(
    initialReport,
  );
  const [events, setEvents] = useState<
    Array<{
      id: string;
      eventType: string;
      round: number | null;
      createdAt: Date | string;
      payload: unknown;
    }>
  >([]);
  const [experiments, setExperiments] = useState<{
    debates: Array<{ id: string; topic: string; status: string }>;
    messages: Array<{
      id: string;
      debateId: string;
      agentId: string;
      round: number;
      content: string;
    }>;
    reevaluations: Array<{
      id: string;
      proposedChange: string;
      status: string;
      results: Array<{
        agentId: string;
        agentName: string;
        wouldChangeOpinion: boolean;
        revisedOpinion: string;
        reason: string;
      }>;
    }>;
  }>({ debates: [], messages: [], reevaluations: [] });
  const [selectedAgent, setSelectedAgent] =
    useState<ProductLabCanvasAgent | null>(null);
  const [informationOpen, setInformationOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [agentCount, setAgentCount] = useState(10);
  const [section, setSection] = useState<ProductLabSection>("new-simulation");
  const [panelRatio, setPanelRatio] = useState(() => {
    if (typeof window === "undefined") return 0.5;
    const saved = Number(
      window.localStorage.getItem(`falbor:product-lab-panel:${workspaceId}`),
    );
    return Number.isFinite(saved) && saved >= 0.45 && saved <= 0.75
      ? saved
      : 0.5;
  });
  const [resizing, setResizing] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const resizeStartRef = useRef<{ x: number; ratio: number } | null>(null);
  const [compactPanel, setCompactPanel] = useState(false);
  const [sliderDisplay, setSliderDisplay] =
    useState<ProductLabSliderDisplay>("full");
  const [isPending, startTransition] = useTransition();
  const aiSidebarOpen = useStore(aiSidebarStore.isOpen);

  const currentSimulation = simulations.find(
    (row) => row.simulation.id === initialSimulationId,
  )?.simulation;
  const sectionsEnabled =
    Boolean(initialSimulationId) &&
    (currentSimulation?.status === "completed" ||
      currentSimulation?.status === "failed");

  const openAgentChat = (agent: ProductLabCanvasAgent | string) => {
    const agentId = typeof agent === "string" ? agent : agent.id;
    const selected =
      typeof agent === "string"
        ? agents.find((item) => item.id === agentId)
        : agent;
    if (selected) aiSidebarStore.setAgent(selected);
    aiSidebarStore.setProductLabAgentIds([agentId]);
    aiSidebarStore.openProductLabChat();
  };

  const openAgentInsights = (agent: ProductLabCanvasAgent) => {
    setSelectedAgent(agent);
    setSection("agent-insights");
  };

  const enterAgentChat = () => {
    if (!aiSidebarStore.productLabAgentIds.get().length && selectedAgent) {
      aiSidebarStore.setProductLabAgentIds([selectedAgent.id]);
    }
    if (selectedAgent) aiSidebarStore.setAgent(selectedAgent);
    aiSidebarStore.openProductLabChat();
  };

  const saveAgentPosition = (
    agentId: string,
    position: { x: number; y: number },
  ) => {
    if (!initialSimulationId) return;
    void updateProductLabAgentPosition(
      workspaceId,
      initialSimulationId,
      agentId,
      position,
    ).catch(() => toast.error("Unable to save the agent position"));
  };

  const beginResize = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeStartRef.current = { x: event.clientX, ratio: panelRatio };
    setResizing(true);
  };

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setCompactPanel(width < 520);
      setSliderDisplay(width < 420 ? "icons" : width < 620 ? "text" : "full");
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      `falbor:product-lab-panel:${workspaceId}`,
      String(panelRatio),
    );
  }, [panelRatio, workspaceId]);

  useEffect(() => {
    if (!resizing) return;
    const handleMove = (event: MouseEvent) => {
      const start = resizeStartRef.current;
      const width = splitContainerRef.current?.clientWidth || 0;
      if (!start || !width) return;
      const minimumRatio = Math.min(0.45, 320 / width);
      setPanelRatio(
        Math.min(
          1 - minimumRatio,
          Math.max(
            minimumRatio,
            start.ratio + (event.clientX - start.x) / width,
          ),
        ),
      );
    };
    const handleUp = () => {
      resizeStartRef.current = null;
      setResizing(false);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [resizing]);

  useEffect(() => {
    if (!initialSimulationId) return;
    let active = true;
    const refresh = async () => {
      const details = await getProductLabSimulationDetails(
        workspaceId,
        initialSimulationId,
      ).catch(() => null);
      if (!active || !details) return;
      setAgents(details.agents as ProductLabCanvasAgent[]);
      setRelationships(details.relationships as ProductLabCanvasRelationship[]);
      setInteractions(details.interactions as ProductLabInteractionData[]);
      setEvents(details.events as typeof events);
      setReport((details.report?.report as ProductLabReportData) || null);
      setSimulations((current) =>
        current.map((row) =>
          row.simulation.id === details.simulation?.id && details.simulation
            ? {
                ...row,
                simulation: {
                  ...row.simulation,
                  status: details.simulation.status,
                  currentRound: details.simulation.currentRound,
                  error: details.simulation.error,
                },
              }
            : row,
        ),
      );
      setSimulationError(details.simulation?.error || null);
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [initialSimulationId, workspaceId]);

  const refreshExperiments = () => {
    if (!initialSimulationId) return;
    void getProductLabExperiments(workspaceId, initialSimulationId)
      .then((value) => setExperiments(value as typeof experiments))
      .catch(() => undefined);
  };

  useEffect(() => {
    refreshExperiments();
  }, [initialSimulationId, workspaceId]);

  const saveInformation = () => {
    startTransition(async () => {
      try {
        const updated = await updateProductLabProject(workspaceId, project.id, {
          ...form,
          features: form.features
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        });
        setProject(updated as ProductLabProjectData);
        toast.success("Product Lab information saved");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to save Product Lab information",
        );
      }
    });
  };

  const createSimulation = () => {
    const missing = [
      !form.name.trim() && "product name",
      !form.websiteUrl.trim() && "website URL",
      form.productDescription.trim().length < 10 && "product description",
      form.targetAudience.trim().length < 10 && "target audience",
      !form.pricing.trim() && "pricing information",
      !form.features.split("\n").some((item) => item.trim()) && "main features",
    ].filter(Boolean) as string[];
    if (missing.length) {
      toast.error(`Complete the required fields: ${missing.join(", ")}.`);
      return;
    }
    startTransition(async () => {
      try {
        const requestId =
          requestIdRef.current ||
          (typeof crypto !== "undefined"
            ? crypto.randomUUID()
            : `product-lab-${Date.now()}`);
        requestIdRef.current = requestId;
        const created = await createProductLabSimulation(workspaceId, {
          projectId: project.id,
          requestId,
          ...form,
          features: form.features
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          agentCount,
          totalRounds: 3,
        });
        setSimulations((current) =>
          current.some((row) => row.simulation.id === created.id)
            ? current
            : [
                {
                  simulation: {
                    id: created.id,
                    name: `${form.name} Product Experience Review`,
                    status: "queued",
                    agentCount,
                    totalRounds: 3,
                    currentRound: 0,
                    createdAt: new Date(),
                  },
                  project: {
                    name: form.name,
                    websiteUrl: form.websiteUrl || null,
                  },
                },
                ...current,
              ],
        );
        requestIdRef.current = null;
        router.push(
          `/workspace/${workspaceId}/product-lab?simulation=${created.id}`,
        );
        toast.success("Product Lab simulation queued");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to create Product Lab simulation",
        );
      }
    });
  };

  const startSimulation = (simulationId: string) => {
    startTransition(async () => {
      try {
        await startProductLabSimulation(workspaceId, simulationId);
        setSimulations((current) =>
          current.map((row) =>
            row.simulation.id === simulationId
              ? { ...row, simulation: { ...row.simulation, status: "queued" } }
              : row,
          ),
        );
        setHistoryOpen(false);
        router.push(
          `/workspace/${workspaceId}/product-lab?simulation=${simulationId}`,
        );
        toast.success("Simulation queued for durable execution");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to start simulation",
        );
      }
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f7f7f8] dark:bg-[#1A1A1A]">
      <div
        ref={splitContainerRef}
        className={`flex min-h-0 flex-1 flex-col lg:flex-row ${resizing ? "select-none" : ""}`}
      >
        <section
          className="min-h-[420px] min-w-0 lg:min-h-0 lg:min-w-[320px]"
          style={{ flex: canvasOnly ? "1 1 100%" : `0 0 ${panelRatio * 100}%` }}
        >
          <ProductLabCanvas
            agents={agents}
            relationships={relationships}
            onSelect={openAgentInsights}
            onPositionChange={saveAgentPosition}
            className="rounded-none border-0"
          />
        </section>
        {!canvasOnly && (
          <>
            <div
              role="separator"
              aria-label="Resize Product Lab panels"
              aria-orientation="vertical"
              onMouseDown={beginResize}
              className="hidden w-1 shrink-0 cursor-col-resize bg-gray-200 transition-colors hover:bg-[#0099ff] lg:block dark:bg-gray-800"
            />
            <aside
              ref={panelRef}
              className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f7f7f8] dark:bg-[#1A1A1A] lg:min-w-[320px]"
            >
              <>
                <header className="flex h-13 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 dark:border-gray-800 dark:bg-[#212121]">
                  <div>
                    <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Product Lab
                    </h1>
                    {!compactPanel && (
                      <p className="text-[11px] leading-tight text-gray-500 dark:text-gray-400">
                        Evidence-backed agent feedback.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      className="h-8 shrink-0 px-3 text-xs"
                      aria-label="Open Agent Chat"
                      aria-expanded={aiSidebarOpen}
                      onClick={enterAgentChat}
                    >
                      <i className="i-ph:chat-circle mr-1.5" />
                      {!compactPanel && "Agent Chat"}
                    </Button>
                    <Dropdown
                      trigger={
                        <button
                          type="button"
                          aria-label="Product Lab menu"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          <i className="i-ph:dots-three-vertical" />
                        </button>
                      }
                    >
                      <DropdownItem
                        onSelect={() => setInformationOpen((open) => !open)}
                      >
                        <i className="i-ph:info" />
                        Information
                      </DropdownItem>
                      <DropdownItem onSelect={() => setHistoryOpen(true)}>
                        <i className="i-ph:clock-counter-clockwise" />
                        History
                      </DropdownItem>
                    </Dropdown>
                  </div>
                </header>
                <div className="mt-2 px-2">
                  <Slider<ProductLabSection>
                    selected={section}
                    setSelected={setSection}
                    showLabels={sliderDisplay !== "icons"}
                    showIcons={sliderDisplay !== "text"}
                    options={{
                      left: {
                        value: "new-simulation",
                        text: "New Simulation",
                        icon: "i-ph:plus-circle",
                      },
                      middle: {
                        value: "final-report",
                        text: "Final Report",
                        icon: "i-ph:clipboard-text",
                        disabled: !sectionsEnabled,
                      },
                      right: {
                        value: "agent-insights",
                        text: "Agent Insights",
                        icon: "i-ph:user-focus",
                        disabled: !sectionsEnabled,
                      },
                      extra: {
                        value: "live-activity",
                        text: "Live Activity",
                        icon: "i-ph:activity",
                        disabled: !sectionsEnabled,
                      },
                    }}
                  />
                </div>
                <main className="min-h-0 flex-1 overflow-y-auto p-4">
                  {informationOpen && (
                    <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#212121]">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            Product information
                          </h2>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            This is the Product Lab copy of the workspace
                            product context.
                          </p>
                        </div>
                        <Button
                          disabled={isPending}
                          size="sm"
                          onClick={saveInformation}
                        >
                          {isPending ? "Saving..." : "Save"}
                        </Button>
                      </div>
                      <ProductInformationForm
                        value={form}
                        onChange={setForm}
                        disabled={isPending}
                      />
                    </section>
                  )}
                  {section === "new-simulation" && (
                    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#212121]">
                      <div className="mb-4">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                          New simulation
                        </h2>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Each simulation creates persisted independent agents
                          and runs through the durable worker.
                        </p>
                      </div>
                      {simulationError && (
                        <section className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                          <h2 className="text-sm font-semibold text-red-800 dark:text-red-200">
                            Simulation failed
                          </h2>
                          <p className="mt-1 break-words text-xs text-red-700 dark:text-red-300">
                            {readableSimulationError(simulationError)}
                          </p>
                        </section>
                      )}
                      <SimulationConfiguration
                        agentCount={agentCount}
                        onAgentCountChange={setAgentCount}
                        onCreate={createSimulation}
                        pending={isPending}
                        disabled={
                          !form.name.trim() ||
                          !form.websiteUrl.trim() ||
                          form.productDescription.trim().length < 10 ||
                          form.targetAudience.trim().length < 10 ||
                          !form.pricing.trim() ||
                          !form.features.split("\n").some((item) => item.trim())
                        }
                      />
                    </section>
                  )}
                  {section === "final-report" && (
                    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#212121]">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Final report
                      </h2>
                      {report ? (
                        <div className="mt-4 space-y-4">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Executive summary
                            </p>
                            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                              {report.overallAssessment}
                            </p>
                          </div>
                          {report.purchaseIntentSummary && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Simulated purchase intent
                              </p>
                              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                {report.purchaseIntentSummary}
                              </p>
                            </div>
                          )}
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-xl bg-gray-50 p-3 dark:bg-[#18181b]">
                              <p className="text-xs text-gray-500">
                                Product rating
                              </p>
                              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                                {averageAgentRating(agents)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3 dark:bg-[#18181b]">
                              <p className="text-xs text-gray-500">
                                Likes / dislikes
                              </p>
                              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                                {report.likeCount || 0} /{" "}
                                {report.dislikeCount || 0}
                              </p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3 dark:bg-[#18181b]">
                              <p className="text-xs text-gray-500">
                                Agents evaluated
                              </p>
                              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                                {agents.length}
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Strengths
                              </p>
                              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-700 dark:text-gray-300">
                                {(report.strengths || []).map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Weaknesses
                              </p>
                              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-700 dark:text-gray-300">
                                {(report.weaknesses || []).map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Recommended improvements
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-700 dark:text-gray-300">
                              {(report.recommendations || []).map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                          The final report will appear after the simulation
                          completes.
                        </p>
                      )}
                    </section>
                  )}
                  {section === "agent-insights" &&
                    (selectedAgent ? (
                      <>
                        <AgentDetailsPanel
                          agent={selectedAgent}
                          interactions={interactions}
                          onClose={() => setSelectedAgent(null)}
                          onChat={openAgentChat}
                        />
                        {initialSimulationId && sectionsEnabled && (
                          <ProductLabExperiments
                            workspaceId={workspaceId}
                            simulationId={initialSimulationId}
                            agents={agents}
                            debates={experiments.debates}
                            debateMessages={experiments.messages}
                            reevaluations={experiments.reevaluations}
                            onRefresh={refreshExperiments}
                          />
                        )}
                      </>
                    ) : (
                      <section className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center dark:border-gray-700 dark:bg-[#212121]">
                        <div>
                          <i className="i-ph:user-focus text-3xl text-gray-400" />
                          <h2 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                            Select an agent
                          </h2>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Choose an agent from the canvas to view its
                            persisted profile and evaluation.
                          </p>
                        </div>
                      </section>
                    ))}
                  {section === "live-activity" && (
                    <div className="space-y-4">
                      <SimulationActivity
                        events={events}
                        status={currentSimulation?.status}
                      />
                      <VoteSummary
                        agents={agents}
                        onSelect={openAgentInsights}
                      />
                    </div>
                  )}
                </main>
              </>
            </aside>
          </>
        )}
      </div>
      <DialogRoot open={historyOpen} onOpenChange={setHistoryOpen}>
        <Dialog
          onClose={() => setHistoryOpen(false)}
          className="!max-h-[80vh] !w-[min(760px,92vw)] !max-w-[760px] overflow-hidden p-0"
        >
          <div className="max-h-[80vh] overflow-y-auto p-5">
            <SimulationHistory
              simulations={simulations}
              pending={isPending}
              onStart={startSimulation}
              onSelect={(simulationId) => {
                setHistoryOpen(false);
                router.push(
                  `/workspace/${workspaceId}/product-lab?simulation=${simulationId}`,
                );
              }}
            />
          </div>
        </Dialog>
      </DialogRoot>
    </div>
  );
}
