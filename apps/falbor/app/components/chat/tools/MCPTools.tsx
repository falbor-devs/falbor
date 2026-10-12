'use client';
import { useEffect, useMemo, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { Dialog, DialogRoot, DialogClose, DialogTitle, DialogButton } from '~/components/ui/Dialog';
import { IconButton } from '~/components/ui/IconButton';
import { DropdownItem } from '~/components/ui/Dropdown';
import { useMCPStore } from '~/lib/stores/mcp';
import McpServerList from '~/components/@settings/tabs/mcp/McpServerList';

export function McpTools({ asMenuItem }: { asMenuItem?: boolean }) {
  const isInitialized = useMCPStore((state) => state.isInitialized);
  const serverTools = useMCPStore((state) => state.serverTools);
  const settings = useMCPStore((state) => state.settings);
  const initialize = useMCPStore((state) => state.initialize);
  const updateSettings = useMCPStore((state) => state.updateSettings);
  const checkServersAvailabilities = useMCPStore((state) => state.checkServersAvailabilities);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingServers, setIsCheckingServers] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized]);

  const checkServerAvailability = async () => {
    setIsCheckingServers(true);
    setError(null);

    try {
      await checkServersAvailabilities();
    } catch (e) {
      setError(`Failed to check server availability: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsCheckingServers(false);
    }
  };

  const toggleServerExpanded = (serverName: string) => {
    setExpandedServer(expandedServer === serverName ? null : serverName);
  };

  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open);
  };

  const serverEntries = useMemo(() => Object.entries(serverTools), [serverTools]);

  return (
    <>
      {asMenuItem ? (
        <DropdownItem
          onSelect={(e) => {
            if (!isInitialized) {
              e.preventDefault();
              return;
            }
            e.preventDefault();
            setIsDialogOpen(true);
          }}
          className={classNames(
            !isInitialized ? 'opacity-50' : '',
            settings.mcpEnabled ? 'text-accent-500' : 'text-falbor-elements-textPrimary'
          )}
        >
          {!isInitialized ? (
            <div className="i-svg-spinners:90-ring-with-bg text-falbor-elements-loader-progress text-xl animate-spin"></div>
          ) : (
            <div className={classNames("i-ph:graph text-xl", settings.mcpEnabled ? "text-accent-500" : "text-falbor-elements-textSecondary")}></div>
          )}
          <span>Connectors</span>
        </DropdownItem>
      ) : (
        <IconButton
          onClick={() => setIsDialogOpen(!isDialogOpen)}
          title={settings.mcpEnabled ? 'MCP Tools Active' : 'MCP Tools Disabled'}
          disabled={!isInitialized}
          className={classNames(
            'transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            settings.mcpEnabled && 'text-accent-500',
          )}
        >
          {!isInitialized ? (
            <div className="i-svg-spinners:90-ring-with-bg text-falbor-elements-loader-progress text-xl animate-spin"></div>
          ) : (
            <div className="i-ph:graph text-xl"></div>
          )}
        </IconButton>
      )}

      <DialogRoot open={isDialogOpen} onOpenChange={handleDialogOpen}>
        {isDialogOpen && (
          <Dialog className="max-w-4xl w-full p-6">
            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
              <DialogTitle>
                <div className="i-falbor:mcp text-xl"></div>
                MCP tools
              </DialogTitle>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-falbor-elements-background-depth-2">
                  <div className="flex items-center gap-2">
                    <div className={classNames('w-2 h-2 rounded-full', settings.mcpEnabled ? 'bg-green-500' : 'bg-falbor-elements-textSecondary')}></div>
                    <span className="text-sm text-falbor-elements-textPrimary">MCP Tools Enabled</span>
                  </div>
                  <button
                    onClick={async () => {
                      await updateSettings({ ...settings, mcpEnabled: !settings.mcpEnabled });
                    }}
                    className={classNames(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                      settings.mcpEnabled ? 'bg-accent-500' : 'bg-falbor-elements-background-depth-4',
                    )}
                  >
                    <span
                      className={classNames(
                        'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                        settings.mcpEnabled ? 'translate-x-4' : 'translate-x-1',
                      )}
                    />
                  </button>
                </div>
                <div>
                  <div className="flex justify-end items-center mb-2">
                    <button
                      onClick={checkServerAvailability}
                      disabled={isCheckingServers || serverEntries.length === 0}
                      className={classNames(
                        'px-3 py-1.5 rounded-lg text-sm',
                        'bg-falbor-elements-background-depth-3 hover:bg-falbor-elements-background-depth-4',
                        'text-falbor-elements-textPrimary',
                        'transition-all duration-200',
                        'flex items-center gap-2',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      {isCheckingServers ? (
                        <div className="i-svg-spinners:90-ring-with-bg w-3 h-3 text-falbor-elements-loader-progress animate-spin" />
                      ) : (
                        <div className="i-ph:arrow-counter-clockwise w-3 h-3" />
                      )}
                      Check availability
                    </button>
                  </div>
                  {serverEntries.length > 0 ? (
                    <McpServerList
                      checkingServers={isCheckingServers}
                      expandedServer={expandedServer}
                      serverEntries={serverEntries}
                      onlyShowAvailableServers={true}
                      toggleServerExpanded={toggleServerExpanded}
                    />
                  ) : (
                    <div className="py-4 text-center text-falbor-elements-textSecondary">
                      <p>No MCP servers configured</p>
                      <p className="text-xs mt-1">Configure servers in Settings → MCP Servers</p>
                    </div>
                  )}
                </div>

                <div>{error && <p className="mt-2 text-sm text-falbor-elements-icon-error">{error}</p>}</div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <div className="flex gap-2">
                  <DialogClose asChild>
                    <DialogButton type="secondary">Close</DialogButton>
                  </DialogClose>
                </div>
              </div>
            </div>
          </Dialog>
        )}
      </DialogRoot>
    </>
  );
}
