'use client';
import { useEffect, useState } from 'react';
import { useSupabaseConnection } from '~/lib/hooks/useSupabaseConnection';
import { classNames } from '~/utils/classNames';
import { useStore } from '@nanostores/react';
import { chatId } from '~/lib/persistence/useChatHistory';
import { fetchSupabaseStats } from '~/lib/stores/supabase';
import { Dialog, DialogRoot, DialogClose, DialogTitle, DialogButton } from '~/components/ui/Dialog';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { selectedDatabase } from '~/lib/stores/database';

export function SupabaseConnection() {
  const {
    connection: supabaseConn,
    connecting,
    fetchingStats,
    isProjectsExpanded,
    setIsProjectsExpanded,
    isDropdownOpen: isDialogOpen,
    setIsDropdownOpen: setIsDialogOpen,
    handleConnect,
    handleDisconnect,
    selectProject,
    handleCreateProject,
    updateToken,
    isConnected,
    fetchProjectApiKeys,
  } = useSupabaseConnection();

  const currentChatId = useStore(chatId);
  const [isPushing, setIsPushing] = useState(false);
  const [isEnvConfigured, setIsEnvConfigured] = useState(false);
  const [sqlMigrationFiles, setSqlMigrationFiles] = useState<[string, any][]>([]);

  useEffect(() => {
    const unsubscribe = workbenchStore.files.subscribe((files) => {
      let hasSupabaseUrl = false;
      for (const [path, file] of Object.entries(files)) {
        if (path.endsWith('.env') && file && file.type === 'file' && typeof file.content === 'string') {
          if (file.content.includes('VITE_SUPABASE_URL') || file.content.includes('NEXT_PUBLIC_SUPABASE_URL')) {
            hasSupabaseUrl = true;
            break;
          }
        }
      }
      setIsEnvConfigured(hasSupabaseUrl);

      const sqlList = Object.entries(files)
        .filter(([path]) => path.endsWith('.sql'))
        .sort(([pathA], [pathB]) => pathA.localeCompare(pathB));
      setSqlMigrationFiles(sqlList);
    });
    return unsubscribe;
  }, []);

  const handlePushMigrations = async () => {
    if (!currentChatId) return;
    setIsPushing(true);
    try {
      const files = workbenchStore.files.get();
      const sqlFiles = Object.entries(files)
        .filter(([path]) => path.endsWith('.sql'))
        .sort(([pathA], [pathB]) => pathA.localeCompare(pathB));

      if (sqlFiles.length === 0) {
        toast.info('No SQL migration files found to push.');
        setIsPushing(false);
        return;
      }

      toast.info(`Pushing ${sqlFiles.length} migration(s)...`);

      for (const [path, file] of sqlFiles) {
        if (file?.type === 'file' && file.content) {
          const res = await fetch('/api/database/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: currentChatId,
              sql: file.content
            })
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(`Failed to push ${path}: ${errorData.message || res.statusText}`);
          }
        }
      }
      toast.success('Successfully pushed all migrations to Supabase!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to push migrations');
      console.error(e);
    } finally {
      setIsPushing(false);
    }
  };
  useEffect(() => {
    const handleOpenConnectionDialog = () => {
      setIsDialogOpen(true);
    };

    document.addEventListener('open-supabase-connection', handleOpenConnectionDialog);

    return () => {
      document.removeEventListener('open-supabase-connection', handleOpenConnectionDialog);
    };
  }, [setIsDialogOpen]);

  useEffect(() => {
    if (isConnected && currentChatId) {
      const savedProjectId = localStorage.getItem(`supabase-project-${currentChatId}`);

      
      if (!savedProjectId && supabaseConn.selectedProjectId) {
        
        localStorage.setItem(`supabase-project-${currentChatId}`, supabaseConn.selectedProjectId);
      } else if (savedProjectId && savedProjectId !== supabaseConn.selectedProjectId) {
        selectProject(savedProjectId);
      }
    }
  }, [isConnected, currentChatId]);

  useEffect(() => {
    if (currentChatId && supabaseConn.selectedProjectId) {
      localStorage.setItem(`supabase-project-${currentChatId}`, supabaseConn.selectedProjectId);
    } else if (currentChatId && !supabaseConn.selectedProjectId) {
      localStorage.removeItem(`supabase-project-${currentChatId}`);
    }
  }, [currentChatId, supabaseConn.selectedProjectId]);

  useEffect(() => {
    if (isConnected && supabaseConn.token) {
      fetchSupabaseStats(supabaseConn.token).catch(console.error);
    }
  }, [isConnected, supabaseConn.token]);

  useEffect(() => {
    if (isConnected && supabaseConn.selectedProjectId && supabaseConn.token && !supabaseConn.credentials) {
      fetchProjectApiKeys(supabaseConn.selectedProjectId).catch(console.error);
    }
  }, [isConnected, supabaseConn.selectedProjectId, supabaseConn.token, supabaseConn.credentials]);

  return (
    <div className="relative">
      {}

      <DialogRoot open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog className="max-w-[520px] p-6">
            {isEnvConfigured ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <DialogTitle>
                    <img
                      className="w-5 h-5"
                      height="24"
                      width="24"
                      crossOrigin="anonymous"
                      src="https://cdn.simpleicons.org/supabase"
                    />
                    Database Connected
                  </DialogTitle>
                </div>

                <div className="bg-[#F8F8F8] dark:bg-[#1A1A1A] p-4 rounded-lg border border-[#E5E5E5] dark:border-[#333333]">
                  <p className="text-sm text-falbor-elements-textPrimary mb-2">This project is connected to Supabase via your <code className="bg-[#E5E5E5] dark:bg-[#333333] px-1 rounded">.env</code> file.</p>

                  <h4 className="text-xs font-semibold text-falbor-elements-textSecondary uppercase tracking-wider mb-2 mt-4">SQL Migrations</h4>
                  {sqlMigrationFiles.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      {sqlMigrationFiles.map(([path]) => (
                        <div key={path} className="flex items-center gap-2 text-sm bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#333333] p-2 rounded">
                          <div className="i-ph:file-sql w-4 h-4 text-[#3ECF8E]" />
                          <span className="truncate">{path.split('/').pop()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-falbor-elements-textTertiary italic">No SQL migrations found yet.</p>
                  )}
                </div>

                <div className="flex justify-between items-center mt-6">
                  <div>
                    <DialogButton type="primary" onClick={handlePushMigrations} disabled={isPushing || sqlMigrationFiles.length === 0}>
                      <div className={classNames("w-4 h-4", isPushing ? "i-ph:spinner animate-spin" : "i-ph:upload-simple")} />
                      {isPushing ? 'Pushing...' : 'Push All SQL Migrations'}
                    </DialogButton>
                  </div>
                  <div className="flex gap-2">
                    <DialogClose asChild>
                      <DialogButton type="secondary">Close</DialogButton>
                    </DialogClose>
                  </div>
                </div>
              </div>
            ) : !isConnected ? (
              <div className="space-y-4">
                <DialogTitle>
                  <img
                    className="w-5 h-5"
                    height="24"
                    width="24"
                    crossOrigin="anonymous"
                    src="https://cdn.simpleicons.org/supabase"
                  />
                  Connect to Supabase
                </DialogTitle>

                <div>
                  <label className="block text-sm text-falbor-elements-textSecondary mb-2">Access Token</label>
                  <input
                    type="password"
                    value={supabaseConn.token}
                    onChange={(e) => updateToken(e.target.value)}
                    disabled={connecting}
                    placeholder="Enter your Supabase access token"
                    className={classNames(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                      'border border-[#E5E5E5] dark:border-[#333333]',
                      'text-falbor-elements-textPrimary placeholder-falbor-elements-textTertiary',
                      'focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]',
                      'disabled:opacity-50',
                    )}
                  />
                  <div className="mt-2 text-sm text-falbor-elements-textSecondary">
                    <a
                      href="https://app.supabase.com/account/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3ECF8E] hover:underline inline-flex items-center gap-1"
                    >
                      Get your token
                      <div className="i-ph:arrow-square-out w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  {!currentChatId && (
                    <DialogClose asChild>
                      <button
                        onClick={() => {
                          selectedDatabase.set('supabase');
                        }}
                        className={classNames(
                          'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                          'bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary',
                          'hover:bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor',
                        )}
                      >
                        <div className="i-ph:magic-wand w-4 h-4" />
                        Automatically Supabase
                      </button>
                    </DialogClose>
                  )}
                  <DialogClose asChild>
                    <DialogButton type="secondary">Cancel</DialogButton>
                  </DialogClose>
                  <button
                    onClick={handleConnect}
                    disabled={connecting || !supabaseConn.token}
                    className={classNames(
                      'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                      'bg-[#3ECF8E] text-white',
                      'hover:bg-[#3BBF84]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {connecting ? (
                      <>
                        <div className="i-ph:spinner-gap animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <div className="i-ph:plug-charging w-4 h-4" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <DialogTitle>
                    <img
                      className="w-5 h-5"
                      height="24"
                      width="24"
                      crossOrigin="anonymous"
                      src="https://cdn.simpleicons.org/supabase"
                    />
                    Supabase Connection
                  </DialogTitle>
                </div>

                <div className="flex items-center gap-4 p-3 bg-[#F8F8F8] dark:bg-[#1A1A1A] rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-falbor-elements-textPrimary">{supabaseConn.user?.email}</h4>
                    <p className="text-xs text-falbor-elements-textSecondary">Role: {supabaseConn.user?.role}</p>
                  </div>
                </div>

                {fetchingStats ? (
                  <div className="flex items-center gap-2 text-sm text-falbor-elements-textSecondary">
                    <div className="i-ph:spinner-gap w-4 h-4 animate-spin" />
                    Fetching projects...
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                        className="bg-transparent text-left text-sm font-medium text-falbor-elements-textPrimary flex items-center gap-2"
                      >
                        <div className="i-ph:database w-4 h-4" />
                        Your Projects ({supabaseConn.stats?.totalProjects || 0})
                        <div
                          className={classNames(
                            'i-ph:caret-down w-4 h-4 transition-transform',
                            isProjectsExpanded ? 'rotate-180' : '',
                          )}
                        />
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchSupabaseStats(supabaseConn.token)}
                          className="px-2 py-1 rounded-md text-xs bg-[#F0F0F0] dark:bg-[#252525] text-falbor-elements-textSecondary hover:bg-[#E5E5E5] dark:hover:bg-[#333333] flex items-center gap-1"
                          title="Refresh projects list"
                        >
                          <div className="i-ph:arrows-clockwise w-3 h-3" />
                          Refresh
                        </button>
                        <button
                          onClick={() => handleCreateProject()}
                          className="px-2 py-1 rounded-md text-xs bg-[#3ECF8E] text-white hover:bg-[#3BBF84] flex items-center gap-1"
                        >
                          <div className="i-ph:plus w-3 h-3" />
                          New Project
                        </button>
                      </div>
                    </div>

                    {isProjectsExpanded && (
                      <>
                        {!supabaseConn.selectedProjectId && (
                          <div className="mb-2 p-3 bg-[#F8F8F8] dark:bg-[#1A1A1A] rounded-lg text-sm text-falbor-elements-textSecondary">
                            Select a project or create a new one for this chat
                          </div>
                        )}

                        {supabaseConn.stats?.projects?.length ? (
                          <div className="grid gap-2 max-h-60 overflow-y-auto">
                            {supabaseConn.stats.projects.map((project) => (
                              <div
                                key={project.id}
                                className="block p-3 rounded-lg border border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-[#3ECF8E] dark:hover:border-[#3ECF8E] transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="text-sm font-medium text-falbor-elements-textPrimary flex items-center gap-1">
                                      <div className="i-ph:database w-3 h-3 text-[#3ECF8E]" />
                                      {project.name}
                                    </h5>
                                    <div className="text-xs text-falbor-elements-textSecondary mt-1">
                                      {project.region}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => selectProject(project.id)}
                                    className={classNames(
                                      'px-3 py-1 rounded-md text-xs',
                                      supabaseConn.selectedProjectId === project.id
                                        ? 'bg-[#3ECF8E] text-white'
                                        : 'bg-[#F0F0F0] dark:bg-[#252525] text-falbor-elements-textSecondary hover:bg-[#3ECF8E] hover:text-white',
                                    )}
                                  >
                                    {supabaseConn.selectedProjectId === project.id ? (
                                      <span className="flex items-center gap-1">
                                        <div className="i-ph:check w-3 h-3" />
                                        Selected
                                      </span>
                                    ) : (
                                      'Select'
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-falbor-elements-textSecondary flex items-center gap-2">
                            <div className="i-ph:info w-4 h-4" />
                            No projects found
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center mt-6">
                  <div>
                    <DialogButton type="primary" onClick={handlePushMigrations} disabled={isPushing}>
                      <div className={classNames("w-4 h-4", isPushing ? "i-ph:spinner animate-spin" : "i-ph:upload-simple")} />
                      {isPushing ? 'Pushing...' : 'Push All SQL Migrations'}
                    </DialogButton>
                  </div>
                  <div className="flex gap-2">
                    <DialogClose asChild>
                      <DialogButton type="secondary">Close</DialogButton>
                    </DialogClose>
                    <DialogButton type="danger" onClick={handleDisconnect}>
                      <div className="i-ph:plugs w-4 h-4" />
                      Disconnect
                    </DialogButton>
                  </div>
                </div>
              </div>
            )}
          </Dialog>
      </DialogRoot>
    </div>
  );
}

interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  children?: any;
  onClick?: VoidFunction;
  className?: string;
}

function Button({ active = false, disabled = false, children, onClick, className }: ButtonProps) {
  return (
    <button
      className={classNames(
        'flex items-center p-1.5',
        {
          'bg-falbor-elements-item-backgroundDefault hover:bg-falbor-elements-item-backgroundActive text-falbor-elements-textTertiary hover:text-falbor-elements-textPrimary':
            !active,
          'bg-falbor-elements-item-backgroundDefault text-falbor-elements-item-contentAccent': active && !disabled,
          'bg-falbor-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed':
            disabled,
        },
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
