import { useState } from 'react';
import { classNames } from '~/utils/classNames';
import { MCP_CONNECTORS } from './connectors';

interface AddConnectionProps {
  connectorId: string;
  onCancel: () => void;
  onSaveConfig: (name: string, config: any) => void;
}

export default function AddConnection({ connectorId, onCancel, onSaveConfig }: AddConnectionProps) {
  const connector = MCP_CONNECTORS.find((c) => c.id === connectorId);
  const [connectionName, setConnectionName] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);

  if (!connector) {
    return <div>Connector not found</div>;
  }

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleConnect = async () => {
    if (!connectionName) {
      alert('Please provide a connection name.');
      return;
    }

    setIsConnecting(true);

    try {
      if (connector.method === 'oauth') {
        
        window.location.href = `/api/auth/${connector.id}?name=${encodeURIComponent(connectionName)}`;
      } else {
        
        
        const missingFields = connector.fields?.filter((f) => !formData[f.id]);
        if (missingFields && missingFields.length > 0) {
          alert(`Please fill in all fields: ${missingFields.map((f) => f.label).join(', ')}`);
          setIsConnecting(false);
          return;
        }

        
        
        const dbRes = await fetch('/api/mcp/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectorId: connector.id,
            name: connectionName,
            config: formData, 
          }),
        });

        if (!dbRes.ok) {
          const err = await dbRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to save connection to database');
        }

        
        
        const env: Record<string, string> = {};
        Object.entries(formData).forEach(([key, value]) => {
          env[`${connector.id.toUpperCase()}_${key.toUpperCase()}`] = value;
        });

        let command = 'npx';
        let args = ['-y', `@modelcontextprotocol/server-${connector.id}`];

        let shouldSaveMcpConfig = true;

        
        if (connector.id === 'klipy') {
          args = ['-y', 'tsx', 'app/mcp-servers/klipy.ts'];
        } else if (connector.id === 'telegram') {
          args = ['-y', 'tsx', 'app/mcp-servers/telegram.ts'];
        } else if (['discord-bot', 'miro', 'resend', 'twilio', 'firecrawl', 'bigquery', 'apollo', 'custom'].includes(connector.id)) {
          shouldSaveMcpConfig = false;
        }

        if (shouldSaveMcpConfig) {
          onSaveConfig(connectionName, {
            type: 'stdio',
            command,
            args,
            env,
          });
        } else {
          onSaveConfig(connectionName, null);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to connect: ${err.message || 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };


  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-falbor-elements-textPrimary mb-1">
          Connect {connector.name}
        </h2>
        <p className="text-sm text-falbor-elements-textSecondary">
          Enter the required details to authenticate and connect your {connector.name} account.
        </p>
      </div>

      <div className="space-y-4 bg-falbor-elements-background-depth-2 p-6 rounded-xl border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark">
        <div>
          <label htmlFor="connectionName" className="block text-sm font-medium text-falbor-elements-textPrimary mb-1.5">
            Connection Name
          </label>
          <input
            id="connectionName"
            type="text"
            placeholder={`My ${connector.name} Connection`}
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333333] text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1.5 text-xs text-falbor-elements-textSecondary">
            This name will only be used in Falbor to identify this connection.
          </p>
        </div>

        {connector.method === 'api_key' && connector.fields && (
          <div className="space-y-4 pt-4 border-t border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark">
            {connector.fields.map((field) => (
              <div key={field.id}>
                <label htmlFor={field.id} className="block text-sm font-medium text-falbor-elements-textPrimary mb-1.5">
                  {field.label}
                </label>
                <input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder || field.label}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333333] text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm bg-transparent border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-3 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <div className="i-svg-spinners:90-ring-with-bg w-4 h-4" />
          ) : connector.method === 'oauth' ? (
            <div className="i-ph:link-bold w-4 h-4" />
          ) : (
            <div className="i-ph:plugs-connected-bold w-4 h-4" />
          )}
          {connector.method === 'oauth' ? 'Connect Account' : 'Connect'}
        </button>
      </div>
    </div>
  );
}
