import React, { memo } from 'react';
import { McpTools } from '~/components/chat/tools/MCPTools';

export const IntegrationsView = memo(() => {
  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-8 text-falbor-elements-textPrimary">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Integrations Manager</h2>
        <p className="text-falbor-elements-textSecondary">
          Connect third-party services via OAuth or API Keys to use them in your workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {}
        <div className="border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center text-2xl shadow-sm">
              <div className="i-logos:google-icon" />
            </div>
            <div>
              <div className="font-medium">Google Workspace</div>
              <div className="text-xs text-falbor-elements-textTertiary">Gmail, Calendar, Drive</div>
            </div>
          </div>
          <button className="px-3 py-1.5 bg-falbor-elements-background-depth-3 hover:bg-falbor-elements-background-depth-4 border border-falbor-elements-borderColor rounded text-sm font-medium transition-colors">
            Connect
          </button>
        </div>

        {}
        <div className="border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center text-2xl shadow-sm">
              <div className="i-logos:slack-icon" />
            </div>
            <div>
              <div className="font-medium">Slack</div>
              <div className="text-xs text-falbor-elements-textTertiary">Send messages & alerts</div>
            </div>
          </div>
          <button className="px-3 py-1.5 bg-falbor-elements-background-depth-3 hover:bg-falbor-elements-background-depth-4 border border-falbor-elements-borderColor rounded text-sm font-medium transition-colors">
            Connect
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-2">MCP Servers</h2>
        <p className="text-falbor-elements-textSecondary mb-4">
          Register Model Context Protocol servers to dynamically expose their tools as workflow nodes.
        </p>
        
        <div className="border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 rounded-lg p-6">
          <McpTools />
        </div>
      </div>
    </div>
  );
});

IntegrationsView.displayName = 'IntegrationsView';
