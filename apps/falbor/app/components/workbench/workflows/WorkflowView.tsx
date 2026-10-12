'use client';

import React, { memo, useState } from 'react';
import { WorkflowCanvas } from './WorkflowCanvas';
import { Sidebar } from './Sidebar';
import { WorkflowList } from './WorkflowList';
import { McpTools } from '~/components/chat/tools/MCPTools';
import { Dialog, DialogTitle, DialogRoot } from '~/components/ui/Dialog';
import { PanelHeader } from '~/components/ui/PanelHeader';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { WorkflowTemplates, type TemplateType } from './WorkflowTemplates';
import { useParams } from 'next/navigation';
import { useStore } from '@nanostores/react';
import { chatId as chatIdStore } from '~/lib/persistence';

interface WorkflowViewProps {
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
}

export const WorkflowView = memo(({ sendMessage }: WorkflowViewProps) => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);

  const params = useParams();
  const storeChatId = useStore(chatIdStore);
  const chatId = (params.id as string) || storeChatId;

  const openEditor = (id: string | null) => {
    setCurrentWorkflowId(id);
    setView('editor');
  };

  const handleUseTemplate = async (template: TemplateType) => {
    setCreatingTemplate(template.id);
    try {
      const res = await fetch('/api/workflows/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name + ' (Copy)',
          description: template.description,
          nodes: template.nodes,
          edges: template.edges,
          chatId: chatId || null
        })
      });
      const data = await res.json();
      if (data.success && data.workflowId) {
        setIsTemplatesOpen(false);
        openEditor(data.workflowId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingTemplate(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary overflow-hidden">
      {}
      <PanelHeader className="justify-between">
        {}
        <div className="flex items-center gap-2 text-falbor-elements-textPrimary">
          {view === 'editor' && (
            <PanelHeaderButton onClick={() => setView('list')}>
              <div className="i-ph:arrow-left" />
            </PanelHeaderButton>
          )}

          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {view === 'editor' ? 'Workflow Editor' : 'Your Workflows'}
            </span>
            <a
              href="/docs/workflow"
              target="_blank"
              className="text-xs font-medium text-accent-500 hover:opacity-80 transition-opacity flex items-center gap-1 bg-accent-500/10 px-1.5 py-0.5 rounded-md"
            >
              <div className="i-ph:info" />
              Learn more
            </a>
          </div>
        </div>

        {}
        <div className="flex items-center gap-2">
          <McpTools />

          <PanelHeaderButton onClick={() => setIsTemplatesOpen(true)}>
            <div className="i-ph:books" />
            Templates
          </PanelHeaderButton>

          <button
            onClick={() => openEditor(null)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#0099ff]/10 text-[#0099ff] hover:bg-[#0099ff]/20 rounded-md text-sm font-medium transition-colors"
          >
            <div className="i-ph:plus-bold" />
            Blank Workflow
          </button>
        </div>
      </PanelHeader>


      {}
      {view === 'list' ? (
        <WorkflowList onSelectWorkflow={openEditor} />
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar />

          <div className="flex-1 relative h-full">
            <WorkflowCanvas
              workflowId={currentWorkflowId}
              sendMessage={sendMessage}
            />
          </div>
        </div>
      )}

      <DialogRoot open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
        <Dialog onClose={() => setIsTemplatesOpen(false)} onBackdrop={() => setIsTemplatesOpen(false)}>
          <div className="flex items-center justify-between p-4 border-b border-falbor-elements-borderColor">
            <DialogTitle>Templates <span className='text-xs font-normal text-[#0099FF] bg-[#0099ff]/20 px-2 py-1 ml-2 rounded-sm'>by falbor</span></DialogTitle>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <WorkflowTemplates creatingTemplate={creatingTemplate} onUseTemplate={handleUseTemplate} />
          </div>
        </Dialog>
      </DialogRoot>
    </div>
  );
});

WorkflowView.displayName = 'WorkflowView';