import React, { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { MCP_CONNECTORS } from '~/components/@settings/tabs/mcp/connectors';
import ConnectorDetails from '~/components/@settings/tabs/mcp/ConnectorDetails';
import AddConnection from '~/components/@settings/tabs/mcp/AddConnection';
import { Dialog, DialogRoot } from '~/components/ui/Dialog';
import { useMCPStore } from '~/lib/stores/mcp';
import { toast } from 'react-toastify';
import { AgentGrowthDashboard } from './AgentGrowthDashboard';

interface WorkspaceAgentContactViewProps {
  workspaceId: string;
}

export function WorkspaceAgentContactView({ workspaceId }: WorkspaceAgentContactViewProps) {
  const [activeConnectorId, setActiveConnectorId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'details' | 'add' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const settings = useMCPStore((state) => state.settings);
  const updateSettings = useMCPStore((state) => state.updateSettings);

  const [dbConnections, setDbConnections] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/mcp/connections', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && data.connections) {
          setDbConnections(data.connections);
          
          // Auto-redirect to dashboard if Gmail is already connected
          const hasLocalConnection = Object.keys(settings.mcpConfig?.mcpServers || {}).some(k => k.startsWith('gmail-'));
          const hasDbConnection = data.connections.some((c: any) => c.connectorId === 'gmail');
          if (hasLocalConnection || hasDbConnection) {
            setShowDashboard(true);
          }
        }
      })
      .catch(err => console.error(err));
  }, [settings.mcpConfig]);

  const contactConnectors = MCP_CONNECTORS.filter(c => c.id === 'gmail' || c.id === 'outlook');
  const activeConnector = activeConnectorId ? MCP_CONNECTORS.find(c => c.id === activeConnectorId) : null;

  const handleSaveConnectionConfig = async (connectionName: string, config: any) => {
    if (config) {
      const serverKey = `${activeConnectorId}-${connectionName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      
      const newConfig = {
        ...settings.mcpConfig,
        mcpServers: {
          ...(settings.mcpConfig?.mcpServers || {}),
          [serverKey]: config,
        },
      };

      setIsSaving(true);
      try {
        await updateSettings({
          mcpConfig: newConfig as any,
          maxLLMSteps: settings.maxLLMSteps,
          mcpEnabled: settings.mcpEnabled,
        });
        toast.success(`Successfully connected ${connectionName}`);
        setCurrentView('details');
      } catch (e) {
        toast.error('Failed to save connection');
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    } else {
      toast.success(`Successfully connected ${connectionName}`);
      setCurrentView(null);
    }
  };

  if (showDashboard) {
    return <AgentGrowthDashboard workspaceId={workspaceId} />;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-2xl text-center space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-falbor-elements-textPrimary">Agent Contact</h2>
          <p className="text-sm text-falbor-elements-textSecondary mt-2">
            Connect your email accounts so the AI agent can autonomously reach out and manage contacts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {contactConnectors.map((connector) => {
            const hasLocalConnection = Object.keys(settings.mcpConfig?.mcpServers || {}).some(k => k.startsWith(connector.id + '-'));
            const hasDbConnection = dbConnections.some((c: any) => c.connectorId === connector.id);
            const isConnected = hasLocalConnection || hasDbConnection;
            const isOutlook = connector.id === 'outlook';
            const isGmail = connector.id === 'gmail';
            
            return (
              <button
                key={connector.id}
                disabled={isOutlook}
                onClick={() => {
                  if (isOutlook) return;
                  if (isGmail && isConnected) {
                    setShowDashboard(true);
                  } else {
                    setActiveConnectorId(connector.id);
                    setCurrentView('details');
                  }
                }}
                className={classNames(
                  'flex flex-col items-center p-6 text-center rounded-xl border transition-all duration-200 relative',
                  isOutlook ? 'opacity-60 cursor-not-allowed bg-falbor-elements-background-depth-2' : 'bg-falbor-elements-background-depth-2 hover:bg-falbor-elements-background-depth-3 hover:border-falbor-elements-borderActive cursor-pointer',
                  'border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark',
                  isConnected && !isOutlook && 'ring-1 ring-purple-500/50'
                )}
              >
                {isConnected && !isOutlook && (
                  <div className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 bg-purple-500 rounded-full">
                    <div className="i-ph:check text-white w-3 h-3" />
                  </div>
                )}
                <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm mb-4">
                  <img src={connector.logo} alt={connector.name} className={classNames("w-8 h-8 object-contain", isOutlook && "grayscale")} />
                </div>
                <h3 className="text-lg font-semibold text-falbor-elements-textPrimary">
                  {connector.name}
                </h3>
                <p className="text-sm text-falbor-elements-textSecondary mt-2">
                  {connector.description}
                </p>
                <div className={classNames("mt-4 text-xs font-medium", isOutlook ? "text-gray-500" : "text-purple-600 dark:text-purple-400")}>
                  {isOutlook ? 'Coming Soon' : (isConnected ? 'Connected - Click to Enter' : 'Click to connect')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <DialogRoot open={!!currentView} onOpenChange={(open) => !open && setCurrentView(null)}>
        <Dialog className="max-w-2xl w-full p-6 bg-falbor-elements-background-depth-1">
          {activeConnectorId && currentView === 'details' && (
            <ConnectorDetails
              connectorId={activeConnectorId}
              onAddConnection={() => setCurrentView('add')}
            />
          )}
          {activeConnectorId && currentView === 'add' && (
            <AddConnection
              connectorId={activeConnectorId}
              onCancel={() => setCurrentView('details')}
              onSaveConfig={(name, config) => handleSaveConnectionConfig(name, config)}
            />
          )}
        </Dialog>
      </DialogRoot>
    </div>
  );
}
