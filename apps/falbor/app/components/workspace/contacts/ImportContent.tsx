import { DialogButton } from "~/components/ui/Dialog";
import { importSourceLabels } from "./constants";
import { ImportCandidateList } from "./ImportCandidateList";
import type { ImportCandidatesProps, ImportSource } from "./types";

interface ImportContentProps extends ImportCandidatesProps {
  activeTab: ImportSource;
  candidates: any[];
  loading: boolean;
  needsAuth: boolean;
  onConnect: () => void;
}

export function ImportContent({
  activeTab,
  candidates,
  selectedIds,
  loading,
  needsAuth,
  onConnect,
  onToggleAll,
  onToggle,
}: ImportContentProps) {
  if (needsAuth) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center mb-3">
          <span className="i-ph:plugs-connected w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-falbor-elements-textPrimary">
          Connect MCP Integration
        </h4>
        <p className="text-xs text-falbor-elements-textSecondary max-w-sm mt-1 mb-5">
          No active MCP connection found for {importSourceLabels[activeTab]}.
          Click below to authorize via MCP.
        </p>
        <DialogButton type="primary" onClick={onConnect}>
          <span className="i-ph:link-bold w-4 h-4" />
          Connect {importSourceLabels[activeTab]} MCP
        </DialogButton>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="i-ph:spinner-gap animate-spin w-8 h-8 text-purple-500 mb-3" />
        <p className="text-sm text-falbor-elements-textSecondary">
          Scanning {activeTab} via MCP for candidates...
        </p>
      </div>
    );
  }
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-falbor-elements-textSecondary">
        <span className="i-ph:tray w-8 h-8 text-gray-400 mb-2" />
        <p className="text-sm">No contacts found in {activeTab}.</p>
      </div>
    );
  }
  return (
    <ImportCandidateList
      candidates={candidates}
      count={candidates.length}
      selectedIds={selectedIds}
      onToggleAll={onToggleAll}
      onToggle={onToggle}
    />
  );
}
