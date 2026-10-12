'use client';
import { useStore } from '@nanostores/react';
import { vercelConnection } from '~/lib/stores/vercel';
import { chatId } from '~/lib/persistence/useChatHistory';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useEffect, useState } from 'react';

export function VercelDeploymentLink() {
  const connection = useStore(vercelConnection);
  const currentChatId = useStore(chatId);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchProjectData() {
      if (!currentChatId) {
        return;
      }

      
      const savedUrl = localStorage.getItem(`deploy-url-${currentChatId}`);

      if (savedUrl) {
        setDeploymentUrl(savedUrl);
        return;
      }

      if (!connection.token) {
        return;
      }

      
      const projectId = localStorage.getItem(`vercel-project-${currentChatId}`);

      if (!projectId) {
        return;
      }

      setIsLoading(true);

      try {
        
        const projectsResponse = await fetch('https://api.vercel.com/v9/projects', {
          headers: {
            Authorization: `Bearer ${connection.token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!projectsResponse.ok) {
          throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
        }

        const projectsData = (await projectsResponse.json()) as any;
        const projects = projectsData.projects || [];

        
        const chatNumber = currentChatId.split('-')[0];

        
        const project = projects.find((p: { name: string | string[] }) => p.name.includes(`falbor-diy-${chatNumber}`));

        if (project) {
          
          const projectDetailsResponse = await fetch(`https://api.vercel.com/v9/projects/${project.id}`, {
            headers: {
              Authorization: `Bearer ${connection.token}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          });

          if (projectDetailsResponse.ok) {
            const projectDetails = (await projectDetailsResponse.json()) as any;

            
            if (projectDetails.targets?.production?.alias && projectDetails.targets.production.alias.length > 0) {
              
              const cleanUrl = projectDetails.targets.production.alias.find(
                (a: string) => a.endsWith('.vercel.app') && !a.includes('-projects.vercel.app'),
              );

              if (cleanUrl) {
                setDeploymentUrl(`https://${cleanUrl}`);
                return;
              } else {
                
                setDeploymentUrl(`https://${projectDetails.targets.production.alias[0]}`);
                return;
              }
            }
          }

          
          const deploymentsResponse = await fetch(
            `https://api.vercel.com/v6/deployments?projectId=${project.id}&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${connection.token}`,
                'Content-Type': 'application/json',
              },
              cache: 'no-store',
            },
          );

          if (deploymentsResponse.ok) {
            const deploymentsData = (await deploymentsResponse.json()) as any;

            if (deploymentsData.deployments && deploymentsData.deployments.length > 0) {
              setDeploymentUrl(`https://${deploymentsData.deployments[0].url}`);
              return;
            }
          }
        }

        
        const fallbackResponse = await fetch(`/api/vercel-deploy?projectId=${projectId}&token=${connection.token}`, {
          method: 'GET',
        });

        const data = await fallbackResponse.json();

        if ((data as { deploy?: { url?: string } }).deploy?.url) {
          setDeploymentUrl((data as { deploy: { url: string } }).deploy.url);
        } else if ((data as { project?: { url?: string } }).project?.url) {
          setDeploymentUrl((data as { project: { url: string } }).project.url);
        }
      } catch (err) {
        console.error('Error fetching Vercel deployment:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjectData();
  }, [connection.token, currentChatId]);

  if (!deploymentUrl) {
    return null;
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <a
            href={deploymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-falbor-elements-item-backgroundActive text-falbor-elements-textSecondary hover:text-[#000000] z-50"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className={`i-ph:link w-4 h-4 hover:text-blue-400 ${isLoading ? 'animate-pulse' : ''}`} />
          </a>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="px-3 py-2 rounded bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary text-xs z-50"
            sideOffset={5}
          >
            {deploymentUrl}
            <Tooltip.Arrow className="fill-falbor-elements-background-depth-3" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
