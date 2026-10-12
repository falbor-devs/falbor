'use client';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';
import { useStore } from '@nanostores/react';
import { netlifyConnection } from '~/lib/stores/netlify';
import { vercelConnection } from '~/lib/stores/vercel';
import { isGitLabConnected } from '~/lib/stores/gitlabConnection';
import { workbenchStore } from '~/lib/stores/workbench';
import { streamingState } from '~/lib/stores/streaming';
import { classNames } from '~/utils/classNames';
import { useEffect, useState } from 'react';
import { useVercelDeploy } from '~/components/deploy/VercelDeploy.client';
import { useNetlifyDeploy } from '~/components/deploy/NetlifyDeploy.client';
import { useGitHubDeploy } from '~/components/deploy/GitHubDeploy.client';
import { useGitLabDeploy } from '~/components/deploy/GitLabDeploy.client';
import { useFalborDeploy } from '~/components/deploy/FalborDeploy.client';
import { GitHubDeploymentDialog } from '~/components/deploy/GitHubDeploymentDialog';
import { GitLabDeploymentDialog } from '~/components/deploy/GitLabDeploymentDialog';
import { chatId } from '~/lib/persistence/useChatHistory';
import { deploymentStore, fetchDeployment, deleteDeployment } from '~/lib/stores/deployments';
import { DeploymentCard } from '~/components/ui/DeploymentCard';
import { toast } from 'react-toastify';

interface DeployButtonProps {
  onVercelDeploy?: () => Promise<void>;
  onNetlifyDeploy?: () => Promise<void>;
  onGitHubDeploy?: () => Promise<void>;
  onGitLabDeploy?: () => Promise<void>;
  onFalborDeploy?: () => Promise<void>;
}

export const DeployButton = ({
  onVercelDeploy,
  onNetlifyDeploy,
  onGitHubDeploy,
  onGitLabDeploy,
  onFalborDeploy,
}: DeployButtonProps) => {
  const currentChatId = useStore(chatId);
  const deploymentState = useStore(deploymentStore);
  const deployment = deploymentState.current;

  const netlifyConn = useStore(netlifyConnection);
  const vercelConn = useStore(vercelConnection);
  const gitlabIsConnected = useStore(isGitLabConnected);
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTo, setDeployingTo] = useState<'netlify' | 'vercel' | 'github' | 'gitlab' | 'falbor' | null>(null);
  const isStreaming = useStore(streamingState);

  const { handleVercelDeploy } = useVercelDeploy();
  const { handleNetlifyDeploy } = useNetlifyDeploy();
  const { handleGitHubDeploy } = useGitHubDeploy();
  const { handleGitLabDeploy } = useGitLabDeploy();
  const { handleFalborDeploy } = useFalborDeploy();

  const [showGitHubDeploymentDialog, setShowGitHubDeploymentDialog] = useState(false);
  const [showGitLabDeploymentDialog, setShowGitLabDeploymentDialog] = useState(false);
  const [githubDeploymentFiles, setGithubDeploymentFiles] = useState<Record<string, string> | null>(null);
  const [gitlabDeploymentFiles, setGitlabDeploymentFiles] = useState<Record<string, string> | null>(null);
  const [githubProjectName, setGithubProjectName] = useState('');
  const [gitlabProjectName, setGitlabProjectName] = useState('');

  
  useEffect(() => {
    if (currentChatId) {
      fetchDeployment(currentChatId);
    }
  }, [currentChatId]);

  const saveDeploymentResult = async (url: string, provider: 'netlify' | 'vercel' | 'github' | 'gitlab' | 'falbor', subdomain?: string) => {
    if (!currentChatId) return;
    try {
      await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: currentChatId,
          url,
          provider,
          subdomain,
        }),
      });
      await fetchDeployment(currentChatId);
    } catch (e) {
      console.error('Failed to save deployment', e);
    }
  };

  const handleProviderSwitch = async (targetProvider: string) => {
    if (deployment && deployment.provider !== targetProvider) {
      const confirmDelete = window.confirm(`You are going to delete your current ${deployment.provider} deployment. Proceed?`);
      if (!confirmDelete) return false;
      await deleteDeployment(currentChatId!);
      toast.info(`Deleted previous ${deployment.provider} deployment.`);
    }
    return true;
  };

  const handleDeployAction = async (provider: 'falbor' | 'vercel' | 'netlify' | 'github' | 'gitlab', action: () => Promise<any>) => {
    if (!await handleProviderSwitch(provider)) return;

    setIsDeploying(true);
    setDeployingTo(provider);

    try {
      await action();
      
      
      setTimeout(async () => {
        const url = localStorage.getItem(`deploy-url-${currentChatId}`);
        if (url && provider !== 'falbor') {
          
          await saveDeploymentResult(url, provider);
        } else if (provider !== 'falbor') {
          
          await fetchDeployment(currentChatId!);
        }
      }, 500);
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  };

  const handleEditSave = async (newSubdomain: string) => {
    if (!currentChatId) return;
    const res = await fetch('/api/deployments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: currentChatId, newSubdomain }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to rename');
    }
    await fetchDeployment(currentChatId);
  };

  const handleFalborDeployClick = () => handleDeployAction('falbor', onFalborDeploy || handleFalborDeploy);
  const handleVercelDeployClick = () => handleDeployAction('vercel', onVercelDeploy || handleVercelDeploy);
  const handleNetlifyDeployClick = () => handleDeployAction('netlify', onNetlifyDeploy || handleNetlifyDeploy);

  const handleGitHubDeployClick = () => handleDeployAction('github', async () => {
    if (onGitHubDeploy) {
      await onGitHubDeploy();
    } else {
      const result = await handleGitHubDeploy();
      if (result && result.success && result.files) {
        setGithubDeploymentFiles(result.files);
        setGithubProjectName(result.projectName);
        setShowGitHubDeploymentDialog(true);
      }
    }
  });

  const handleGitLabDeployClick = () => handleDeployAction('gitlab', async () => {
    if (onGitLabDeploy) {
      await onGitLabDeploy();
    } else {
      const result = await handleGitLabDeploy();
      if (result && result.success && result.files) {
        setGitlabDeploymentFiles(result.files);
        setGitlabProjectName(result.projectName);
        setShowGitLabDeploymentDialog(true);
      }
    }
  });

  
  const providers = [
    { id: 'falbor', label: 'Publish with Falbor', imgSrc: '/favicon.ico', onClick: handleFalborDeployClick, disabled: false },
    { id: 'netlify', label: !netlifyConn.user ? 'No Netlify Account' : 'Publish with Netlify', imgSrc: 'https://cdn.simpleicons.org/netlify', onClick: handleNetlifyDeployClick, disabled: !netlifyConn.user },
    { id: 'vercel', label: !vercelConn.user ? 'No Vercel Account' : 'Publish with Vercel', imgSrc: 'https://cdn.simpleicons.org/vercel', imgSrcDark: 'https://cdn.simpleicons.org/vercel/white', onClick: handleVercelDeployClick, disabled: !vercelConn.user },
    { id: 'github', label: 'Publish with GitHub', imgSrc: 'https://cdn.simpleicons.org/github', imgSrcDark: 'https://cdn.simpleicons.org/github/white', onClick: handleGitHubDeployClick, disabled: false },
    { id: 'gitlab', label: !gitlabIsConnected ? 'No GitLab Account' : 'Publish with GitLab', imgSrc: 'https://cdn.simpleicons.org/gitlab', onClick: handleGitLabDeployClick, disabled: !gitlabIsConnected },
  ];

  const currentProviderConfig = providers.find(p => p.id === deployment?.provider);
  const otherProviders = providers.filter(p => p.id !== deployment?.provider);

  return (
    <>
      <div className="flex rounded-md overflow-hidden text-sm">
        <Dropdown
          className="p-2 w-[300px]"
          trigger={
            <button
              disabled={isDeploying || !activePreview || isStreaming}
              className="bg-white dark:bg-[#252525] text-gray-900 dark:text-white border border-gray-200 dark:border-transparent rounded-md items-center justify-center [&:is(:disabled,.disabled)]:cursor-not-allowed [&:is(:disabled,.disabled)]:opacity-60 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-[#333333] !outline-none appearance-none flex items-center gap-1.5 shadow-sm"
            >
              {isDeploying ? `Publishing to ${deployingTo}...` : 'Publish'}
              <span className={classNames('i-ph:caret-down transition-transform')} />
            </button>
          }
        >
          {deployment && (
            <DeploymentCard deployment={deployment} onEditSave={handleEditSave} />
          )}

          {deployment && currentProviderConfig && (
            <div className="mb-2 pb-2 border-b border-falbor-elements-borderColor">
              <DropdownItem
                className={isDeploying || !activePreview || currentProviderConfig.disabled ? 'opacity-60 cursor-not-allowed' : ''}
                onSelect={(e) => {
                  if (isDeploying || !activePreview || currentProviderConfig.disabled) {
                    e.preventDefault();
                    return;
                  }
                  currentProviderConfig.onClick();
                }}
              >
                <div className="flex items-center gap-2">
                  <img className="w-4 h-4 dark:hidden" crossOrigin="anonymous" src={currentProviderConfig.imgSrc} />
                  <img className="w-4 h-4 hidden dark:block" crossOrigin="anonymous" src={currentProviderConfig.imgSrcDark || currentProviderConfig.imgSrc} />
                  <span className="font-medium text-accent-500">Update {currentProviderConfig.id.charAt(0).toUpperCase() + currentProviderConfig.id.slice(1)} Deployment</span>
                </div>
              </DropdownItem>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {otherProviders.map((p) => (
              <DropdownItem
                key={p.id}
                className={isDeploying || !activePreview || p.disabled ? 'opacity-60 cursor-not-allowed' : ''}
                onSelect={(e) => {
                  if (isDeploying || !activePreview || p.disabled) {
                    e.preventDefault();
                    return;
                  }
                  p.onClick();
                }}
              >
                <div className="flex items-center gap-2">
                  <img className="w-4 h-4 opacity-70 group-hover:opacity-100 dark:hidden" crossOrigin="anonymous" src={p.imgSrc} />
                  <img className="w-4 h-4 opacity-70 group-hover:opacity-100 hidden dark:block" crossOrigin="anonymous" src={p.imgSrcDark || p.imgSrc} />
                  <span>{p.label}</span>
                </div>
              </DropdownItem>
            ))}
          </div>
        </Dropdown>
      </div>

      {showGitHubDeploymentDialog && githubDeploymentFiles && (
        <GitHubDeploymentDialog
          isOpen={showGitHubDeploymentDialog}
          onClose={() => setShowGitHubDeploymentDialog(false)}
          projectName={githubProjectName}
          files={githubDeploymentFiles}
        />
      )}

      {showGitLabDeploymentDialog && gitlabDeploymentFiles && (
        <GitLabDeploymentDialog
          isOpen={showGitLabDeploymentDialog}
          onClose={() => setShowGitLabDeploymentDialog(false)}
          projectName={gitlabProjectName}
          files={gitlabDeploymentFiles}
        />
      )}
    </>
  );
};