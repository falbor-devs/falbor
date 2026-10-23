"use client";

import { Button } from "~/components/ui/Button";
import type { ProductLabSimulationRow } from "../types";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  queued: "Queued",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

interface SimulationHistoryProps {
  simulations: ProductLabSimulationRow[];
  pending: boolean;
  onStart: (simulationId: string) => void;
  onSelect?: (simulationId: string) => void;
}

export function SimulationHistory({
  simulations,
  pending,
  onStart,
  onSelect,
}: SimulationHistoryProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Simulation history
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {simulations.length} simulation{simulations.length === 1 ? "" : "s"}
        </span>
      </div>
      {simulations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Your completed and in-progress simulations will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {simulations.map(({ simulation, project }) => (
            <div
              key={simulation.id}
              className="flex cursor-pointer flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-[#0099ff]/50 dark:border-gray-800 dark:bg-[#212121]"
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onClick={() => onSelect?.(simulation.id)}
              onKeyDown={(event) => {
                if (onSelect && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onSelect(simulation.id);
                }
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {simulation.name || `${project.name} Product Experience Review`}
                  </h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {statusLabels[simulation.status] || simulation.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {simulation.agentCount} agents · {simulation.totalRounds}{" "}
                  rounds{project.websiteUrl ? ` · ${project.websiteUrl}` : ""}
                </p>
              </div>
              {["draft", "failed"].includes(simulation.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={(event) => {
                    event.stopPropagation();
                    onStart(simulation.id);
                  }}
                >
                  Start simulation
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
