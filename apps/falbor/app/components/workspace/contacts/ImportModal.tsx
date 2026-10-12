import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { bulkImportMyProspects } from '~/lib/actions/myProspects';
import { Dialog, DialogRoot, DialogTitle, DialogDescription, DialogButton } from '~/components/ui/Dialog';
import { Slider } from '~/components/ui/Slider';
import ConnectorDetails from '~/components/@settings/tabs/mcp/ConnectorDetails';
import AddConnection from '~/components/@settings/tabs/mcp/AddConnection';
import { useMCPStore } from '~/lib/stores/mcp';

interface ImportModalProps {
  workspaceId: string;
  onClose: () => void;
  onImported: () => void;
}

type ImportSource = 'contacts' | 'gmail' | 'calendar';

export function ImportModal({ workspaceId, onClose, onImported }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<ImportSource>('contacts');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [connectedUserEmail, setConnectedUserEmail] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const [mcpDialogConnectorId, setMcpDialogConnectorId] = useState<string | null>(null);
  const [mcpView, setMcpView] = useState<'details' | 'add' | null>(null);

  const settings = useMCPStore((state) => state.settings);
  const updateSettings = useMCPStore((state) => state.updateSettings);

  const connectorIdMap: Record<ImportSource, string> = {
    contacts: 'google-contacts',
    gmail: 'gmail',
    calendar: 'google-calendar',
  };

  const fetchCandidates = async (source: ImportSource) => {
    setLoading(true);
    setNeedsAuth(false);
    setCandidates([]);
    setSelectedIds(new Set());

    try {
      const res = await fetch(`/api/contacts/google?source=${source}`);
      const data = await res.json();

      if (data.needsAuth) {
        setNeedsAuth(true);
        setConnectedUserEmail(data.userEmail || null);
      } else if (data.contacts) {
        setConnectedUserEmail(data.userEmail || 'connected user');
        setCandidates(data.contacts);
        setSelectedIds(new Set(data.contacts.map((c: any) => c.externalId || c.email)));
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates(activeTab);
  }, [activeTab]);

  const handleOpenMcpSetup = () => {
    const targetConnector = connectorIdMap[activeTab];
    setMcpDialogConnectorId(targetConnector);
    setMcpView('details');
  };

  const handleSaveConnectionConfig = async (connectionName: string, config: any) => {
    if (!mcpDialogConnectorId) return;
    if (config) {
      const serverKey = `${mcpDialogConnectorId}-${connectionName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
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
        fetchCandidates(activeTab);
      } catch (e) {
        toast.error('Failed to save connection');
        console.error(e);
      }
    } else {
      toast.success(`Successfully connected ${connectionName}`);
      setMcpView(null);
      fetchCandidates(activeTab);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.externalId || c.email)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirmImport = async () => {
    const toImport = candidates.filter((c) => selectedIds.has(c.externalId || c.email));
    if (toImport.length === 0) {
      toast.error('Please select at least one contact to import');
      return;
    }

    try {
      setImporting(true);
      const res = await bulkImportMyProspects(workspaceId, toImport);
      toast.success(`Imported ${res.imported} prospects (${res.skipped} duplicates skipped)`);
      onImported();
    } catch (err) {
      console.error(err);
      toast.error('Failed to import prospects');
    } finally {
      setImporting(false);
    }
  };

  return (
    <DialogRoot open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog className="w-[600px] max-w-[90vw] p-6" showCloseButton={true} onClose={onClose}>
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

          <div className="flex justify-start my-1">
            <Slider
              selected={activeTab}
              setSelected={(val) => {
                setActiveTab(val as ImportSource);
              }}
              options={{
                left: { value: 'contacts', text: 'Google Contacts', icon: 'i-ph:address-book' },
                middle: { value: 'gmail', text: 'Gmail', icon: 'i-ph:envelope' },
                right: { value: 'calendar', text: 'Google Calendar', icon: 'i-ph:calendar' },
              }}
            />
          </div>

          <div className="flex-1 overflow-auto min-h-[260px] flex flex-col justify-center border border-falbor-elements-borderColor rounded-lg p-3 bg-falbor-elements-background-depth-2">
            {needsAuth ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center mb-3">
                  <span className="i-ph:plugs-connected w-6 h-6" />
                </div>
                <h4 className="text-base font-semibold text-falbor-elements-textPrimary">Connect MCP Integration</h4>
                <p className="text-xs text-falbor-elements-textSecondary max-w-sm mt-1 mb-5">
                  No active MCP connection found for {activeTab === 'contacts' ? 'Google Contacts' : activeTab === 'gmail' ? 'Gmail' : 'Google Calendar'}. Click below to authorize via MCP.
                </p>
                <DialogButton type="primary" onClick={handleOpenMcpSetup}>
                  <span className="i-ph:link-bold w-4 h-4" />
                  Connect {activeTab === 'contacts' ? 'Google Contacts' : activeTab === 'gmail' ? 'Gmail' : 'Google Calendar'} MCP
                </DialogButton>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="i-ph:spinner-gap animate-spin w-8 h-8 text-purple-500 mb-3" />
                <p className="text-sm text-falbor-elements-textSecondary">Scanning {activeTab} via MCP for candidates...</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-falbor-elements-textSecondary">
                <span className="i-ph:tray w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm">No contacts found in {activeTab}.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between px-2 py-2 text-xs font-semibold text-falbor-elements-textSecondary border-b border-falbor-elements-borderColor">
                  <span>{candidates.length} candidates found</span>
                  <button
                    onClick={toggleSelectAll}
                    className="text-purple-500 hover:underline cursor-pointer"
                  >
                    {selectedIds.size === candidates.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="flex-1 overflow-auto divide-y divide-falbor-elements-borderColor">
                  {candidates.map((c) => {
                    const id = c.externalId || c.email;
                    const isChecked = selectedIds.has(id);
                    return (
                      <div
                        key={id}
                        onClick={() => toggleSelect(id)}
                        className="flex items-center justify-between p-2.5 hover:bg-falbor-elements-background-depth-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-falbor-elements-textPrimary">{c.name}</span>
                            <span className="text-xs text-falbor-elements-textSecondary">
                              {c.email || 'No email'} {c.company ? `• ${c.company}` : ''}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-falbor-elements-background-depth-3 text-falbor-elements-textSecondary">
                          {c.source}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 shrink-0">
            <span className="text-xs text-falbor-elements-textSecondary">
              {selectedIds.size} selected for import
            </span>
            <div className="flex items-center gap-2">
              <DialogButton type="secondary" onClick={onClose}>
                Cancel
              </DialogButton>
              <DialogButton type="primary" onClick={handleConfirmImport} disabled={importing || selectedIds.size === 0}>
                {importing ? 'Importing...' : `Import Selected (${selectedIds.size})`}
              </DialogButton>
            </div>
          </div>
        </div>
      </Dialog>

      <DialogRoot open={!!mcpView} onOpenChange={(open) => !open && setMcpView(null)}>
        <Dialog className="max-w-2xl w-full p-6 bg-falbor-elements-background-depth-1">
          {mcpDialogConnectorId && mcpView === 'details' && (
            <ConnectorDetails
              connectorId={mcpDialogConnectorId}
              onAddConnection={() => setMcpView('add')}
            />
          )}
          {mcpDialogConnectorId && mcpView === 'add' && (
            <AddConnection
              connectorId={mcpDialogConnectorId}
              onCancel={() => setMcpView('details')}
              onSaveConfig={(name, config) => handleSaveConnectionConfig(name, config)}
            />
          )}
        </Dialog>
      </DialogRoot>
    </DialogRoot>
  );
}
