import type { ImportCandidatesProps } from "./types";

interface CandidateListProps extends ImportCandidatesProps {
  count: number;
}

export function ImportCandidateList({
  candidates,
  selectedIds,
  onToggleAll,
  onToggle,
  count,
}: CandidateListProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-2 py-2 text-xs font-semibold text-falbor-elements-textSecondary border-b border-falbor-elements-borderColor">
        <span>{count} candidates found</span>
        <button
          type="button"
          onClick={onToggleAll}
          className="text-purple-500 hover:underline cursor-pointer"
        >
          {selectedIds.size === count ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="flex-1 overflow-auto divide-y divide-falbor-elements-borderColor">
        {candidates.map((candidate) => {
          const id = candidate.externalId || candidate.email;
          const checked = selectedIds.has(id);
          return (
            <div
              key={id}
              onClick={() => onToggle(id)}
              className="flex items-center justify-between p-2.5 hover:bg-falbor-elements-background-depth-3 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {}}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-falbor-elements-textPrimary">
                    {candidate.name}
                  </span>
                  <span className="text-xs text-falbor-elements-textSecondary">
                    {candidate.email || "No email"}{" "}
                    {candidate.company ? `• ${candidate.company}` : ""}
                  </span>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-falbor-elements-background-depth-3 text-falbor-elements-textSecondary">
                {candidate.source}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
