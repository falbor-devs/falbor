'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dropdown, DropdownItem, DropdownSeparator } from '~/components/ui/Dropdown';
import { createNewAgentSession } from '~/lib/actions/agentSession';
import { deleteAgent } from '~/lib/actions/agent';
import { toast } from 'react-toastify';

interface AgentCardActionsProps {
  workspaceId: string;
  agentId: string;
  agentName: string;
}

export function AgentCardActions({ workspaceId, agentId, agentName }: AgentCardActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStartChat = async () => {
    try {
      const newSession = await createNewAgentSession(workspaceId, `Chat with ${agentName}`, agentId);
      if (newSession) {
        router.push(`/workspace/${workspaceId}/agent/${newSession.id}`);
      } else {
        toast.error('Failed to create new chat session');
      }
    } catch (err) {
      console.error('Error starting chat:', err);
      toast.error('Failed to start chat session');
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await deleteAgent(workspaceId, agentId);
      if (success) {
        toast.success(`Agent "${agentName}" deleted`);
        router.refresh();
      } else {
        toast.error('Failed to delete agent');
      }
    } catch (err) {
      console.error('Error deleting agent:', err);
      toast.error('Failed to delete agent');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dropdown
      align="end"
      sideOffset={5}
      trigger={
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          title="More options"
        >
          <div className="i-ph:dots-three-vertical w-4 h-4" />
        </button>
      }
    >
      <DropdownItem asChild>
        <Link
          href={`/workspace/${workspaceId}/agent/create?editAgent=${agentId}`}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <div className="i-ph:pencil w-4 h-4 text-gray-500" />
          <span>Edit Agent</span>
        </Link>
      </DropdownItem>
      <DropdownItem
        onSelect={(e) => {
          e.preventDefault();
          handleStartChat();
        }}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
      >
        <div className="i-ph:chat-circle-text w-4 h-4 text-purple-500" />
        <span>New Chat</span>
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem
        onSelect={(e) => {
          e.preventDefault();
          handleDelete();
        }}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
      >
        <div className="i-ph:trash w-4 h-4 text-red-500" />
        <span>{isDeleting ? 'Deleting...' : 'Delete Agent'}</span>
      </DropdownItem>
    </Dropdown>
  );
}
