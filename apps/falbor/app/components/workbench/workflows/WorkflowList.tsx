import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@nanostores/react';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';
import * as Dialog from '@radix-ui/react-dialog';
import { getAll, chatId as chatIdStore } from '~/lib/persistence';
import { WorkflowTemplates, type TemplateType } from './WorkflowTemplates';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  updatedAt: string;
  thumbnailUrl?: string;
  chatId?: string;
}

interface WorkflowListProps {
  onSelectWorkflow: (id: string | null) => void;
}



export function WorkflowList({ onSelectWorkflow }: WorkflowListProps) {
  const params = useParams();
  const storeChatId = useStore(chatIdStore);
  const chatId = (params.id as string) || storeChatId;

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [workflowToDuplicate, setWorkflowToDuplicate] = useState<Workflow | null>(null);
  const [chats, setChats] = useState<{ id: string, title: string }[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);

  const fetchWorkflows = () => {
    let url = '/api/workflows/list?t=' + Date.now();
    if (chatId) {
      url += `&chatId=${chatId}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWorkflows(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkflows();
  }, [chatId]);



  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await fetch('/api/workflows/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId })
      });
      fetchWorkflows();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicate = async (workflowId: string, targetChatId?: string) => {
    try {
      await fetch('/api/workflows/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, targetChatId: targetChatId || chatId })
      });
      fetchWorkflows();
      if (targetChatId) {
        setDuplicateModalOpen(false);
        setWorkflowToDuplicate(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openDuplicateToChat = async (workflow: Workflow) => {
    setWorkflowToDuplicate(workflow);
    setDuplicateModalOpen(true);
    setLoadingChats(true);

    try {
      
      const res = await fetch('/api/chats/list');
      const data = await res.json();
      const serverChats = data.success ? data.data : [];

      
      const localItems = await getAll();
      const localChats = localItems.map(item => ({
        id: item.urlId as string,
        title: item.description || 'Untitled Chat',
        createdAt: item.timestamp
      }));

      
      const combined = [...serverChats, ...localChats].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      
      const unique = Array.from(new Map(combined.map(c => [c.id, c])).values());

      setChats(unique);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChats(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="i-svg-spinners:90-ring-with-bg text-3xl text-accent-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full">
      <div className="w-full flex flex-col">

        {}
        <div>
          <h1 className='ml-4 pb-2 pt-2 text-xl'>Your Workflows</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 border-y border-falbor-elements-borderColor">
            {workflows.length === 0 ? (
              <div className="col-span-full p-24 flex flex-col items-center justify-center bg-falbor-elements-background-depth-2 text-center border-b border-falbor-elements-borderColor">
                <div className="w-16 h-16 rounded-full bg-falbor-elements-background-depth-3 flex items-center justify-center mb-6">
                  <div className="i-ph:empty text-3xl text-falbor-elements-textSecondary" />
                </div>
                <h3 className="font-semibold text-xl text-falbor-elements-textPrimary mb-2">No Workflows Yet</h3>
                <p className="text-base text-falbor-elements-textSecondary max-w-md">
                  Create a new blank workflow or start from one of the templates below.
                </p>
              </div>
            ) : (
              workflows.map(wf => (
                <div
                  key={wf.id}
                  onClick={() => onSelectWorkflow(wf.id)}
                  className="group flex flex-col bg-falbor-elements-background-depth-1 border-r border-b-0 border-falbor-elements-borderColor overflow-hidden hover:bg-falbor-elements-background-depth-2 transition-all cursor-pointer relative rounded-none"
                >
                  {}
                  <div
                    className="h-56 bg-falbor-elements-background-depth-3 border-b border-falbor-elements-borderColor relative overflow-hidden group-hover:opacity-90"
                    onClick={() => onSelectWorkflow(wf.id)}
                  >
                    {wf.thumbnailUrl ? (
                      <img src={wf.thumbnailUrl} alt={wf.name} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="i-ph:projector-screen text-4xl text-falbor-elements-textTertiary opacity-30" />
                      </div>
                    )}
                  </div>

                  {}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 onClick={() => onSelectWorkflow(wf.id)} className="font-semibold text-xl text-falbor-elements-textPrimary line-clamp-1 hover:underline">{wf.name}</h3>

                      <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                          align="end"
                          className="min-w-[160px]"
                          trigger={
                            <button className="p-1 -mr-2 rounded-md hover:bg-falbor-elements-background-depth-2 text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary transition-colors outline-none">
                              <div className="i-ph:dots-three-vertical text-xl" />
                            </button>
                          }
                        >
                          <DropdownItem onSelect={() => handleDuplicate(wf.id)}>
                            <div className="flex items-center gap-2 text-falbor-elements-textPrimary">
                              <div className="i-ph:copy" />
                              Duplicate
                            </div>
                          </DropdownItem>
                          <DropdownItem onSelect={() => openDuplicateToChat(wf)}>
                            <div className="flex items-center gap-2 text-falbor-elements-textPrimary">
                              <div className="i-ph:share-network" />
                              Duplicate to Chat...
                            </div>
                          </DropdownItem>
                          <div className="h-px bg-falbor-elements-borderColor my-1" />
                          <DropdownItem
                            className="hover:!bg-red-500/10 hover:!text-red-500"
                            onSelect={() => handleDelete(wf.id)}
                          >
                            <div className="flex items-center gap-2 text-red-500">
                              <div className="i-ph:trash" />
                              Delete
                            </div>
                          </DropdownItem>
                        </Dropdown>
                      </div>
                    </div>
                    <p className="text-base text-falbor-elements-textSecondary line-clamp-2 mb-6 flex-1">
                      {wf.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-sm text-falbor-elements-textTertiary font-medium">
                        Updated {new Date(wf.updatedAt).toLocaleDateString()}
                      </div>
                      <div onClick={() => onSelectWorkflow(wf.id)} className="w-10 h-10 rounded-full bg-falbor-elements-textPrimary text-falbor-elements-background-depth-1 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                        <div className="i-ph:arrow-right-bold text-base" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>


      </div>

      {}
      <Dialog.Root open={duplicateModalOpen} onOpenChange={setDuplicateModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor rounded-xl shadow-2xl w-[480px] max-w-[90vw] z-50 animate-in zoom-in-95 p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-falbor-elements-textPrimary">
                Duplicate to Chat
              </Dialog.Title>
              <Dialog.Close className="p-1 rounded-md text-falbor-elements-textSecondary hover:bg-falbor-elements-background-depth-3 transition-colors">
                <div className="i-ph:x" />
              </Dialog.Close>
            </div>

            <p className="text-sm text-falbor-elements-textSecondary mb-4">
              Select a destination chat to duplicate <strong>{workflowToDuplicate?.name}</strong> to:
            </p>

            <div className="max-h-[300px] overflow-y-auto border border-falbor-elements-borderColor rounded-md bg-falbor-elements-background-depth-1">
              {loadingChats ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="i-svg-spinners:90-ring-with-bg text-2xl text-accent-500" />
                </div>
              ) : chats.length === 0 ? (
                <div className="p-8 text-center text-sm text-falbor-elements-textSecondary">
                  No other chats found.
                </div>
              ) : (
                <div className="flex flex-col">
                  {chats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => workflowToDuplicate && handleDuplicate(workflowToDuplicate.id, chat.id)}
                      className="text-left px-4 py-3 border-b border-falbor-elements-borderColor last:border-b-0 hover:bg-falbor-elements-background-depth-3 transition-colors flex items-center justify-between group"
                    >
                      <span className="font-medium text-sm text-falbor-elements-textPrimary truncate mr-4">
                        {chat.title || 'Untitled Chat'}
                      </span>
                      <span className="text-xs text-falbor-elements-textTertiary group-hover:text-accent-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
