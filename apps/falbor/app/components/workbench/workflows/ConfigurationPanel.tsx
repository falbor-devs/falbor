import React, { memo } from 'react';
import type { Node } from '@xyflow/react';

interface ConfigurationPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export const ConfigurationPanel = memo(({ selectedNode, onUpdateNode, onClose }: ConfigurationPanelProps) => {
  if (!selectedNode) return null;

  const handleChange = (key: string, value: string) => {
    onUpdateNode(selectedNode.id, { ...selectedNode.data, [key]: value });
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-falbor-elements-background-depth-2 border-l border-falbor-elements-borderColor shadow-lg flex flex-col z-20">
      <div className="flex items-center justify-between p-4 border-b border-falbor-elements-borderColor">
        <h3 className="font-semibold text-falbor-elements-textPrimary">Configure {selectedNode.type?.replace('Node', '')}</h3>
        <button onClick={onClose} className="p-1 hover:bg-falbor-elements-background-depth-3 rounded text-falbor-elements-textSecondary">
          <div className="i-ph:x" />
        </button>
      </div>
      
      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-falbor-elements-textSecondary">Label</label>
          <input 
            type="text" 
            value={selectedNode.data.label as string || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            className="w-full px-3 py-2 bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-md text-sm text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-falbor-elements-textSecondary">Description</label>
          <textarea 
            value={selectedNode.data.description as string || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-md text-sm text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
          />
        </div>

        {selectedNode.type === 'actionNode' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-falbor-elements-textSecondary">Action Type</label>
            <select 
              value={selectedNode.data.actionType as string || 'email'}
              onChange={(e) => handleChange('actionType', e.target.value)}
              className="w-full px-3 py-2 bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-md text-sm text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-accent-500"
            >
              <option value="email">Send Email</option>
              <option value="webhook">Webhook</option>
              <option value="db_insert">Database Insert</option>
              <option value="ai_prompt">AI Prompt</option>
            </select>
          </div>
        )}

        {selectedNode.type === 'httpRequestNode' && (
          <>
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-sm font-medium text-falbor-elements-textSecondary">Method</label>
              <select 
                value={selectedNode.data.method as string || 'GET'}
                onChange={(e) => handleChange('method', e.target.value)}
                className="w-full px-3 py-2 bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-md text-sm text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-accent-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-falbor-elements-textSecondary">URL</label>
              <input 
                type="text" 
                placeholder="https://api.example.com/data"
                value={selectedNode.data.url as string || ''}
                onChange={(e) => handleChange('url', e.target.value)}
                className="w-full px-3 py-2 bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-md text-sm text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-falbor-elements-textSecondary">Body (JSON)</label>
              <textarea 
                placeholder="{}"
                value={selectedNode.data.body as string || ''}
                onChange={(e) => handleChange('body', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-md text-sm font-mono text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y"
              />
            </div>
          </>
        )}

        {selectedNode.type === 'codeExecuteNode' && (
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-sm font-medium text-falbor-elements-textSecondary">JavaScript Code</label>
            <div className="text-xs text-falbor-elements-textTertiary mb-1">
              Access previous outputs via <code>workflowContext</code>. Return the final value.
            </div>
            <textarea 
              placeholder="return { success: true };"
              value={selectedNode.data.code as string || ''}
              onChange={(e) => handleChange('code', e.target.value)}
              rows={8}
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-falbor-elements-borderColor rounded-md text-sm font-mono text-gray-300 focus:outline-none focus:ring-1 focus:ring-accent-500 resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
});

ConfigurationPanel.displayName = 'ConfigurationPanel';
