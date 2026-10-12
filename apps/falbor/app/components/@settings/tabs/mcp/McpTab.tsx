'use client';
import { useEffect, useMemo, useState } from 'react';
import { classNames } from '~/utils/classNames';
import type { MCPConfig } from '~/lib/services/mcpService';
import { toast } from 'react-toastify';
import { useMCPStore } from '~/lib/stores/mcp';
import McpServerList from '~/components/@settings/tabs/mcp/McpServerList';
import ConnectorList from './ConnectorList';
import ConnectorDetails from './ConnectorDetails';
import AddConnection from './AddConnection';
import { MCP_CONNECTORS } from './connectors';
import GitHubTab from '~/components/@settings/tabs/github/GitHubTab';
import GitLabTab from '~/components/@settings/tabs/gitlab/GitLabTab';
import NetlifyTab from '~/components/@settings/tabs/netlify/NetlifyTab';
import VercelTab from '~/components/@settings/tabs/vercel/VercelTab';
import SupabaseTab from '~/components/@settings/tabs/supabase/SupabaseTab';

const EXAMPLE_MCP_CONFIG: MCPConfig = {
  mcpServers: {
    everything: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everything'],
    },
    deepwiki: {
      type: 'streamable-http',
      url: 'https://mcp.deepwiki.com/mcp',
    },
    'local-sse': {
      type: 'sse',
      url: 'http://localhost:8000/sse',
      headers: {
        Authorization: 'Bearer mytoken123',
      },
    },
  },
};

export default function McpTab() {
  const settings = useMCPStore((state) => state.settings);
  const isInitialized = useMCPStore((state) => state.isInitialized);
  const serverTools = useMCPStore((state) => state.serverTools);
  const initialize = useMCPStore((state) => state.initialize);
  const updateSettings = useMCPStore((state) => state.updateSettings);
  const checkServersAvailabilities = useMCPStore((state) => state.checkServersAvailabilities);

  const [isSaving, setIsSaving] = useState(false);
  const [mcpConfigText, setMCPConfigText] = useState('');
  const [maxLLMSteps, setMaxLLMSteps] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingServers, setIsCheckingServers] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);

  
  const [currentView, setCurrentView] = useState<'list' | 'details' | 'add' | 'custom'>('list');
  const [activeConnectorId, setActiveConnectorId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      initialize().catch((err) => {
        setError(`Failed to initialize MCP settings: ${err instanceof Error ? err.message : String(err)}`);
        toast.error('Failed to load MCP configuration');
      });
    }
  }, [isInitialized]);

  useEffect(() => {
    setMCPConfigText(JSON.stringify(settings.mcpConfig, null, 2));
    setMaxLLMSteps(settings.maxLLMSteps);
    setError(null);
  }, [settings]);

  const parsedConfig = useMemo(() => {
    try {
      setError(null);
      return JSON.parse(mcpConfigText) as MCPConfig;
    } catch (e) {
      setError(`Invalid JSON format: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }, [mcpConfigText]);

  const handleMaxLLMCallChange = (value: string) => {
    setMaxLLMSteps(parseInt(value, 10));
  };

  const handleSave = async () => {
    if (!parsedConfig) {
      return;
    }

    setIsSaving(true);

    try {
      await updateSettings({
        mcpConfig: parsedConfig,
        maxLLMSteps,
        mcpEnabled: settings.mcpEnabled,
      });
      toast.success('MCP configuration saved');

      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save configuration');
      toast.error('Failed to save MCP configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadExample = () => {
    setMCPConfigText(JSON.stringify(EXAMPLE_MCP_CONFIG, null, 2));
    setError(null);
  };

  const checkServerAvailability = async () => {
    if (serverEntries.length === 0) {
      return;
    }

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

  const serverEntries = useMemo(() => Object.entries(serverTools), [serverTools]);

  const handleSelectConnector = (id: string) => {
    if (id === 'custom') {
      setCurrentView('custom');
    } else {
      setActiveConnectorId(id);
      setCurrentView('details');
    }
  };

  const handleSaveConnectionConfig = async (connectionName: string, config: any) => {
    if (!parsedConfig) return;
    
    if (config) {
      
      const serverKey = `${activeConnectorId}-${connectionName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      
      const newConfig = {
        ...parsedConfig,
        mcpServers: {
          ...parsedConfig.mcpServers,
          [serverKey]: config,
        },
      };

      setIsSaving(true);
      try {
        await updateSettings({
          mcpConfig: newConfig,
          maxLLMSteps,
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
      setCurrentView('details');
    }
  };

  const activeConnector = activeConnectorId ? MCP_CONNECTORS.find(c => c.id === activeConnectorId) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {}
      {currentView !== 'list' && (
        <div className="flex items-center gap-2 mb-6 text-sm text-falbor-elements-textSecondary">
          <button onClick={() => { setCurrentView('list'); setActiveConnectorId(null); }} className="hover:text-falbor-elements-textPrimary hover:underline transition-colors">
            Connectors
          </button>
          
          {currentView === 'custom' && (
            <>
              <div className="i-ph:caret-right w-3 h-3" />
              <span className="text-falbor-elements-textPrimary">Custom MCP</span>
            </>
          )}

          {activeConnector && (
            <>
              <div className="i-ph:caret-right w-3 h-3" />
              <button 
                onClick={() => setCurrentView('details')} 
                className={classNames('transition-colors', currentView === 'details' ? 'text-falbor-elements-textPrimary' : 'hover:text-falbor-elements-textPrimary hover:underline')}
              >
                {activeConnector.name}
              </button>
            </>
          )}

          {currentView === 'add' && (
            <>
              <div className="i-ph:caret-right w-3 h-3" />
              <span className="text-falbor-elements-textPrimary">Connection</span>
            </>
          )}
        </div>
      )}

      {currentView === 'list' && (
        <section>
          <div className="mb-6">
            <h2 className="text-lg font-medium text-falbor-elements-textPrimary">MCP Integrations</h2>
            <p className="text-sm text-falbor-elements-textSecondary mt-1">Connect your favorite tools to give the AI access to your data and workflows.</p>
          </div>
          <ConnectorList onSelect={handleSelectConnector} />
        </section>
      )}

      {currentView === 'details' && activeConnectorId && activeConnector?.isNativeTab && (
        <div className="bg-falbor-elements-background-depth-2 p-6 rounded-lg border border-falbor-elements-borderColor">
          {activeConnectorId === 'github' && <GitHubTab />}
          {activeConnectorId === 'gitlab' && <GitLabTab />}
          {activeConnectorId === 'netlify' && <NetlifyTab />}
          {activeConnectorId === 'vercel' && <VercelTab />}
          {activeConnectorId === 'supabase' && <SupabaseTab />}
        </div>
      )}

      {currentView === 'details' && activeConnectorId && !activeConnector?.isNativeTab && (
        <ConnectorDetails 
          connectorId={activeConnectorId} 
          onAddConnection={() => setCurrentView('add')} 
        />
      )}

      {currentView === 'add' && activeConnectorId && (
        <AddConnection 
          connectorId={activeConnectorId} 
          onCancel={() => setCurrentView('details')} 
          onSaveConfig={handleSaveConnectionConfig}
        />
      )}

      {currentView === 'custom' && (
        <div className="space-y-6">
          <section aria-labelledby="server-status-heading">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-medium text-falbor-elements-textPrimary">Custom MCP Servers</h2>{' '}
              <button
                onClick={checkServerAvailability}
                disabled={isCheckingServers || !parsedConfig || serverEntries.length === 0}
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
            <McpServerList
              checkingServers={isCheckingServers}
              expandedServer={expandedServer}
              serverEntries={serverEntries}
              toggleServerExpanded={toggleServerExpanded}
            />
          </section>

          <section aria-labelledby="config-section-heading">
            <h2 className="text-base font-medium text-falbor-elements-textPrimary mb-3">Configuration</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="mcp-config" className="block text-sm text-falbor-elements-textSecondary mb-2">
                  Configuration JSON
                </label>
                <textarea
                  id="mcp-config"
                  value={mcpConfigText}
                  onChange={(e) => setMCPConfigText(e.target.value)}
                  className={classNames(
                    'w-full px-3 py-2 rounded-lg text-sm font-mono h-72',
                    'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                    'border',
                    error ? 'border-falbor-elements-icon-error' : 'border-[#E5E5E5] dark:border-[#333333]',
                    'text-falbor-elements-textPrimary',
                    'focus:outline-none focus:ring-1 focus:ring-falbor-elements-focus',
                  )}
                />
              </div>
              <div>{error && <p className="mt-2 mb-2 text-sm text-falbor-elements-icon-error">{error}</p>}</div>
              <div>
                <label htmlFor="max-llm-steps" className="block text-sm text-falbor-elements-textSecondary mb-2">
                  Maximum number of sequential LLM calls (steps)
                </label>
                <input
                  id="max-llm-steps"
                  type="number"
                  placeholder="Maximum number of sequential LLM calls"
                  min="1"
                  max="20"
                  value={maxLLMSteps}
                  onChange={(e) => handleMaxLLMCallChange(e.target.value)}
                  className="w-full px-3 py-2 text-falbor-elements-textPrimary text-sm rounded-lg bg-white dark:bg-falbor-elements-background-depth-4 border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mt-2 text-sm text-falbor-elements-textSecondary">
                The MCP configuration format is identical to the one used in Claude Desktop.
                <a
                  href="https://modelcontextprotocol.io/examples"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-falbor-elements-link hover:underline inline-flex items-center gap-1 ml-1"
                >
                  View example servers
                  <div className="i-ph:arrow-square-out w-4 h-4" />
                </a>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap justify-between gap-3 mt-6">
            <button
              onClick={handleLoadExample}
              className="px-4 py-2 rounded-lg text-sm border border-falbor-elements-borderColor
                        bg-falbor-elements-background-depth-2 text-falbor-elements-textSecondary
                        hover:bg-falbor-elements-background-depth-3"
            >
              Load Example
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving || !parsedConfig}
                aria-disabled={isSaving || !parsedConfig}
                className={classNames(
                  'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                  'bg-falbor-elements-item-backgroundAccent text-falbor-elements-item-contentAccent',
                  'hover:bg-falbor-elements-item-backgroundActive',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <div className="i-ph:floppy-disk w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
