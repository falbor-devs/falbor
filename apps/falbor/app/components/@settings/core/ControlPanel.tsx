'use client';
import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { sidebarOpen } from '~/lib/stores/sidebar';
import type { TabType } from './types';
import { TAB_LABELS } from './constants';
import { AvatarDropdown } from './AvatarDropdown';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { useAuth } from '~/hooks/useAuth';

import ProfileTab from '~/components/@settings/tabs/profile/ProfileTab';
import MemoriesTab from '~/components/@settings/tabs/memories/MemoriesTab';
import PricingTab from '~/components/@settings/tabs/billing/PricingTab';
import BillingTab from '~/components/@settings/tabs/billing/BillingTab';
import SettingsTab from '~/components/@settings/tabs/settings/SettingsTab';
import NotificationsTab from '~/components/@settings/tabs/notifications/NotificationsTab';
import FeaturesTab from '~/components/@settings/tabs/features/FeaturesTab';
import { DataTab } from '~/components/@settings/tabs/data/DataTab';
import { EventLogsTab } from '~/components/@settings/tabs/event-logs/EventLogsTab';
import GitHubTab from '~/components/@settings/tabs/github/GitHubTab';
import GitLabTab from '~/components/@settings/tabs/gitlab/GitLabTab';
import SupabaseTab from '~/components/@settings/tabs/supabase/SupabaseTab';
import VercelTab from '~/components/@settings/tabs/vercel/VercelTab';
import NetlifyTab from '~/components/@settings/tabs/netlify/NetlifyTab';
import CloudProvidersTab from '~/components/@settings/tabs/providers/cloud/CloudProvidersTab';
import LocalProvidersTab from '~/components/@settings/tabs/providers/local/LocalProvidersTab';
import McpTab from '~/components/@settings/tabs/mcp/McpTab';
import SocialConnectionTab from '~/components/@settings/tabs/social/SocialConnectionTab';

interface ControlPanelProps {
  open: boolean;
  onClose: () => void;
  activeTab: TabType | null;
  inline?: boolean;
}

export const ControlPanel = ({ open, onClose, activeTab, inline = false }: ControlPanelProps) => {
  const { logout } = useAuth();
  const isSidebarOpen = useStore(sidebarOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleTabClick = async (tabId: TabType) => {
    if (tabId === 'logout') {
      await logout();
      window.location.href = "/";
      return;
    }
  };

  const getTabComponent = (tabId: TabType) => {
    switch (tabId) {
      case 'profile': return <ProfileTab />;
      case 'memories': return <MemoriesTab />;
      case 'pricing': return <PricingTab />;
      case 'billing': return <BillingTab />;
      case 'settings': return <SettingsTab />;
      case 'notifications': return <NotificationsTab />;
      case 'features': return <FeaturesTab />;
      case 'data': return <DataTab />;
      case 'cloud-providers': return <CloudProvidersTab />;
      case 'local-providers': return <LocalProvidersTab />;
      case 'github': return <GitHubTab />;
      case 'gitlab': return <GitLabTab />;
      case 'supabase': return <SupabaseTab />;
      case 'vercel': return <VercelTab />;
      case 'netlify': return <NetlifyTab />;
      case 'event-logs': return <EventLogsTab />;
      case 'mcp': return <McpTab />;
      case 'social-connection': return <SocialConnectionTab />;
      default: return null;
    }
  };

  if (!open) return null;

  if (inline) {
    return (
      <div className="flex flex-col h-full w-full overflow-hidden">
        <div className="h-12 flex items-center justify-between px-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {activeTab ? TAB_LABELS[activeTab] : 'Control Panel'}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="i-ph:x w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </h2>
          <div className="flex items-center gap-4">
            <AvatarDropdown onSelectTab={handleTabClick} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab && getTabComponent(activeTab)}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex z-30 modern-scrollbar pointer-events-auto">
      <div
        className="absolute inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      <div className="relative z-30 flex-1 flex">
        <div
          className={classNames(
            'w-full h-full',
            isSidebarOpen ? 'sm:pl-[260px]' : 'sm:pl-0',
            'transition-[padding] duration-200 ease-out',
            'flex flex-col overflow-hidden relative pointer-events-none'
          )}
        >
          <div className="flex-1 bg-falbor-elements-background-depth-1 flex flex-col relative overflow-hidden pointer-events-auto shadow-2xl">

            <div className="relative z-10 flex flex-col h-full">
              <div className="h-14 flex items-center justify-between px-4 gap-2 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50 relative">
                <div className="flex items-center">
                  <button
                    onClick={() => sidebarOpen.set(!isSidebarOpen)}
                    className="flex md:hidden items-center justify-center p-2 -ml-2 mr-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                  >
                    <div className="i-ph:list w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-xl font-semibold text-gray-900 dark:text-white absolute left-1/2 -translate-x-1/2">
                  {activeTab ? TAB_LABELS[activeTab] : 'Control Panel'}
                </h2>

                <div className="flex items-center gap-2 sm:gap-6">
                  <div className="pl-2 sm:pl-6">
                    <AvatarDropdown onSelectTab={handleTabClick} />
                  </div>

                  <button
                    onClick={onClose}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-purple-500/10 dark:hover:bg-purple-500/20 group transition-all duration-200"
                  >
                    <div className="i-ph:x w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-purple-500 transition-colors" />
                  </button>
                </div>
              </div>

              <div
                className={classNames(
                  'flex-1',
                  'overflow-y-auto',
                  'hover:overflow-y-auto',
                  'scrollbar scrollbar-w-2',
                  'scrollbar-track-transparent',
                  'scrollbar-thumb-[#E5E5E5] hover:scrollbar-thumb-[#CCCCCC]',
                  'dark:scrollbar-thumb-[#333333] dark:hover:scrollbar-thumb-[#444444]',
                  'will-change-scroll',
                  'touch-auto',
                )}
              >
                <div className="p-6 transition-opacity duration-150 opacity-100">
                  {activeTab && getTabComponent(activeTab)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};