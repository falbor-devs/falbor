interface ProspectsHeaderProps {
  onImport: () => void;
  onAdd: () => void;
}

export function ProspectsHeader({ onImport, onAdd }: ProspectsHeaderProps) {
  return (
    <div className="flex items-center justify-between py-3 shrink-0">
      <div>
        <h2 className="text-xl font-bold text-falbor-elements-textPrimary flex items-center gap-2">
          <span className="i-ph:users-three w-5 h-5" />
          My Prospects
        </h2>
        <p className="text-sm text-falbor-elements-textSecondary mt-0.5">
          Manage your personal prospects, track outreach status, and send
          candidates directly to AI for research.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onImport}
          className="flex items-center gap-2 px-3.5 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-falbor-elements-textPrimary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          <span className="i-ph:download-simple w-4 h-4" />
          Import from Apps
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="bg-[#0099ff]/20 text-[#0099ff] rounded-md flex items-center gap-2 px-3.5 py-2 text-sm transition-colors whitespace-nowrap"
        >
          + Add Prospect
        </button>
      </div>
    </div>
  );
}
