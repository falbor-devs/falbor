interface SimulationActivityProps {
  events: Array<{
    id: string;
    eventType: string;
    round: number | null;
    createdAt: Date | string;
    payload: unknown;
  }>;
  status?: string;
}

const STAGE_LABELS: Record<string, string> = {
  initializing: "Initializing",
  analyzing_product: "Analyzing Product",
  generating_agents: "Generating Agents",
  evaluating_product: "Evaluating Product",
  agent_discussions: "Agent Discussions",
  generating_final_report: "Generating Final Report",
  completed: "Completed",
  failed: "Failed",
};

function eventLabel(event: SimulationActivityProps["events"][number]) {
  const payload =
    event.payload && typeof event.payload === "object"
      ? (event.payload as Record<string, unknown>)
      : {};
  if (event.eventType === "stage_changed" && typeof payload.stage === "string")
    return STAGE_LABELS[payload.stage] || payload.stage;
  if (event.eventType === "agent_created" && typeof payload.name === "string")
    return `Created ${payload.name}${payload.role ? ` — ${payload.role}` : ""}`;
  if (
    event.eventType === "evaluation_completed" &&
    typeof payload.name === "string"
  )
    return `${payload.name} completed an evaluation`;
  if (event.eventType === "final_report_completed")
    return "Final report generated";
  return event.eventType.replaceAll("_", " ");
}

export function SimulationActivity({
  events,
  status,
}: SimulationActivityProps) {
  const currentStage = events.find(
    (event) => event.eventType === "stage_changed",
  );
  const stagePayload =
    currentStage?.payload && typeof currentStage.payload === "object"
      ? (currentStage.payload as Record<string, unknown>)
      : {};
  const stage =
    typeof stagePayload.stage === "string" ? stagePayload.stage : null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#212121]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Simulation activity
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Recorded execution events only. Internal model reasoning is not
            exposed.
          </p>
        </div>
        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
          <div>{stage ? STAGE_LABELS[stage] || stage : status || "Queued"}</div>
          <div>{events.length} events</div>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Activity will appear when the simulation worker starts.
        </p>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-[#18181b]"
            >
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0099ff]" />
              <div>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                  {eventLabel(event)}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {event.round !== null ? `Round ${event.round} · ` : ""}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
