'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@nanostores/react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { getAgentSessionsList, createNewAgentSession, getAgentSessionEvents } from '~/lib/actions/agentSession';
import { getWorkspaceById } from '~/lib/actions/workspaces';
import { AgentMessages } from '~/components/ai-side/AgentMessages';
import { AgentChatInput } from '~/components/ai-side/AgentChatInput';
import { ClientSidebar } from '~/components/sidebar/ClientSidebar';

export default function FullscreenAgentPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const agentSessionId = (params.agentId as string) || null;

  const events = useStore(aiSidebarStore.events);
  const isActive = useStore(aiSidebarStore.isActive);

  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return;
      await getWorkspaceById(workspaceId);

      const sessionData = await getAgentSessionEvents(workspaceId, agentSessionId || undefined);
      if (sessionData.id) {
        aiSidebarStore.setWorkspace(workspaceId, sessionData.events as any, sessionData.id, sessionData.title);

        if (!agentSessionId || agentSessionId !== sessionData.id) {
          router.replace(`/workspace/${workspaceId}/agent/${sessionData.id}`);
        }
      }
    }
    loadData();
  }, [workspaceId, agentSessionId, router]);

  return (
    <div className="flex flex-row h-screen w-full overflow-hidden bg-falbor-elements-background">
      <ClientSidebar />
      <div
        className={`flex-1 p-4 h-full min-w-0 bg-[#f7f7f8] dark:bg-[#111114] overflow-hidden`}
      >
        <div className={`flex flex-col items-center h-full w-full relative rounded-md border border-gray-300 dark:border-gray-800/80 overflow-hidden bg-white dark:bg-[#080808]`}>
          <div className="flex flex-col w-full max-w-xl h-full">
            <AgentMessages events={events} isActive={isActive} />
            <AgentChatInput />
          </div>
        </div>
      </div>
    </div>
  );
}