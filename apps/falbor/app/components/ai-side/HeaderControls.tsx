'use client';

import React, { useState } from 'react';
import {
  IoAdd,
  IoTrashOutline,
  IoExpandOutline,
  IoClose,
  IoSparkles,
  IoEllipsisVertical,
  IoChatboxOutline,
  IoCheckmark,
  IoLinkOutline,
  IoSettingsOutline,
  IoPersonCircleOutline,
} from 'react-icons/io5';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { WorkspaceSettingsModal } from '~/components/workspace/workspace-settings/WorkspaceSettingsModal';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownSub,
  DropdownSubTrigger,
  DropdownSubContent,
} from '~/components/ui/Dropdown';
import { TelegramConnectModal } from './TelegramConnectModal';
import { Badge } from '../ui';
import { useAgentSessions } from './hooks/useAgentSessions';
import { useAgentSelection } from './hooks/useAgentSelection';

export const HeaderControls = () => {
  const {
    sessions,
    workspaceId,
    currentSessionId,
    currentSessionTitle,
    handleCreateNewChat,
    handleSelectSession,
    handleSaveRename,
    handleDeleteSession,
    refreshSessions,
  } = useAgentSessions();

  const { agents, currentAgent, handleSelectAgent } = useAgentSelection(
    workspaceId,
    handleSelectSession,
    (updatedSessions) => refreshSessions(),
  );

  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleStartRename = () => {
    setTitleInput(currentSessionTitle || 'Onboarding');
    setIsEditing(true);
  };

  const onSaveRename = async () => {
    setIsEditing(false);
    await handleSaveRename(titleInput);
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 rounded-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2 min-w-0">
          <button
            onClick={handleStartRename}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity focus:outline-none text-left shrink truncate min-w-0"
            title="Click to rename session"
          >
            {currentAgent?.avatarUrl ? (
              <img src={currentAgent.avatarUrl} alt="Agent" className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
              <IoSparkles className="text-blue-500 text-xl shrink-0" />
            )}
            {isEditing ? (
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveRename();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                onBlur={onSaveRename}
                autoFocus
                className="text-sm font-semibold bg-white dark:bg-gray-800 border border-blue-500 rounded px-1.5 py-0.5 text-gray-900 dark:text-white outline-none w-full"
              />
            ) : (
              <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {currentSessionTitle || 'Onboarding'}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center shrink-0">
          <Dropdown
            align="end"
            trigger={
              <button
                className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white rounded-md hover:bg-gray-200 dark:hover:bg-white/10 transition-colors focus:outline-none"
                title="More options"
              >
                <IoEllipsisVertical className="text-lg" />
              </button>
            }
          >
            <DropdownSub>
              <DropdownSubTrigger>
                <IoPersonCircleOutline className="text-base text-gray-500 dark:text-gray-400 shrink-0" />
                <span>Switch Agent</span>
              </DropdownSubTrigger>
              <DropdownSubContent>
                <DropdownItem
                  active={!currentAgent}
                  onSelect={() => handleSelectAgent(null)}
                >
                  {!currentAgent && <IoCheckmark className="text-sm text-blue-500 shrink-0" />}
                  <span className="truncate flex-1">Felbor Agent (Template)</span>
                </DropdownItem>
                {agents.length > 0 && <DropdownSeparator />}
                {agents.map((agent) => (
                  <DropdownItem
                    key={agent.id}
                    active={currentAgent?.id === agent.id}
                    onSelect={() => handleSelectAgent(agent)}
                  >
                    {currentAgent?.id === agent.id && <IoCheckmark className="text-sm text-blue-500 shrink-0" />}
                    <span className="truncate flex-1">{agent.name}</span>
                  </DropdownItem>
                ))}
              </DropdownSubContent>
            </DropdownSub>
            <DropdownSeparator />

            <DropdownSub>
              <DropdownSubTrigger>
                <IoChatboxOutline className="text-base text-gray-500 dark:text-gray-400 shrink-0" />
                <span>Switch Chat</span>
              </DropdownSubTrigger>
              <DropdownSubContent>
                <DropdownItem onSelect={handleCreateNewChat}>
                  <IoAdd className="text-base text-blue-500 shrink-0" />
                  <span className="text-blue-500 font-medium">New Chat</span>
                </DropdownItem>
                <DropdownSeparator />
                {sessions.length === 0 ? (
                  <DropdownItem active className="font-medium">
                    <span className="truncate">{currentSessionTitle || 'Current Chat'}</span>
                  </DropdownItem>
                ) : (
                  sessions.map((s) => (
                    <DropdownItem
                      key={s.id}
                      active={s.id === currentSessionId}
                      onSelect={() => handleSelectSession(s.id, s.title)}
                    >
                      {s.id === currentSessionId && <IoCheckmark className="text-sm text-blue-500 shrink-0" />}
                      <span className="truncate flex-1">{s.title}</span>
                    </DropdownItem>
                  ))
                )}
              </DropdownSubContent>
            </DropdownSub>

            <DropdownSub>
              <DropdownSubTrigger>
                <IoLinkOutline className="text-base text-gray-500 dark:text-gray-400 shrink-0" />
                <span>Connect</span>
              </DropdownSubTrigger>
              <DropdownSubContent>
                <DropdownItem onSelect={() => setIsTelegramModalOpen(true)}>
                  <img className='shrink-0 w-5 h-5' src="/icons/connectors/telegram_agent.svg" alt="" />
                  <span className="font-medium">Telegram</span>
                </DropdownItem>
                <DropdownItem className="opacity-50 cursor-not-allowed" onSelect={(e) => e.preventDefault()}>
                  <img className='shrink-0 w-5 h-5' src="/icons/connectors/whatsapp.svg" alt="" />
                  <span className="text-gray-400">WhatsApp <Badge variant="secondary">Soon</Badge></span>
                </DropdownItem>
              </DropdownSubContent>
            </DropdownSub>

            <DropdownItem asChild>
              <a href={`/workspace/${workspaceId}/agent/${currentSessionId || 'default'}`}>
                <IoExpandOutline className="text-base text-gray-500 dark:text-gray-400 shrink-0" />
                <span>Full Screen</span>
              </a>
            </DropdownItem>

            <DropdownItem onSelect={() => aiSidebarStore.isBrowserOpen.set(!aiSidebarStore.isBrowserOpen.get())}>
              <i className="i-ph:globe-duotone text-base text-gray-500 dark:text-gray-400 shrink-0" />
              <span>Browser View</span>
            </DropdownItem>

            <DropdownItem
              onSelect={handleDeleteSession}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <IoTrashOutline className="text-base text-red-500 shrink-0" />
              <span>Delete Chat</span>
            </DropdownItem>

            <DropdownItem onSelect={() => setIsSettingsOpen(true)}>
              <IoSettingsOutline className="text-base text-gray-500 dark:text-gray-400 shrink-0" />
              <span>Settings</span>
            </DropdownItem>

            <DropdownSeparator />

            <DropdownItem onSelect={() => aiSidebarStore.close()}>
              <IoClose className="text-base text-gray-500 dark:text-gray-400 shrink-0" />
              <span>Close</span>
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <TelegramConnectModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        sessionId={currentSessionId}
        sessionTitle={currentSessionTitle || 'Onboarding'}
      />

      {workspaceId && (
        <WorkspaceSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          workspaceId={workspaceId}
        />
      )}
    </>
  );
};
