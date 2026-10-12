import { useEffect, useState, useMemo } from 'react';
import { classNames } from '~/utils/classNames';
import { MCP_CONNECTORS, MCPConnector } from './connectors';
import { ConnectionsTable } from './components/ConnectionsTable';
import { ConnectionSettings } from './components/ConnectionSettings';
import { useMCPStore } from '~/lib/stores/mcp';

interface ConnectorDetailsProps {
  connectorId: string;
  onAddConnection: () => void;
}

export default function ConnectorDetails({ connectorId, onAddConnection }: ConnectorDetailsProps) {
  const connector = MCP_CONNECTORS.find((c) => c.id === connectorId);

  const [dbConnections, setDbConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<any | null>(null);
  
  const mcpConfig = useMCPStore((state) => state.settings.mcpConfig);

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/mcp/connections', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDbConnections(data.connections.filter((c: any) => c.connectorId === connectorId));
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
    setSelectedConnection(null);
  }, [connectorId]);

  const existingConnections = useMemo(() => {
    const localConnections = Object.entries(mcpConfig?.mcpServers || {})
      .filter(([key]) => key.startsWith(`${connectorId}-`))
      .map(([key, config]) => {
        const namePart = key.replace(`${connectorId}-`, '');
        const name = namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/-/g, ' ');
        return {
          id: key,
          connectorId: connectorId,
          name: name,
          config: config,
          type: 'api_key',
          createdAt: new Date().toISOString(),
        };
      });

    return [...dbConnections, ...localConnections];
  }, [dbConnections, mcpConfig, connectorId]);

  if (!connector) {
    return <div>Connector not found</div>;
  }

  
  if (selectedConnection) {
    return (
      <ConnectionSettings 
        connector={connector} 
        connection={selectedConnection} 
        onBack={() => {
          setSelectedConnection(null);
          fetchConnections(); 
        }}
      />
    );
  }

  
  return (
    <div className="flex flex-col space-y-8">
      {}
      <div className="flex items-center gap-4 p-4 rounded-xl border bg-falbor-elements-background-depth-2 border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark">
        <img src={connector.logo} alt={connector.name} className="w-12 h-12 rounded-lg object-contain bg-transparent" />
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-falbor-elements-textPrimary">{connector.name}</h2>
          <span className="text-sm text-falbor-elements-textSecondary">Enabled</span>
        </div>
      </div>

      {}
      <section>
        <h3 className="text-base font-semibold text-falbor-elements-textPrimary mb-2">Overview</h3>
        <p className="text-sm text-falbor-elements-textSecondary">{connector.description}</p>
      </section>

      {}
      <ConnectionsTable 
        connections={existingConnections} 
        isLoading={isLoading} 
        onAddConnection={onAddConnection} 
        onSelectConnection={setSelectedConnection} 
      />

      {}
      <section className="pt-6 mt-6 border-t border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark">
        <h3 className="text-base font-semibold text-falbor-elements-textPrimary mb-4">Details</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h4 className="text-xs text-falbor-elements-textSecondary mb-2 uppercase tracking-wider font-semibold">Created by</h4>
            <a href="https://falbor.com" target="_blank" rel="noreferrer" className="text-sm text-falbor-elements-textPrimary hover:underline flex items-center gap-1">
              Falbor <div className="i-ph:arrow-up-right w-3 h-3" />
            </a>
          </div>
          <div>
            <h4 className="text-xs text-falbor-elements-textSecondary mb-2 uppercase tracking-wider font-semibold">Docs</h4>
            <a href={connector.docsUrl} target="_blank" rel="noreferrer" className="text-sm text-falbor-elements-textPrimary hover:underline flex items-center gap-1">
              {connector.docsUrl} <div className="i-ph:arrow-up-right w-3 h-3" />
            </a>
          </div>
          <div>
            <h4 className="text-xs text-falbor-elements-textSecondary mb-2 uppercase tracking-wider font-semibold">Terms</h4>
            <a href={connector.termsUrl} target="_blank" rel="noreferrer" className="text-sm text-falbor-elements-textPrimary hover:underline flex items-center gap-1">
              {connector.termsUrl} <div className="i-ph:arrow-up-right w-3 h-3" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
