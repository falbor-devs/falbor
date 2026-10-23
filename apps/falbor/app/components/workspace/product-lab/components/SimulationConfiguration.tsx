"use client";

import { Button } from "~/components/ui/Button";
import {
  PRODUCT_LAB_MAX_AGENTS,
  PRODUCT_LAB_MIN_AGENTS,
} from "~/lib/product-lab/config";

interface SimulationConfigurationProps {
  agentCount: number;
  onAgentCountChange: (value: number) => void;
  onCreate: () => void;
  pending: boolean;
  disabled: boolean;
}

export function SimulationConfiguration({
  agentCount,
  onAgentCountChange,
  onCreate,
  pending,
  disabled,
}: SimulationConfigurationProps) {
  return (
    <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            AI agent population
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Free plans support up to 40 agents. Paid plans support up to 100.
          </p>
        </div>
        <input
          type="number"
          min={PRODUCT_LAB_MIN_AGENTS}
          max={PRODUCT_LAB_MAX_AGENTS}
          value={agentCount}
          onChange={(event) =>
            onAgentCountChange(
              Math.min(
                PRODUCT_LAB_MAX_AGENTS,
                Math.max(
                  PRODUCT_LAB_MIN_AGENTS,
                  Number(event.target.value) || PRODUCT_LAB_MIN_AGENTS,
                ),
              ),
            )
          }
          className="w-20 rounded-lg border border-gray-200 bg-transparent px-2 py-1.5 text-center text-sm outline-none focus:border-[#0099ff] dark:border-gray-700"
        />
      </div>
      <input
        type="range"
        min={PRODUCT_LAB_MIN_AGENTS}
        max={PRODUCT_LAB_MAX_AGENTS}
        value={agentCount}
        onChange={(event) => onAgentCountChange(Number(event.target.value))}
        className="mt-4 w-full accent-[#0099ff]"
      />
      <div className="mt-5 flex justify-end">
        <Button
          disabled={disabled || pending}
          onClick={onCreate}
          variant="default"
          size="lg"
        >
          {pending ? "Creating..." : "Create simulation"}
        </Button>
      </div>
    </div>
  );
}
