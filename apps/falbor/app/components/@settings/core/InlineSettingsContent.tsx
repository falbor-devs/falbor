'use client';

import { useStore } from '@nanostores/react';
import type { TabType } from './types';
import { settingsTabStore } from '~/lib/stores/settings';

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
import { classNames } from '~/utils/classNames';

export const InlineSettingsContent = () => {
  const activeTab = useStore(settingsTabStore);

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
      default: return null;
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-white dark:bg-gray-950 overflow-y-auto modern-scrollbar">
      <div className="flex-1 px-4 sm:px-6 md:px-8 py-6 w-full max-w-5xl mx-auto">
        {getTabComponent(activeTab)}
      </div>
    </div>
  );
};
