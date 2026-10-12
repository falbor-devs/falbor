'use client';

import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { useStore } from '@nanostores/react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { HeaderControls } from './HeaderControls';
import { AgentMessages } from './AgentMessages';
import { AgentChatInput } from './AgentChatInput';
import { useAgentSessionPolling } from './hooks/useAgentSessionPolling';
import { getAgentSessionEvents } from '~/lib/actions/agentSession';

export const AISidebar = ({
  className,
  style,
  isDragging,
}: {
  className?: string;
  style?: React.CSSProperties;
  isDragging?: boolean;
}) => {
  const isOpen = useStore(aiSidebarStore.isOpen);
  const isActive = useStore(aiSidebarStore.isActive);
  const rawEvents = useStore(aiSidebarStore.events);
  const currentWorkspaceId = useStore(aiSidebarStore.currentWorkspaceId);
  const currentSessionId = useStore(aiSidebarStore.currentSessionId);
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!currentWorkspaceId) return;
    if (!currentSessionId || events.length === 0) {
      getAgentSessionEvents(currentWorkspaceId, currentSessionId || undefined).then((res) => {
        if (res && res.id) {
          aiSidebarStore.setWorkspace(currentWorkspaceId, res.events || [], res.id, res.title || 'Onboarding');
        }
      });
    }
  }, [currentWorkspaceId, currentSessionId]);

  useAgentSessionPolling(isOpen);

  const enableTransition = mounted && !isDragging;

  return (
    <div
      style={style}
      className={classNames(
        'flex flex-col h-full bg-white dark:bg-[#212121]  border border-gray-300 dark:border-gray-700 border-t-0 border-b-0 z-50 relative shrink-0',
        enableTransition ? 'transition-[width,opacity,transform] duration-200' : 'transition-none',
        isOpen ? 'opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full overflow-hidden border-0',
        className,
      )}
    >
      <HeaderControls />
      <AgentMessages events={events} isActive={isActive} />
      <AgentChatInput />
    </div>
  );
};