import { classNames } from "~/utils/classNames";
import { prospectFilters } from "./constants";
import type { ContactFilter } from "./types";

interface ProspectStatsProps {
  activeFilter: ContactFilter;
  counts: Record<ContactFilter, number>;
  onChange: (filter: ContactFilter) => void;
}

export function ProspectStats({
  activeFilter,
  counts,
  onChange,
}: ProspectStatsProps) {
  return (
    <div className="grid grid-cols-5 gap-3 my-4 shrink-0">
      {prospectFilters.map((card) => (
        <button
          type="button"
          key={card.key}
          onClick={() => onChange(card.key)}
          className={classNames(
            "flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border rounded-md p-4 text-left transition-all",
            activeFilter === card.key
              ? "border-[#0099ff] ring-1 ring-[#0099ff] shadow-sm"
              : "border-gray-300 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700",
          )}
        >
          <span className="text-xs text-falbor-elements-textSecondary">
            {card.label}
          </span>
          <span className="text-2xl dark:text-white font-bold mt-1">
            {counts[card.key]}
          </span>
        </button>
      ))}
    </div>
  );
}
