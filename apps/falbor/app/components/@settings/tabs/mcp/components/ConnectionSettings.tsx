import { useState, useRef } from 'react';
import { classNames } from '~/utils/classNames';
import { useMCPStore } from '~/lib/stores/mcp';

interface ConnectionSettingsProps {
  connector: any;
  connection: any;
  onBack: () => void;
}

function formatRelativeTime(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}

export function ConnectionSettings({ connector, connection, onBack }: ConnectionSettingsProps) {
  const [displayName, setDisplayName] = useState(connection.name);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  
  let scopes: string[] = [];
  const scopeStr = connection.config?.scope || connection.config?.authed_user?.scope || '';
  if (scopeStr) {
    scopes = scopeStr.includes(',') ? scopeStr.split(',') : scopeStr.split(' ');
  }

  
  const isApiKey = connection.type === 'api_key';
  const mcpName = connection.config?.authed_user?.name || connection.config?.user?.name || connection.name;
  const mcpEmail = isApiKey 
    ? 'API Key connection'
    : (connection.config?.authed_user?.email || connection.config?.user?.email || connection.config?.authed_user?.username || connection.config?.authed_user?.name || (connector.id === 'stripe' ? '(No email set in Stripe)' : '(No profile info)'));
  const mcpAvatar = connection.config?.authed_user?.avatar || connection.config?.user?.avatar || null;

  const updateSettings = useMCPStore((state) => state.updateSettings);
  const mcpConfig = useMCPStore((state) => state.settings.mcpConfig);
  const maxLLMSteps = useMCPStore((state) => state.settings.maxLLMSteps);
  const mcpEnabled = useMCPStore((state) => state.settings.mcpEnabled);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setDisplayName(newName);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (!newName.trim()) return;
      setIsSaving(true);
      try {
        if (isApiKey) {
          
          
          
          
        } else {
          await fetch(`/api/mcp/connections/${connection.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
          });
        }
      } catch (err) {
        console.error('Failed to update name', err);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  };

  const handleReconnect = () => {
    window.location.href = `/api/auth/${connector.id}?name=${encodeURIComponent(displayName)}&id=${connection.id}`;
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    try {
      if (isApiKey) {
        const newServers = { ...mcpConfig.mcpServers };
        delete newServers[connection.id];
        
        await updateSettings({
          mcpConfig: {
            ...mcpConfig,
            mcpServers: newServers,
          },
          maxLLMSteps,
          mcpEnabled
        });
        onBack();
      } else {
        const res = await fetch(`/api/mcp/connections/${connection.id}`, { method: 'DELETE' });
        if (res.ok) {
          onBack();
        } else {
          const error = await res.json();
          alert(`Failed to delete: ${error.error || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Failed to delete connection', err);
      alert('Network error while deleting connection');
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {}
      <div className="flex items-center gap-2 mb-2">
        <button 
          onClick={onBack}
          className="text-sm text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary flex items-center gap-1 transition-colors"
        >
          <div className="i-ph:arrow-left w-4 h-4" /> Back to Connections
        </button>
      </div>

      {}
      <div className="border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark rounded-xl bg-[#FAFAFA] dark:bg-[#1A1A1A] overflow-hidden">
        
        {}
        <div className="p-6 border-b border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img src={connector.logo} alt={connector.name} className="w-12 h-12 rounded-xl bg-white p-1 shadow-sm border border-gray-200 dark:border-gray-800" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-[#1A1A1A]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-falbor-elements-textPrimary mb-1">{displayName || connection.name}</h2>
              <p className="text-sm text-falbor-elements-textSecondary flex items-center gap-1.5">
                Connected
              </p>
            </div>
          </div>
          
          <a href={connector.docsUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary flex items-center gap-1.5 transition-colors">
            Open docs <div className="i-ph:arrow-up-right w-3.5 h-3.5" />
          </a>
        </div>

        {}
        <div className="px-6 py-4 grid grid-cols-4 gap-4">
          <div>
            <h4 className="text-[11px] font-semibold text-falbor-elements-textSecondary uppercase tracking-wider mb-2">Created by</h4>
            <div className="flex items-center gap-2">
              {mcpAvatar ? (
                <img src={mcpAvatar} alt="avatar" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[8px] font-bold">
                  {isApiKey ? (
                    <div className="i-ph:key w-2.5 h-2.5" />
                  ) : (
                    mcpName?.[0]?.toUpperCase() || '?'
                  )}
                </div>
              )}
              <span className="text-xs text-falbor-elements-textSecondary truncate">
                {mcpEmail} {isApiKey ? '' : '(connected account)'}
              </span>
            </div>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold text-falbor-elements-textSecondary uppercase tracking-wider mb-2">Type</h4>
            <div className="flex items-center gap-1.5 text-xs text-falbor-elements-textPrimary">
              <div className="i-ph:squares-four w-3.5 h-3.5 text-falbor-elements-textSecondary" />
              App + chat
            </div>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold text-falbor-elements-textSecondary uppercase tracking-wider mb-2">Last updated</h4>
            <span className="text-xs text-falbor-elements-textPrimary">{formatRelativeTime(connection.updatedAt)}</span>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold text-falbor-elements-textSecondary uppercase tracking-wider mb-2">Auth</h4>
            <span className="text-xs text-falbor-elements-textPrimary">OAuth2</span>
          </div>
        </div>
      </div>

      {}
      <div className="border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark rounded-xl bg-[#FAFAFA] dark:bg-[#1A1A1A] p-6 space-y-8">
        
        {}
        <div>
          <h3 className="text-sm font-semibold text-falbor-elements-textPrimary mb-1">Display name</h3>
          <p className="text-xs text-falbor-elements-textSecondary mb-3">
            This name will only be used in Falbor to identify this connection.
          </p>
          <div className="relative">
            <input 
              type="text" 
              value={displayName}
              onChange={handleNameChange}
              className="w-full bg-white dark:bg-[#0A0A0A] border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark rounded-lg px-3 py-2 text-sm text-falbor-elements-textPrimary focus:outline-none focus:border-blue-500 transition-colors"
            />
            {isSaving && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="i-svg-spinners:90-ring-with-bg text-blue-500 w-4 h-4" />
              </div>
            )}
          </div>
        </div>

      </div>

      {}
      {connector.method === 'oauth' && (
        <div className="grid grid-cols-[1fr_2fr] gap-8 pt-4">
          
          <div>
            <h3 className="text-lg font-semibold text-falbor-elements-textPrimary mb-2">Scopes</h3>
            <p className="text-sm text-falbor-elements-textSecondary leading-relaxed mb-3">
              Scopes tell apps what they're allowed to do. When you connect, you approve exactly which actions it can perform. Your scopes are set but you can adjust them by reconnecting if required.
            </p>
            <a href={connector.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark rounded-md text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary transition-colors">
              Docs <div className="i-ph:arrow-up-right w-3 h-3" />
            </a>
            
            <div className="mt-8">
              <button
                onClick={handleReconnect}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Reconnect
              </button>
              <p className="text-xs text-falbor-elements-textSecondary mt-3 leading-relaxed">
                A new window will open. If your browser blocks it, you'll be redirected instead.<br/>
                By connecting, you agree to {connector.name}'s <a href={connector.termsUrl} target="_blank" rel="noreferrer" className="underline hover:text-falbor-elements-textPrimary">Terms of Service</a>.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {}
            {scopes.length > 0 ? (
              scopes.map((scope, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 rounded-xl border border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark bg-[#FAFAFA] dark:bg-[#1A1A1A]">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-falbor-elements-textPrimary">Allowed access</h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500">Required</span>
                    </div>
                    <code className="text-xs text-falbor-elements-textSecondary font-mono">{scope}</code>
                  </div>
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-blue-600">
                    <div className="i-ph:check-bold text-white w-3.5 h-3.5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark text-center">
                <p className="text-sm text-falbor-elements-textSecondary">No specific scopes recorded.</p>
              </div>
            )}
          </div>
          
        </div>
      )}
      
      {}
      <div className="pt-8 border-t border-red-500/20 mt-8">
        <h3 className="text-sm font-semibold text-red-500 mb-1">Danger Zone</h3>
        <p className="text-xs text-falbor-elements-textSecondary mb-4">
          Permanently delete this connection. This action cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
        >
          Delete Connection
        </button>
      </div>

    </div>
  );
}
