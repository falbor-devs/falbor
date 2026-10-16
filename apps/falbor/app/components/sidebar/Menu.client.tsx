'use client';
import { motion, type Variants } from 'framer-motion';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { TAB_ICONS, TAB_LABELS, DEFAULT_TAB_CONFIG } from '~/components/@settings/core/constants';
import { tabConfigurationStore, resetTabConfiguration, settingsOpenStore, settingsTabStore, blinkPricingStore, chatSettingsOpenStore } from '~/lib/stores/settings';
import type { TabType } from '~/components/@settings/core/types';
import { SettingsButton } from '~/components/ui/SettingsButton';
import { Button } from '~/components/ui/Button';
import { db, deleteById, getAll, chatId, type ChatHistoryItem, useChatHistory } from '~/lib/persistence';
import { createWorkspace, getUserWorkspaces, updateWorkspaceName } from '~/lib/actions/workspaces';
import { WorkspaceSettingsModal } from '~/components/workspace/workspace-settings/WorkspaceSettingsModal';
import { cubicEasingFn } from '~/utils/easings';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import { classNames } from '~/utils/classNames';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import { ControlPanel } from '~/components/@settings';
import { useAuth } from '~/hooks/useAuth';
import { sidebarOpen, sidebarPinned } from '~/lib/stores/sidebar';
import { chatStore } from '~/lib/stores/chat';
import { DropdownSeparator, Dropdown, DropdownItem } from '../ui/Dropdown';
import { McpTools } from '../chat/tools/MCPTools';
import { MCP_CONNECTORS } from '../@settings/tabs/mcp/connectors';
import { useMCPStore } from '~/lib/stores/mcp';
import { Badge, Input, Tooltip } from '../ui';
import Link from 'next/link';
import { SkillsDialog } from '../skills/SkillsDialog';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { BILLING_CONFIG, type PlanId } from '~/lib/billing/config';

const squareMenuVariants = {
  closed: {
    width: '70px',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: '260px',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

const fullMenuVariants = {
  closed: {
    opacity: 0,
    visibility: 'hidden',
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    opacity: 1,
    visibility: 'initial',
    width: '260px',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

type DialogContent =
  | { type: 'delete'; item: ChatHistoryItem }
  | { type: 'bulkDelete'; items: ChatHistoryItem[] }
  | null;

function CurrentDateTime() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800/50">
      <div className="h-4 w-4 i-ph:clock opacity-80" />
      <div className="flex gap-2">
        <span>{dateTime.toLocaleDateString()}</span>
        <span>{dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

interface MenuProps {
  variant?: 'full' | 'square';
}

export const Menu = ({ variant = 'full' }: MenuProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isHacking = pathname?.startsWith('/hacking');
  const isSource = pathname?.startsWith('/sources');
  const isBaseRoute = ['/', '/login', '/register', '/welcome', '/org-setup', '/sources', '/hacking', '/chat', '/u', '/docs', '/workspace'].some(route =>
    pathname === route || pathname?.startsWith(`${route}/`)
  );
  const isOrgRoute = pathname && !isBaseRoute;
  const currentOrgId = isOrgRoute ? pathname.split('/')[1] : null;

  const basePath = isHacking ? '/hacking' : '/chat';
  const { duplicateCurrentChat, exportChat } = useChatHistory();
  const menuRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const open = useStore(sidebarOpen);
  const isPinned = useStore(sidebarPinned);
  const chat = useStore(chatStore);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const isSettingsOpen = useStore(settingsOpenStore);
  const activeSettingsTab = useStore(settingsTabStore);
  const blinkPricing = useStore(blinkPricingStore);
  const profile = useStore(profileStore) as any;
  const isAgentSidebarOpen = useStore(aiSidebarStore.isOpen);

  const tabConfiguration = useStore(tabConfigurationStore);
  const baseTabConfig = useMemo(() => {
    return new Map(DEFAULT_TAB_CONFIG.map((tab) => [tab.id, tab]));
  }, []);

  const visibleTabs = useMemo(() => {
    if (!tabConfiguration?.userTabs || !Array.isArray(tabConfiguration.userTabs)) {
      resetTabConfiguration();
      return [];
    }

    const notificationsDisabled = profile?.preferences?.notifications === false;

    return tabConfiguration.userTabs
      .filter((tab) => {
        if (!tab?.id) return false;
        if (tab.id === 'notifications' && notificationsDisabled) return false;
        return tab.visible && tab.window === 'user';
      })
      .sort((a, b) => a.order - b.order);
  }, [tabConfiguration, profile?.preferences?.notifications, baseTabConfig]);
  const { user } = useAuth();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [agentSessions, setAgentSessions] = useState<Array<{ id: string; title: string }>>([]);
  const [workspacesList, setWorkspacesList] = useState<Array<{ id: string; name: string }>>([]);
  const [unreadMentionsCount, setUnreadMentionsCount] = useState(0);

  useEffect(() => {
    const activeWsId = pathname?.split('/')[2];
    if (!activeWsId) return;

    const checkUnread = () => {
      fetch(`/api/agent/mentions?workspaceId=${activeWsId}`)
        .then(r => r.json())
        .then(data => {
          if (data.posts && Array.isArray(data.posts)) {
            const lastReadStr = localStorage.getItem(`mentions_last_read_${activeWsId}`);
            const lastRead = lastReadStr ? new Date(lastReadStr).getTime() : 0;
            const unread = data.posts.filter((p: any) => new Date(p.createdAt || Date.now()).getTime() > lastRead).length;
            setUnreadMentionsCount(unread);
          }
        })
        .catch(() => { });
    };

    checkUnread();
    window.addEventListener('mentions_read_updated', checkUnread);
    return () => window.removeEventListener('mentions_read_updated', checkUnread);
  }, [pathname]);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  const [workspaceSettingsTab, setWorkspaceSettingsTab] = useState<string>('knowledge');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [workspaceToRename, setWorkspaceToRename] = useState<{ id: string; name: string } | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [userTier, setUserTier] = useState<string>('free');

  useEffect(() => {
    fetch('/api/user/credits')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.subscriptionTier) {
          setUserTier(d.subscriptionTier.toLowerCase());
        }
      })
      .catch(() => { });
  }, [pathname]);

  const loadWorkspaces = useCallback(() => {
    getUserWorkspaces()
      .then((data) => {
        setWorkspacesList(data.map((w) => ({ id: w.id, name: w.name || 'Untitled Workspace' })));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces, pathname]);

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceToRename || !renameInputValue.trim()) return;
    setIsRenaming(true);
    try {
      await updateWorkspaceName(workspaceToRename.id, renameInputValue.trim());
      toast.success('Workspace renamed');
      setIsRenameDialogOpen(false);
      setWorkspaceToRename(null);
      loadWorkspaces();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to rename workspace');
    } finally {
      setIsRenaming(false);
    }
  };

  const [isProductsOpen, setIsProductsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('falbor_menu_products_open') === 'true';
  });

  const [isAgentSeasonOpen, setIsAgentSeasonOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('falbor_menu_agent_season_open') === 'true';
  });

  const [isAdsOpen, setIsAdsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('falbor_menu_ads_open') === 'true';
  });

  const [isSourcesOpen, setIsSourcesOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('falbor_menu_sources_open') === 'true';
  });

  const [isContactsOpen, setIsContactsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('falbor_menu_contacts_open') === 'true';
  });

  const [isCommunityOpen, setIsCommunityOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('falbor_menu_community_open') === 'true';
  });

  const toggleCommunityOpen = () => {
    setIsCommunityOpen((prev) => {
      const next = !prev;
      localStorage.setItem('falbor_menu_community_open', String(next));
      return next;
    });
  };

  const [isGamesOpen, setIsGamesOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('falbor_menu_games_open') === 'true';
  });

  const toggleGamesOpen = () => {
    setIsGamesOpen((prev) => {
      const next = !prev;
      localStorage.setItem('falbor_menu_games_open', String(next));
      return next;
    });
  };

  const toggleProductsOpen = () => {
    setIsProductsOpen((prev) => {
      const next = !prev;
      localStorage.setItem('falbor_menu_products_open', String(next));
      return next;
    });
  };

  const toggleAdsOpen = () => {
    setIsAdsOpen((prev) => {
      const next = !prev;
      localStorage.setItem('falbor_menu_ads_open', String(next));
      return next;
    });
  };

  const toggleSourcesOpen = () => {
    setIsSourcesOpen((prev) => {
      const next = !prev;
      localStorage.setItem('falbor_menu_sources_open', String(next));
      return next;
    });
  };

  const toggleContactsOpen = () => {
    setIsContactsOpen((prev) => {
      const next = !prev;
      localStorage.setItem('falbor_menu_contacts_open', String(next));
      return next;
    });
  };

  const toggleAgentSeasonOpen = () => {
    setIsAgentSeasonOpen((prev) => {
      const next = !prev;
      localStorage.setItem('falbor_menu_agent_season_open', String(next));
      return next;
    });
  };

  const activeWsId = pathname?.split('/')[2];

  useEffect(() => {
    if (activeWsId) {
      import('~/lib/actions/agentSession').then(({ getAgentSessionsList }) => {
        getAgentSessionsList(activeWsId).then(setAgentSessions).catch(console.error);
      });
    }
  }, [activeWsId, pathname]);

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setIsCreating(true);
    try {
      const workspaceId = await createWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setIsCreatingWorkspace(false);
      loadWorkspaces();
      router.push(`/workspace/${workspaceId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const loadEntries = useCallback(() => {
    if (db) {
      getAll(db)
        .then(setList)
        .catch((error) => toast.error(error.message));
    }
  }, []);

  const { filteredItems, handleSearchChange } = useSearchFilter({
    items: list,
    searchFields: ['description'],
  });

  const filteredList = filteredItems;

  const deleteChat = useCallback(
    async (id: string): Promise<void> => {
      if (!db) {
        throw new Error('Database not available');
      }

      try {
        const snapshotKey = `snapshot:${id}`;
        localStorage.removeItem(snapshotKey);
        console.log('Removed snapshot for chat:', id);
      } catch (snapshotError) {
        console.error(`Error deleting snapshot for chat ${id}:`, snapshotError);
      }

      await deleteById(db, id);
      console.log('Successfully deleted chat:', id);
    },
    [db],
  );

  const deleteItem = useCallback(
    (event: React.UIEvent, item: ChatHistoryItem) => {
      event.preventDefault();
      event.stopPropagation();

      console.log('Attempting to delete chat:', { id: item.id, description: item.description });

      deleteChat(item.id)
        .then(() => {
          toast.success('Chat deleted successfully', {
            position: 'bottom-right',
            autoClose: 3000,
          });

          loadEntries();

          if (chatId.get() === item.id) {
            console.log('Navigating away from deleted chat');
            window.location.pathname = isHacking ? '/hacking' : '/';
          }
        })
        .catch((error) => {
          console.error('Failed to delete chat:', error);
          toast.error('Failed to delete conversation', {
            position: 'bottom-right',
            autoClose: 3000,
          });

          loadEntries();
        });
    },
    [loadEntries, deleteChat],
  );

  const deleteSelectedItems = useCallback(
    async (itemsToDeleteIds: string[]) => {
      if (!db || itemsToDeleteIds.length === 0) {
        console.log('Bulk delete skipped: No DB or no items to delete.');
        return;
      }

      console.log(`Starting bulk delete for ${itemsToDeleteIds.length} chats`, itemsToDeleteIds);

      let deletedCount = 0;
      const errors: string[] = [];
      const currentChatId = chatId.get();
      let shouldNavigate = false;

      for (const id of itemsToDeleteIds) {
        try {
          await deleteChat(id);
          deletedCount++;

          if (id === currentChatId) {
            shouldNavigate = true;
          }
        } catch (error) {
          console.error(`Error deleting chat ${id}:`, error);
          errors.push(id);
        }
      }

      if (errors.length === 0) {
        toast.success(`${deletedCount} chat${deletedCount === 1 ? '' : 's'} deleted successfully`);
      } else {
        toast.warning(`Deleted ${deletedCount} of ${itemsToDeleteIds.length} chats. ${errors.length} failed.`, {
          autoClose: 5000,
        });
      }

      await loadEntries();

      setSelectedItems([]);
      setSelectionMode(false);

      if (shouldNavigate) {
        console.log('Navigating away from deleted chat');
        window.location.pathname = isHacking ? '/hacking' : '/';
      }
    },
    [deleteChat, loadEntries, db],
  );

  const closeDialog = () => {
    setDialogContent(null);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);

    if (selectionMode) {
      setSelectedItems([]);
    }
  };

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const newSelectedItems = prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id];
      console.log('Selected items updated:', newSelectedItems);
      return newSelectedItems;
    });
  }, []);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedItems.length === 0) {
      toast.info('Select at least one chat to delete');
      return;
    }

    const selectedChats = list.filter((item) => selectedItems.includes(item.id));

    if (selectedChats.length === 0) {
      toast.error('Could not find selected chats');
      return;
    }

    setDialogContent({ type: 'bulkDelete', items: selectedChats });
  }, [selectedItems, list]);

  const selectAll = useCallback(() => {
    const allFilteredIds = filteredList.map((item) => item.id);
    setSelectedItems((prev) => {
      const allFilteredAreSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => prev.includes(id));

      if (allFilteredAreSelected) {
        const newSelectedItems = prev.filter((id) => !allFilteredIds.includes(id));
        console.log('Deselecting all filtered items. New selection:', newSelectedItems);
        return newSelectedItems;
      } else {
        const newSelectedItems = [...new Set([...prev, ...allFilteredIds])];
        console.log('Selecting all filtered items. New selection:', newSelectedItems);
        return newSelectedItems;
      }
    });
  }, [filteredList]);

  useEffect(() => {
    if (open) {
      loadEntries();
    }
  }, [open, loadEntries]);


  useEffect(() => {
    if (searchParams) {
      const tab = searchParams.get('tab');
      if (tab) {
        settingsOpenStore.set(true);
        sidebarOpen.set(true);
        settingsTabStore.set(tab as TabType);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!open && selectionMode) {
      console.log('Sidebar closed, preserving selection state');
    }
  }, [open, selectionMode]);

  const prevVariant = useRef<string | null>(null);

  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const isWorkspaceRoute = pathname?.includes('/workspace/');

    if (variant === 'square' && prevVariant.current !== 'square') {
      if (isMobile) {
        sidebarOpen.set(false);
      } else {
        sidebarOpen.set(true);
      }
    } else if (variant !== 'square') {
      if (isMobile) {
        sidebarOpen.set(false);
      } else if (isWorkspaceRoute) {
        sidebarOpen.set(true);
      } else if (!chat.started && isPinned) {
        sidebarOpen.set(true);
      } else {
        sidebarOpen.set(false);
      }
    }
    prevVariant.current = variant;
  }, [chat.started, isPinned, variant, pathname]);

  useEffect(() => {


  }, []);

  const handleDuplicate = async (id: string) => {
    await duplicateCurrentChat(id);
    loadEntries();
  };

  const handleSettingsClick = () => {
    settingsOpenStore.set(true);
    if (window.innerWidth < 768) {
      sidebarOpen.set(false);
    } else {
      sidebarOpen.set(true);
    }
  };

  const handleSettingsClose = () => {
    settingsOpenStore.set(false);


    if (typeof window !== 'undefined') {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('tab');
      window.history.replaceState({}, '', newUrl.toString());
    }
  };

  const setDialogContentWithLogging = useCallback((content: DialogContent) => {
    console.log('Setting dialog content:', content);
    setDialogContent(content);
  }, []);
  const [connections, setConnections] = React.useState<any[]>([]);
  const selectedMCPs = useMCPStore((state) => state.selectedMCPs);
  const toggleSelectedMCP = useMCPStore((state) => state.toggleSelectedMCP);
  React.useEffect(() => {
    fetch('/api/mcp/connections', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.connections)) {
          setConnections(data.connections);
        } else if (Array.isArray(data)) {
          setConnections(data);
        } else {
          setConnections([]);
        }
      })
      .catch((err) => console.error('Error fetching connections', err));
  }, []);

  return (
    <>
      {!open && (
        <button
          onClick={() => sidebarOpen.set(true)}
          className="fixed top-5 left-5 z-[99] p-2 bg-white dark:bg-[#1C1D21] text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-800 rounded-md shadow-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Open Sidebar"
        >
          <div className="i-ph:sidebar-simple w-4 h-4" />
        </button>
      )}
      {open && variant === 'square' && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => sidebarOpen.set(false)}
        />
      )}
      {open && variant === 'full' && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => sidebarOpen.set(false)}
        />
      )}
      <motion.div
        ref={menuRef}
        initial={false}
        animate={open ? 'open' : 'closed'}
        variants={variant === 'square' ? squareMenuVariants : fullMenuVariants}
        style={variant === 'full' ? {} : {}}
        className={classNames(
          variant === 'square'
            ? classNames(
              'flex selection-accent flex-col side-menu h-full overflow-hidden shrink-0 border-none text-sm',
              'absolute md:relative left-0 top-0 bottom-0 bg-[#f7f7f8] dark:bg-[#1A1A1A] md:bg-transparent shadow-xl md:shadow-none z-50 md:z-sidebar',
              !open && 'max-md:!w-0 max-md:!opacity-0 max-md:!p-0 pointer-events-none md:pointer-events-auto'
            )
            : classNames(
              'flex selection-accent flex-col side-menu shrink-0 h-full bg-[#f7f7f8] dark:bg-[#1A1A1A] text-sm',

              'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:shadow-xl',
              !open && 'max-md:!w-0 max-md:!opacity-0 max-md:overflow-hidden max-md:pointer-events-none',

              'md:relative'
            ),
          variant === 'full' && isSettingsOpen ? 'z-40' : (variant === 'full' ? 'z-sidebar max-md:z-50' : '')
        )}
      >
        {variant === 'square' ? (
          <div className={classNames(
            "h-12 flex items-center px-3 gap-2 bg-transparent transition-all",
            open ? "justify-between" : "justify-center"
          )}>
            {open && (
              <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                <a href={isHacking ? "/hacking" : "/"} className="text-xl font-semibold text-accent-500 flex items-center" onClick={(e) => e.stopPropagation()}>
                  <img src={isHacking ? "/hacking/logo-light-styled.png" : "/hacking/logo-light-styled.png"} alt="logo" className="w-[110px] inline-block dark:hidden" />
                  <img src={isHacking ? "/hacking/logo-dark-styled.png" : "/hacking/logo-dark-styled.png"} alt="logo" className="w-[110px] inline-block hidden dark:block" />
                </a>
              </div>
            )}
            <div className="flex items-center gap-1">
              {open && (
                <>
                  <ThemeSwitch />
                  <SettingsButton onClick={handleSettingsClick} />
                </>
              )}
              <button
                onClick={() => sidebarOpen.set(!open)}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors"
                title="Toggle Sidebar"
              >
                <div className="i-ph:sidebar w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-12 min-h-[48px] flex items-center justify-between px-3 gap-2 bg-transparent">
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <a href={isHacking ? "/hacking" : "/"} className="text-xl font-semibold text-accent-500 flex items-center" onClick={(e) => e.stopPropagation()}>
                <img src={isHacking ? "/hacking/logo-light-styled.png" : "/hacking/logo-light-styled.png"} alt="logo" className="w-[110px] inline-block dark:hidden" />
                <img src={isHacking ? "/hacking/logo-dark-styled.png" : "/hacking/logo-dark-styled.png"} alt="logo" className="w-[110px] inline-block hidden dark:block" />
              </a>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => sidebarOpen.set(!open)}
                className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800 transition-colors"
                title="Toggle Sidebar"
              >
                <div className="i-ph:sidebar-simple w-4 h-4" />
              </button>
              <ThemeSwitch />
              <SettingsButton onClick={handleSettingsClick} />
            </div>
          </div>
        )}
        <div className={classNames("flex-1 flex flex-col h-full w-full overflow-hidden", variant === 'square' ? "transition-opacity duration-200" : "", variant === 'square' && !open ? "opacity-0 pointer-events-none" : "opacity-100")}>
          {isSettingsOpen ? (
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 modern-scrollbar">
              <div className="flex items-center justify-between mb-3 px-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Settings
                </div>
                <button
                  onClick={handleSettingsClose}
                  className="text-xs font-medium text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary flex items-center gap-1 transition-colors"
                >
                  <div className="i-ph:arrow-left w-3 h-3" />
                  Back to Chats
                </button>
              </div>
              {visibleTabs.map((tab) => {
                const Icon = TAB_ICONS[tab.id as TabType];
                const isSelected = activeSettingsTab === tab.id;
                const isBlinking = tab.id === 'pricing' && blinkPricing;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      settingsTabStore.set(tab.id as TabType);

                      const newUrl = new URL(window.location.href);
                      newUrl.searchParams.set('tab', tab.id);
                      window.history.pushState({}, '', newUrl.toString());
                    }}
                    className={classNames(
                      'flex items-center gap-3 w-full px-3 py-1.5 rounded-md text-xs font-medium text-left transition-all relative',
                      isSelected
                        ? 'bg-gray-200/80 dark:bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary font-semibold'
                        : 'text-falbor-elements-textSecondary hover:bg-gray-200/50 dark:hover:bg-falbor-elements-background-depth-3 hover:text-falbor-elements-textPrimary',
                      isBlinking ? 'animate-pulse bg-blue-500/20 text-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''
                    )}
                  >
                    {Icon && <Icon className={classNames("w-4 h-4", isBlinking ? "text-blue-500" : "")} />}
                    <span>{TAB_LABELS[tab.id as TabType]}</span>
                    {tab.id === 'social-connection' && (
                      <span className="ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 dark:bg-purple-400/20 dark:text-purple-300">
                        New
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
              {chat.started && (
                <div className="px-3 py-1">
                  <button
                    onClick={() => chatSettingsOpenStore.set(true)}
                    className="flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-900 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs text-gray-900 dark:text-gray-100"
                  >
                    <div className="i-ph:gear text-base text-falbor-elements-textSecondary mr-2" />
                    <span>Chat Settings</span>
                  </button>
                </div>
              )}
              {isOrgRoute ? (
                <div className="hidden md:block">
                  <div className="flex items-center justify-between text-xs px-3 py-1.5">
                    <div className="ml-1 text-gray-600 dark:text-gray-400 font-medium text-xs">Organization Settings</div>
                  </div>
                  <div className="flex-1 overflow-auto px-2 pb-2 space-y-0.5">
                    {[
                      { name: 'Overview', icon: 'i-ph:squares-four', path: `/${currentOrgId}` },
                      { name: 'Issues', icon: 'i-ph:warning-circle', path: `/${currentOrgId}/issues` },
                      { name: 'Projects', icon: 'i-ph:folder-simple', path: `/${currentOrgId}/projects` },
                      { name: 'Settings', icon: 'i-ph:gear', path: `/${currentOrgId}/settings` },
                    ].map((item) => {
                      const isActive = pathname === item.path;
                      return (
                        <Link key={item.name} href={item.path} className='relative w-full block'>
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-50">
                            <div className={classNames(
                              `${item.icon} w-3.5 h-3.5 mr-2 transition-colors`,
                              isActive ? "text-purple-500" : "dark:text-white text-gray-700"
                            )} />
                          </div>
                          <button
                            className={classNames(
                              "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-900 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs mt-0.5",
                              isActive ? "bg-[#EBEBEB] dark:bg-gray-900 text-purple-600 dark:text-purple-400 font-medium" : "text-gray-900 dark:text-gray-100"
                            )}
                          >
                            <div className="w-3.5 h-3.5 mr-2 opacity-0" />
                            {item.name}
                          </button>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs px-3 py-1">
                    <div className="font-semibold text-gray-500 dark:text-gray-400 text-xs tracking-wide">Workspace</div>
                  </div>
                  <div className="px-2 pb-1 space-y-1">
                    <Dropdown
                      align="start"
                      side="bottom"
                      sideOffset={4}
                      trigger={
                        <button className="flex items-center justify-between w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-900 px-2.5 py-1.5 rounded-md focus:outline-none text-xs text-gray-900 dark:text-gray-100 font-medium transition-colors border border-gray-200/50 dark:border-gray-800/50">
                          <div className="flex items-center gap-2 truncate">
                            <div className="i-ph:folder w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">My Workspace</span>
                          </div>
                          <div className="i-ph:caret-down w-3 h-3 text-gray-400 shrink-0 ml-1" />
                        </button>
                      }
                      className="w-64 p-1"
                    >
                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {workspacesList.length === 0 ? (
                          <div className="px-2 py-1 text-xs text-gray-400 italic">No workspaces found</div>
                        ) : (
                          workspacesList.map((ws) => {
                            const isCurrent = activeWsId === ws.id;
                            return (
                              <DropdownItem
                                key={ws.id}
                                onSelect={() => router.push(`/workspace/${ws.id}`)}
                                className={classNames(
                                  'flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer',
                                  isCurrent && 'bg-[#0099ff]/20 text-gray-900 font-medium'
                                )}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div className="i-ph:folder w-3.5 h-3.5 text-gray-900 shrink-0" />
                                  <span className="truncate">{ws.name}</span>
                                </div>
                                {isCurrent && <div className="i-ph:check w-3.5 h-3.5 text-purple-500 shrink-0" />}
                              </DropdownItem>
                            );
                          })
                        )}
                      </div>
                      {activeWsId && (
                        <>
                          <DropdownItem
                            onSelect={() => {
                              const currentWs = workspacesList.find(w => w.id === activeWsId);
                              setWorkspaceToRename(currentWs || { id: activeWsId, name: '' });
                              setRenameInputValue(currentWs?.name || '');
                              setIsRenameDialogOpen(true);
                            }}
                            className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer font-medium"
                          >
                            <div className="i-ph:pencil w-3.5 h-3.5 text-gray-500" />
                            <span>Rename Workspace</span>
                          </DropdownItem>
                          <DropdownItem
                            onSelect={() => {
                              setWorkspaceSettingsTab('knowledge');
                              setIsWorkspaceSettingsOpen(true);
                            }}
                            className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer font-medium"
                          >
                            <div className="i-ph:gear w-3.5 h-3.5 text-gray-500" />
                            <span>Workspace Settings</span>
                          </DropdownItem>
                          {(() => {
                            const userTier = (profile?.subscriptionTier || 'free').toLowerCase();
                            const isPowerOrBusiness = userTier === 'power' || userTier === 'business';
                            return (
                              <DropdownItem
                                onSelect={() => {
                                  if (isPowerOrBusiness) {
                                    setWorkspaceSettingsTab('members');
                                    setIsWorkspaceSettingsOpen(true);
                                  } else {
                                    const activeWsId = pathname?.split('/')[2];
                                    if (activeWsId) {
                                      router.push(`/workspace/${activeWsId}/upgrade?highlight=power_business`);
                                    } else {
                                      router.push('/upgrade?highlight=power_business');
                                    }
                                  }
                                }}
                                className="flex items-center justify-between px-2 py-1.5 text-xs text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer font-medium"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="i-ph:user-plus w-3.5 h-3.5 text-blue-500" />
                                  <span>Invite Members</span>
                                </div>
                                {!isPowerOrBusiness && (
                                  <Badge className="bg-[#0099ff]/20 rounded-md text-[#0099ff] text-[10px] px-1.5 py-0.5 ml-2">
                                    Power+
                                  </Badge>
                                )}
                              </DropdownItem>
                            );
                          })()}
                          <DropdownSeparator />
                        </>
                      )}
                      {(() => {
                        const tier = (userTier || profile?.subscriptionTier || 'free').toLowerCase() as PlanId;
                        const planConfig = BILLING_CONFIG.plans[tier] || BILLING_CONFIG.plans.free;
                        const maxAllowed = planConfig.maxWorkspaces;
                        const currentWsCount = workspacesList.length;
                        const isLimitReached = currentWsCount >= maxAllowed;

                        const tooltipText = isLimitReached
                          ? userTier === 'free'
                            ? 'Paid subscription required to create more than one workspace.'
                            : `You have reached your limit of ${maxAllowed} workspaces on the ${planConfig.name} plan.`
                          : undefined;

                        return (
                          <DropdownItem
                            onSelect={() => {
                              if (isLimitReached) {
                                toast.info(tooltipText || 'Paid subscription required to create more than 1 workspace.');
                                const activeWsId = pathname?.split('/')[2];
                                if (activeWsId) {
                                  router.push(`/workspace/${activeWsId}/upgrade`);
                                } else {
                                  router.push('/upgrade');
                                }
                                return;
                              }
                              setNewWorkspaceName('');
                              setIsCreatingWorkspace(true);
                            }}
                            className={classNames(
                              "flex items-center justify-between px-2 py-1.5 text-xs rounded-md font-medium transition-colors",
                              isLimitReached
                                ? "text-gray-400 dark:text-gray-500 cursor-not-allowed hover:bg-transparent"
                                : "text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="i-ph:plus w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Add New Workspace</span>
                            </div>
                            {isLimitReached && (
                              <Tooltip content={tooltipText}>
                                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0.5 ml-2 font-semibold shrink-0">
                                  {userTier === 'free' ? 'Upgrade Required' : 'Limit Reached'}
                                </Badge>
                              </Tooltip>
                            )}
                          </DropdownItem>
                        );
                      })()}
                    </Dropdown>
                  </div>
                  <div className="px-2 pb-1">
                    <div className="relative w-full block">
                      {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const href = activeWsId ? `/workspace/${activeWsId}` : '/';
                        const isHomeActive = pathname === href;
                        return (
                          <Link href={href}>
                            <button className={classNames(
                              "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors",
                              isHomeActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                            )}>
                              <div className="i-ph:house w-4 h-4 mr-2" />
                              Overview
                            </button>
                          </Link>
                        );
                      })()}
                      {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const sourcesHref = activeWsId ? `/workspace/${activeWsId}/sources` : '/sources';
                        const channelsHref = sourcesHref;
                        const competitorsHref = activeWsId ? `/workspace/${activeWsId}/competitors` : '/competitors';
                        const signalsHref = activeWsId ? `/workspace/${activeWsId}/signal-radar` : '/signal-radar';
                        const mentionsHref = activeWsId ? `/workspace/${activeWsId}/mentions` : '/mentions';
                        const isChannelsActive = pathname?.includes('/sources');
                        const isCompetitorsActive = pathname?.includes('/competitors');
                        const isRadarActive = pathname?.includes('/signal-radar');
                        const isMentionsActive = pathname?.includes('/mentions');
                        const isSourcesSectionActive = isChannelsActive || isCompetitorsActive || isRadarActive || isMentionsActive;

                        return (
                          <div className="mt-1">
                            <button
                              onClick={toggleSourcesOpen}
                              className={classNames(
                                "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors",
                                isSourcesSectionActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                              )}
                            >
                              <div className={classNames(
                                "w-4 h-4 mr-2 transition-transform duration-200 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400",
                                isSourcesOpen ? "i-ph:caret-down" : "i-ph:caret-right"
                              )} />
                              Sources
                            </button>
                            {isSourcesOpen && (
                              <div className="ml-4 pl-3 border-l border-gray-300 dark:border-gray-700 mt-1 space-y-1">
                                <Link href={channelsHref}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isChannelsActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:hash w-3.5 h-3.5 mr-2" />
                                    Channels
                                  </button>
                                </Link>
                                <Link href={signalsHref}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isRadarActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:broadcast w-3.5 h-3.5 mr-2" />
                                    Signals
                                  </button>
                                </Link>
                                <Link href={mentionsHref}>
                                  <button className={classNames(
                                    "flex items-center justify-between w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isMentionsActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="flex items-center">
                                      <div className="i-ph:at w-3.5 h-3.5 mr-2" />
                                      Mentions
                                    </div>
                                    {unreadMentionsCount > 0 && !isMentionsActive && (
                                      <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {unreadMentionsCount}
                                      </span>
                                    )}
                                  </button>
                                </Link>
                                <Link href={competitorsHref}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isCompetitorsActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:sword w-3.5 h-3.5 mr-2" />
                                    Competitors
                                  </button>
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const href = activeWsId ? `/workspace/${activeWsId}/ai-aeo` : '/ai-aeo';
                        const isAiAeoActive = pathname?.includes('/ai-aeo');
                        return (
                          <Link href={href}>
                            <button className={classNames(
                              "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors mt-1",
                              isAiAeoActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                            )}>
                              <div className="i-ph:robot w-4 h-4 mr-2" />
                              AEO
                            </button>
                          </Link>
                        );
                      })()}
                      {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const href = activeWsId ? `/workspace/${activeWsId}/canvas` : '/canvas';
                        const isCanvasActive = pathname === href;
                        return (
                          <Link href={href}>
                            <button className={classNames(
                              "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors mt-1",
                              isCanvasActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                            )}>
                              <div className="i-ph:brain w-4 h-4 mr-2" />
                              Knowledge
                            </button>
                          </Link>
                        );
                      })()}
                      {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const aiProspectsHref = activeWsId ? `/workspace/${activeWsId}/agent-contact` : '/agent-contact';
                        const myProspectsHref = activeWsId ? `/workspace/${activeWsId}/my-prospects` : '/my-prospects';
                        const isAiProspectsActive = pathname?.includes('/agent-contact');
                        const isMyProspectsActive = pathname?.includes('/my-prospects');
                        return (
                          <div className="mt-1">
                            <button
                              onClick={toggleContactsOpen}
                              className="flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors text-gray-900 dark:text-gray-100"
                            >
                              <div className={classNames(
                                "w-4 h-4 mr-2 transition-transform duration-200 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400",
                                isContactsOpen ? "i-ph:caret-down" : "i-ph:caret-right"
                              )} />
                              Contacts
                            </button>
                            {isContactsOpen && (
                              <div className="ml-4 pl-3 border-l border-gray-300 dark:border-gray-700 mt-1 space-y-1">
                                <Link href={aiProspectsHref}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isAiProspectsActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:sparkle w-3.5 h-3.5 mr-2" />
                                    Discovery
                                  </button>
                                </Link>
                                <Link href={myProspectsHref}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isMyProspectsActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:users-three w-3.5 h-3.5 mr-2" />
                                    Leads
                                  </button>
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const href = activeWsId ? `/workspace/${activeWsId}/vibe` : '/';
                        const isVibeActive = pathname === href;
                        return (
                          <Link href={href}>
                            <button className={classNames(
                              "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors mt-1",
                              isVibeActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                            )}>
                              <div className="i-ph:music-notes w-4 h-4 mr-2" />
                              Studio
                            </button>
                          </Link>
                        );
                      })()}
                      {/* {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const isBusinessSubscriber = userTier === 'business';
                        const href = activeWsId ? `/workspace/${activeWsId}/milestone` : '/milestone';
                        const upgradeHref = activeWsId ? `/workspace/${activeWsId}/upgrade?highlight=business` : '/upgrade?highlight=business';
                        const isMilestoneActive = pathname?.includes('/milestone');

                        if (!isBusinessSubscriber) {
                          return (
                            <Link href={upgradeHref}>
                              <button className="flex items-center justify-between w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none text-sm font-medium transition-colors mt-1 border border-[#0099ff]/70 opacity-90">
                                <div className="flex items-center text-gray-900 dark:text-gray-100">
                                  <div className="i-ph:trophy w-4 h-4 mr-2" />
                                  <span>Milestone</span>
                                </div>
                                <Badge className="bg-[#0099ff]/20 text-[#0099ff] text-[10px] px-1.5 py-0.5 rounded-md font-semibold border border-[#0099ff]/30">
                                  Business
                                </Badge>
                              </button>
                            </Link>
                          );
                        }

                        return (
                          <Link href={href}>
                            <button className={classNames(
                              "flex items-center justify-between w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors mt-1 border border-[#0099ff]/70 shadow-sm",
                              isMilestoneActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                            )}>
                              <div className="flex items-center">
                                <div className="i-ph:trophy w-4 h-4 mr-2" />
                                <span>Milestone</span>
                              </div>
                              <Badge className="bg-[#0099ff]/20 text-[#0099ff] text-[10px] px-1.5 py-0.5 rounded-md font-semibold">
                                Active
                              </Badge>
                            </button>
                          </Link>
                        );
                      })()} */}
                      {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const href = activeWsId ? `/workspace/${activeWsId}/agent` : '/';
                        const isAgentActive = pathname === href;
                        return (
                          <Link href={href}>
                            <button className={classNames(
                              "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors mt-1",
                              isAgentActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                            )}>
                              <div className="i-ph:sparkle-fill w-4 h-4 mr-2 text-blue-500" />
                              Agents
                            </button>
                          </Link>
                        );
                      })()}
                      {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const budgetHref = activeWsId ? `/workspace/${activeWsId}/budget` : '/';
                        const adsMarketingHref = activeWsId ? `/workspace/${activeWsId}/ads-marketing` : '/';
                        const isBudgetActive = pathname?.includes('/budget');
                        const isAdsMarketingActive = pathname?.includes('/ads-marketing');
                        return (
                          <div className="mt-1">
                            <button
                              onClick={toggleAdsOpen}
                              className="flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors text-gray-900 dark:text-gray-100"
                            >
                              <div className={classNames(
                                "w-4 h-4 mr-2 transition-transform duration-200 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400",
                                isAdsOpen ? "i-ph:caret-down" : "i-ph:caret-right"
                              )} />
                              Marketing
                            </button>
                            {isAdsOpen && (
                              <div className="ml-4 pl-3 border-l border-gray-300 dark:border-gray-700 mt-1 space-y-1">
                                <Link href={budgetHref}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isBudgetActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:currency-circle-dollar w-3.5 h-3.5 mr-2" />
                                    Budget
                                  </button>
                                </Link>
                                <Link href={adsMarketingHref}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isAdsMarketingActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:chart-line-up w-3.5 h-3.5 mr-2" />
                                    Campaigns
                                  </button>
                                </Link>
                                <Link href={activeWsId ? `/workspace/${activeWsId}/blog-content` : '/'}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    pathname?.includes('/blog-content') ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:article-duotone w-3.5 h-3.5 mr-2" />
                                    Content
                                  </button>
                                </Link>
                                <Link href={activeWsId ? `/workspace/${activeWsId}/product-deck` : '/'}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    pathname?.includes('/product-deck') ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:presentation-chart-duotone w-3.5 h-3.5 mr-2" />
                                    Pitch <Badge className='bg-[#0099ff]/20 text-[#0099ff] ml-1 rounded-md'>Beta</Badge>
                                  </button>
                                </Link>
                                {/* <Link href={activeWsId ? `/workspace/${activeWsId}/google-ads` : '/'}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    pathname?.includes('/google-ads') ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )} disabled>
                                    <img src="/icons/google.svg" alt="" className='w-3.5 h-3.5 mr-2' />
                                    Google Ads <Badge>Coming Soon</Badge>
                                  </button>
                                </Link> */}
                                <Link href={activeWsId ? `/workspace/${activeWsId}/meta-ads` : '/'}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    pathname?.includes('/meta-ads') ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <img src="/icons/meta.svg" alt="" className='w-4 h-3.5 mr-2' />
                                    Meta Ads
                                  </button>
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {/* {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const href = activeWsId ? `/workspace/${activeWsId}/product` : '/workspace';
                        const isProductsActive = pathname?.includes('/product');
                        return (
                          <div className="mt-1">
                            <button
                              onClick={toggleProductsOpen}
                              className="flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors text-gray-900 dark:text-gray-100"
                            >
                              <div className={classNames(
                                "w-4 h-4 mr-2 transition-transform duration-200 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400",
                                isProductsOpen ? "i-ph:caret-down" : "i-ph:caret-right"
                              )} />
                              <div className="i-ph:cube w-4 h-4 mr-2" />
                              Products
                            </button>
                            {isProductsOpen && (
                              <div className="ml-4 pl-3 border-l border-gray-300 dark:border-gray-700 mt-1 space-y-1">
                                <Link href={href}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isProductsActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:trend-up w-3.5 h-3.5 mr-2" />
                                    Trends
                                  </button>
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const messagesHref = activeWsId ? `/workspace/${activeWsId}/community/messages` : '/community/messages';
                        const isMarketersActive = pathname === '/marketers';
                        const isMessagesActive = pathname?.includes('/community/messages');
                        return (
                          <div className="mt-1">
                            <button
                              onClick={toggleCommunityOpen}
                              className="flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors text-gray-900 dark:text-gray-100"
                            >
                              <div className={classNames(
                                "w-4 h-4 mr-2 transition-transform duration-200 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400",
                                isCommunityOpen ? "i-ph:caret-down" : "i-ph:caret-right"
                              )} />
                              <div className="i-ph:users-three w-4 h-4 mr-2" />
                              Community
                            </button>
                            {isCommunityOpen && (
                              <div className="ml-4 pl-3 border-l border-gray-300 dark:border-gray-700 mt-1 space-y-1">
                                <Link href="/marketers" target="_blank">
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isMarketersActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:user-list w-3.5 h-3.5 mr-2" />
                                    Marketers
                                    <div className="i-ph:arrow-square-out w-4 h-4 ml-auto" />
                                  </button>
                                </Link>
                                <Link href={messagesHref}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isMessagesActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:chat-teardrop-dots w-3.5 h-3.5 mr-2" />
                                    Messages
                                  </button>
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {(() => {
                        const activeWsId = pathname?.split('/')[2];
                        const arenaHref = activeWsId ? `/workspace/${activeWsId}/games/ai-startup-arena` : '/workspace';
                        const isArenaActive = pathname?.includes('/games/ai-startup-arena');
                        return (
                          <div className="mt-1">
                            <button
                              onClick={toggleGamesOpen}
                              className="flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm font-medium transition-colors text-gray-900 dark:text-gray-100"
                            >
                              <div className={classNames(
                                "w-4 h-4 mr-2 transition-transform duration-200 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400",
                                isGamesOpen ? "i-ph:caret-down" : "i-ph:caret-right"
                              )} />
                              <div className="i-ph:game-controller w-4 h-4 mr-2" />
                              Games
                            </button>
                            {isGamesOpen && (
                              <div className="ml-4 pl-3 border-l border-gray-300 dark:border-gray-700 mt-1 space-y-1">
                                <Link href={arenaHref}>
                                  <button className={classNames(
                                    "flex items-center justify-start w-full hover:bg-[#EBEBEB] dark:hover:bg-gray-800 relative px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs font-medium transition-colors",
                                    isArenaActive ? "bg-[#EBEBEB] dark:bg-gray-800 dark:text-white" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    <div className="i-ph:sword w-3.5 h-3.5 mr-2 text-purple-600" />
                                    Arena
                                  </button>
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })()} */}
                    </div>
                  </div>
                  {(() => {
                    const isPricingActive = searchParams?.get('tab') === 'pricing';
                    const handlePricingClick = (e: React.MouseEvent) => {
                      e.preventDefault();
                      const activeWsId = pathname?.split('/')[2];
                      if (activeWsId) {
                        router.push(`/workspace/${activeWsId}/upgrade`);
                      } else {
                        router.push('/upgrade');
                      }
                    };

                    const handleReturnToAgent = () => {
                      aiSidebarStore.isOpen.set(true);
                    };

                    const isTopTier = profile?.subscriptionTier === 'pro' || profile?.subscriptionTier === 'enterprise' || profile?.subscriptionTier === 'highest';

                    return (
                      <div className="p-3 mt-auto space-y-2">
                        {!isAgentSidebarOpen && (
                          <button
                            onClick={handleReturnToAgent}
                            className="flex items-center justify-between w-full px-3 py-2.5 
                            rounded-md font-medium text-sm text-gray-900 dark:text-white 
                            dark:hover:bg-purple-900/50 transition-colors focus:outline-none 
                            border border-gray-300 dark:border-purple-800/60"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="i-ph:sparkle-fill w-5 h-5 dark:text-white/90 shrink-0" />
                              <div className="flex flex-col text-left leading-tight min-w-0">
                                <span className="text-xs truncate">Return to the Agent</span>
                                <span className="text-[10px] dark:text-white/90 font-normal">AI Agent</span>
                              </div>
                            </div>
                            <div className="i-ph:arrow-right w-4 h-4 shrink-0 ml-1" />
                          </button>
                        )}
                        {!isTopTier && (
                          <Button
                            onClick={handlePricingClick}
                            className={classNames(
                              "flex items-center justify-center w-full px-3 py-2 rounded-lg font-medium text-sm text-black transition-opacity hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-amber-500/50",
                              isPricingActive ? "opacity-90" : ""
                            )}
                            style={{ backgroundColor: '#ffc64cff' }}
                          >
                            <div className="i-ph:diamond w-4 h-4 mr-2 text-black shrink-0" />
                            Upgrade Plan
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <DialogRoot open={isRenameDialogOpen}>
        <Dialog onClose={() => setIsRenameDialogOpen(false)} onBackdrop={() => setIsRenameDialogOpen(false)}>
          <form onSubmit={handleRenameWorkspace} className="p-6 space-y-4">
            <DialogTitle>Rename Workspace</DialogTitle>
            <DialogDescription>
              Enter a new name for your workspace.
            </DialogDescription>
            <Input
              autoFocus
              type="text"
              value={renameInputValue}
              onChange={(e) => setRenameInputValue(e.target.value)}
              placeholder="Workspace Name"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => setIsRenameDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  handleRenameWorkspace(e);
                }}
                disabled={isRenaming || !renameInputValue.trim()}
                className='bg-[#0099ff]/20 text-[#0099ff]'
              >
                {isRenaming ? 'Saving...' : 'Save Name'}
              </Button>
            </div>
          </form>
        </Dialog>
      </DialogRoot>

      <DialogRoot open={isCreatingWorkspace}>
        <Dialog onClose={() => setIsCreatingWorkspace(false)} onBackdrop={() => setIsCreatingWorkspace(false)}>
          <form onSubmit={handleCreateWorkspace} className="p-6 space-y-4">
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Enter a name for your new workspace.
            </DialogDescription>
            <Input
              autoFocus
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace Name"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setIsCreatingWorkspace(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  handleCreateWorkspace(e);
                }}
                disabled={isCreating || !newWorkspaceName.trim()}
                className='bg-[#0099ff]/20 text-[#0099ff]'
              >
                {isCreating ? 'Creating...' : 'Create Workspace'}
              </Button>
            </div>
          </form>
        </Dialog>
      </DialogRoot>

      {activeWsId && (
        <WorkspaceSettingsModal
          isOpen={isWorkspaceSettingsOpen}
          onClose={() => setIsWorkspaceSettingsOpen(false)}
          workspaceId={activeWsId}
          defaultTab={workspaceSettingsTab}
        />
      )}

      <SkillsDialog open={skillsDialogOpen} onOpenChange={setSkillsDialogOpen} />
    </>
  );
};
