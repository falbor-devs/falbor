'use client';
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { chatStore } from '~/lib/stores/chat';
import { settingsOpenStore, settingsTabStore } from '~/lib/stores/settings';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { AuthButtons } from '~/components/auth/AuthButtons';
import { UserAvatar } from '~/components/auth/UserAvatar';
import type { TabType } from '~/components/@settings/core/types';
import { sidebarOpen, sidebarPinned } from '~/lib/stores/sidebar';
import { usePathname } from 'next/navigation';
import { useChatHistory } from '~/lib/persistence';
import { ExportChatButton } from '~/components/chat/chatExportAndImport/ExportChatButton';
import Link from 'next/link';
import styles from './Header.module.scss';

export function Header() {
  const { exportChat } = useChatHistory();
  const chat = useStore(chatStore);

  const isPinned = useStore(sidebarPinned);
  const isOpen = useStore(sidebarOpen);

  const pathname = usePathname();
  const isHacking = pathname?.startsWith('/hacking');

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      sidebarOpen.set(!isOpen);
      return;
    }
    if (chat.started) {
      sidebarOpen.set(!isOpen);
    } else {
      sidebarPinned.set(!isPinned);
      sidebarOpen.set(!isPinned);
    }
  };

  const handleOpenPanel = (tab?: TabType) => {
    settingsTabStore.set(tab ?? 'settings');
    settingsOpenStore.set(true);
    sidebarOpen.set(true);
  };

  return (
    <>
      <header
        className={classNames('relative flex items-center px-4 border-b h-[var(--header-height)]', {
          'border-transparent': !chat.started,
          'border-falbor-elements-borderColor': chat.started,
        })}
      >
        { }
        <button
          onClick={toggleSidebar}
          className={classNames(
            'flex items-center justify-center p-2 -ml-2 text-falbor-elements-textPrimary',

            'md:hidden'
          )}
          title="Toggle Sidebar"
        >
          <div className="i-ph:list w-6 h-6" />
        </button>

        <button
          onClick={() => aiSidebarStore.toggle()}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-sm ml-2"
          title="Toggle AI Agent Sidebar"
        >
          <i className="i-ph:sparkle-fill text-sm" />
          <span>AI Agent</span>
        </button>

        { }
        {!isOpen && (
          <a
            href={isHacking ? '/hacking' : '/'}
            className="md:hidden flex items-center ml-1 text-accent-500"
          >
            <img src={isHacking ? '/hacking/logo-light-styled.png' : '/logo-light-styled.png'} alt="logo" className="w-[110px] inline-block dark:hidden" />
            <img src={isHacking ? '/hacking/logo-dark-styled.png' : '/logo-dark-styled.png'} alt="logo" className="w-[110px] inline-block hidden dark:block" />
          </a>
        )}

        { }
        {!isOpen && (
          <button
            onClick={toggleSidebar}
            className="hidden md:flex items-center justify-center p-2 -ml-2 text-falbor-elements-textPrimary hover:bg-gray-200/60 dark:hover:bg-gray-800 rounded-md transition-colors mr-2"
            title="Open Sidebar"
          >
            <div className="i-ph:sidebar-simple w-5 h-5" />
          </button>
        )}
        {chat.started && (
          <div className="hidden md:flex items-center gap-2 z-logo text-falbor-elements-textPrimary">
            <a href={isHacking ? '/hacking' : '/'} className="text-2xl font-semibold text-accent-500 flex items-center">
              <img src={isHacking ? '/hacking/logo-light-styled.png' : '/logo-light-styled.png'} alt="logo" className="w-[130px] inline-block dark:hidden" />
              <img src={isHacking ? '/hacking/logo-dark-styled.png' : '/logo-dark-styled.png'} alt="logo" className="w-[130px] inline-block hidden dark:block" />
            </a>
          </div>
        )}

        <span className="flex-1" />
        {chat.started && (
          <>
            <span className="absolute left-1/2 -translate-x-1/2 max-w-[50%] truncate text-center text-falbor-elements-textPrimary hidden md:block">
              <ClientOnly>{() => <ChatDescription />}</ClientOnly>
            </span>
            <ClientOnly>
              {() => (
                <div className="flex items-center gap-2">
                  { }
                  <HeaderActionButtons chatStarted={chat.started} />
                </div>
              )}
            </ClientOnly>
          </>
        )}
        {!chat.started && (
          <ClientOnly>
            {() => (
              <div className="flex items-center gap-2">
                <AuthButtons />
                <UserAvatar
                  onOpenProfile={() => handleOpenPanel('profile')}
                  onOpenSettings={() => handleOpenPanel('settings')}
                />
              </div>
            )}
          </ClientOnly>
        )}
      </header>

    </>
  );
}