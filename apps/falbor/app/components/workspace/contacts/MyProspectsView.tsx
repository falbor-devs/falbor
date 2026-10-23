import { useEffect, useState } from "react";
import { AddProspectModal } from "./AddProspectModal";
import { ImportModal } from "./ImportModal";
import { ProspectTable } from "./ProspectTable";
import { ProspectStats } from "./ProspectStats";
import { ProspectsHeader } from "./ProspectsHeader";
import { useProspects } from "./useProspects";

interface MyProspectsViewProps {
  workspaceId: string;
}

export function MyProspectsView({ workspaceId }: MyProspectsViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const {
    loading,
    filterStatus,
    setFilterStatus,
    sendingId,
    counts,
    filteredProspects,
    loadProspects,
    handleStatusChange,
    handleDelete,
    handleSendToAi,
  } = useProspects(workspaceId);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("import") === "true"
    ) {
      setIsImportOpen(true);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-white dark:bg-[#080808] overflow-hidden p-6">
      <ProspectsHeader
        onImport={() => setIsImportOpen(true)}
        onAdd={() => setIsAddOpen(true)}
      />
      <ProspectStats
        activeFilter={filterStatus}
        counts={counts}
        onChange={setFilterStatus}
      />
      <div className="flex-1 overflow-auto border border-gray-300 dark:border-gray-800 rounded-md bg-white dark:bg-falbor-elements-background-depth-1 shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="i-ph:spinner-gap animate-spin w-8 h-8 text-[#0099ff]" />
            <p className="text-sm text-falbor-elements-textSecondary">
              Loading prospects...
            </p>
          </div>
        ) : filteredProspects.length === 0 ? (
          <EmptyProspectsState
            onImport={() => setIsImportOpen(true)}
            onAdd={() => setIsAddOpen(true)}
          />
        ) : (
          <ProspectTable
            prospects={filteredProspects}
            sendingId={sendingId}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onSendToAi={handleSendToAi}
          />
        )}
      </div>
      {isAddOpen && (
        <AddProspectModal
          workspaceId={workspaceId}
          onClose={() => setIsAddOpen(false)}
          onAdded={() => {
            setIsAddOpen(false);
            void loadProspects();
          }}
        />
      )}
      {isImportOpen && (
        <ImportModal
          workspaceId={workspaceId}
          onClose={() => setIsImportOpen(false)}
          onImported={() => {
            setIsImportOpen(false);
            void loadProspects();
          }}
        />
      )}
    </div>
  );
}

interface EmptyProspectsStateProps {
  onImport: () => void;
  onAdd: () => void;
}

function EmptyProspectsState({ onImport, onAdd }: EmptyProspectsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-6">
      <div className="w-12 h-12 rounded-full bg-[#0099ff]/20 text-[#0099ff] flex items-center justify-center mb-3">
        <span className="i-ph:users-three w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-falbor-elements-textPrimary">
        No prospects found
      </h3>
      <p className="text-sm text-falbor-elements-textSecondary max-w-md mt-1 mb-4">
        Add your first prospect manually or connect Google Apps (Contacts,
        Gmail, Calendar) to import candidates.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onImport}
          className="flex items-center gap-2 px-3.5 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-falbor-elements-textPrimary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
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
