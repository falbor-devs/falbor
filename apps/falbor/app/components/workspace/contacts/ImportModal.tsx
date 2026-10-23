import { useState } from "react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogDescription,
  DialogRoot,
  DialogTitle,
  DialogButton,
} from "~/components/ui/Dialog";
import ConnectorDetails from "~/components/@settings/tabs/mcp/ConnectorDetails";
import AddConnection from "~/components/@settings/tabs/mcp/AddConnection";
import { useMCPStore } from "~/lib/stores/mcp";
import { connectorIdMap, importSourceLabels } from "./constants";
import { ImportContent } from "./ImportContent";
import { ImportSourceTabs } from "./ImportSourceTabs";
import { useImportCandidates } from "./useImportCandidates";
import type { ImportSource } from "./types";

interface ImportModalProps {
  workspaceId: string;
  onClose: () => void;
  onImported: () => void;
}

export function ImportModal({
  workspaceId,
  onClose,
  onImported,
}: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<ImportSource>("contacts");
  const [mcpDialogConnectorId, setMcpDialogConnectorId] = useState<
    string | null
  >(null);
  const [mcpView, setMcpView] = useState<"details" | "add" | null>(null);
  const settings = useMCPStore((state) => state.settings);
  const updateSettings = useMCPStore((state) => state.updateSettings);
  const importState = useImportCandidates(activeTab, workspaceId, onImported);

  const openMcpSetup = () => {
    setMcpDialogConnectorId(connectorIdMap[activeTab]);
    setMcpView("details");
  };

  const saveConnectionConfig = async (connectionName: string, config: any) => {
    if (!mcpDialogConnectorId) return;
    if (!config) {
      toast.success(`Successfully connected ${connectionName}`);
      setMcpView(null);
      void importState.fetchCandidates();
      return;
    }
    const serverKey = `${mcpDialogConnectorId}-${connectionName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const newConfig = {
      ...settings.mcpConfig,
      mcpServers: {
        ...(settings.mcpConfig?.mcpServers || {}),
        [serverKey]: config,
      },
    };
    try {
      await updateSettings({
        mcpConfig: newConfig as any,
        maxLLMSteps: settings.maxLLMSteps,
        mcpEnabled: settings.mcpEnabled,
      });
      toast.success(`Successfully connected ${connectionName}`);
      setMcpView(null);
      void importState.fetchCandidates();
    } catch (error) {
      toast.error("Failed to save connection");
      console.error(error);
    }
  };

  return (
    <DialogRoot
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog
        className="w-[600px] max-w-[90vw] p-6"
        showCloseButton={true}
        onClose={onClose}
      >
        <div className="flex flex-col h-full gap-4">
          <div>
            <DialogTitle>
              <span className="i-ph:download-simple w-5 h-5 text-purple-500" />
              Import Prospects from Apps
            </DialogTitle>
            <DialogDescription>
              Connect and import contacts from your existing MCP integrations.
            </DialogDescription>
          </div>
          <ImportSourceTabs activeTab={activeTab} onChange={setActiveTab} />
          <div className="flex-1 overflow-auto min-h-[260px] flex flex-col justify-center border border-falbor-elements-borderColor rounded-lg p-3 bg-falbor-elements-background-depth-2">
            <ImportContent
              activeTab={activeTab}
              candidates={importState.candidates}
              selectedIds={importState.selectedIds}
              loading={importState.loading}
              needsAuth={importState.needsAuth}
              onConnect={openMcpSetup}
              onToggleAll={importState.toggleSelectAll}
              onToggle={importState.toggleSelect}
            />
          </div>
          <div className="flex items-center justify-between pt-2 shrink-0">
            <span className="text-xs text-falbor-elements-textSecondary">
              {importState.selectedIds.size} selected for import
            </span>
            <div className="flex items-center gap-2">
              <DialogButton type="secondary" onClick={onClose}>
                Cancel
              </DialogButton>
              <DialogButton
                type="primary"
                onClick={importState.handleConfirmImport}
                disabled={
                  importState.importing || importState.selectedIds.size === 0
                }
              >
                {importState.importing
                  ? "Importing..."
                  : `Import Selected (${importState.selectedIds.size})`}
              </DialogButton>
            </div>
          </div>
        </div>
      </Dialog>
      <DialogRoot
        open={!!mcpView}
        onOpenChange={(open) => !open && setMcpView(null)}
      >
        <Dialog className="max-w-2xl w-full p-6 bg-falbor-elements-background-depth-1">
          {mcpDialogConnectorId && mcpView === "details" && (
            <ConnectorDetails
              connectorId={mcpDialogConnectorId}
              onAddConnection={() => setMcpView("add")}
            />
          )}
          {mcpDialogConnectorId && mcpView === "add" && (
            <AddConnection
              connectorId={mcpDialogConnectorId}
              onCancel={() => setMcpView("details")}
              onSaveConfig={saveConnectionConfig}
            />
          )}
        </Dialog>
      </DialogRoot>
    </DialogRoot>
  );
}
