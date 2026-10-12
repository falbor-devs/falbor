'use client';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { netlifyConnection } from '~/lib/stores/netlify';
import { workbenchStore } from '~/lib/stores/workbench';
import { webcontainer } from '~/lib/webcontainer';
import { path } from '~/utils/path';
import { useState } from 'react';
import type { ActionCallbackData } from '~/lib/runtime/message-parser';
import { chatId } from '~/lib/persistence/useChatHistory';
import { formatBuildFailureOutput } from './deployUtils';

export function useNetlifyDeploy() {
  const [isDeploying, setIsDeploying] = useState(false);
  const netlifyConn = useStore(netlifyConnection);
  const currentChatId = useStore(chatId);

  const handleNetlifyDeploy = async () => {
    if (!netlifyConn.user || !netlifyConn.token) {
      toast.error('Please connect to Netlify first in the settings tab!');
      return false;
    }

    if (!currentChatId) {
      toast.error('No active chat found');
      return false;
    }

    try {
      setIsDeploying(true);

      const artifact = workbenchStore.firstArtifact;

      if (!artifact) {
        throw new Error('No active project found');
      }

      
      const deploymentId = `deploy-artifact`;
      workbenchStore.addArtifact({
        id: deploymentId,
        messageId: deploymentId,
        title: 'Netlify Deployment',
        type: 'standalone',
      });

      const deployArtifact = workbenchStore.artifacts.get()[deploymentId];

      
      deployArtifact.runner.handleDeployAction('building', 'running', { source: 'netlify' });

      
      const actionId = 'build-' + Date.now();
      const actionData: ActionCallbackData = {
        messageId: 'netlify build',
        artifactId: artifact.id,
        actionId,
        action: {
          type: 'build' as const,
          content: 'npm run build',
        },
      };

      
      artifact.runner.addAction(actionData);

      
      await artifact.runner.runAction(actionData);

      const buildOutput = artifact.runner.buildOutput;

      if (!buildOutput || buildOutput.exitCode !== 0) {
        
        deployArtifact.runner.handleDeployAction('building', 'failed', {
          error: formatBuildFailureOutput(buildOutput?.output),
          source: 'netlify',
        });
        throw new Error('Build failed');
      }

      
      deployArtifact.runner.handleDeployAction('deploying', 'running', { source: 'netlify' });

      
      const container = await webcontainer;

      
      let finalBuildPath = '';
      let buildPathExists = false;

      
      if (buildOutput.path) {
        try {
          await container.fs.readdir(buildOutput.path);
          finalBuildPath = buildOutput.path;
          buildPathExists = true;
        } catch (e) {
          
        }
      }

      if (!buildPathExists) {
        
        const commonOutputDirs = ['dist', 'build', 'out', 'output', '.next', 'public'];
  
        for (const dir of commonOutputDirs) {
          try {
            await container.fs.readdir(dir);
            finalBuildPath = dir;
            buildPathExists = true;
            break;
          } catch (error) {
            continue;
          }
        }
      }

      if (!buildPathExists) {
        throw new Error('Could not find build output directory. Please check your build configuration.');
      }

      async function getAllFiles(dirPath: string): Promise<Record<string, { content: string | Uint8Array, isBinary: boolean }>> {
        const files: Record<string, { content: string | Uint8Array, isBinary: boolean }> = {};
        const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isFile()) {
            const isBinary = /\.(png|jpg|jpeg|gif|webp|ico|bmp|mp3|mp4|wav|woff|woff2|ttf|eot)$/i.test(entry.name);
            let content;
            if (isBinary) {
              content = await container.fs.readFile(fullPath);
            } else {
              content = await container.fs.readFile(fullPath, 'utf-8');
            }

            
            const deployPath = fullPath.replace(finalBuildPath, '');
            files[deployPath] = { content, isBinary };
          } else if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath);
            Object.assign(files, subFiles);
          }
        }

        return files;
      }

      const fileContents = await getAllFiles(finalBuildPath);

      
      const fileDigests: Record<string, string> = {};
      
      async function sha1(data: string | Uint8Array): Promise<string> {
        const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const hashBuffer = await crypto.subtle.digest('SHA-1', buffer as BufferSource);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }

      for (const [filePath, { content }] of Object.entries(fileContents)) {
        const normalizedPath = filePath.startsWith('/') ? filePath : '/' + filePath;
        const hash = await sha1(content);
        fileDigests[normalizedPath] = hash;
      }

      
      let targetSiteId = localStorage.getItem(`netlify-site-${currentChatId}`);
      let siteInfo;

      if (targetSiteId) {
        const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}`, {
          headers: { Authorization: `Bearer ${netlifyConn.token}` },
        });
        if (siteResponse.ok) {
          const existingSite = await siteResponse.json();
          siteInfo = { id: existingSite.id, name: existingSite.name, url: existingSite.url };
        } else {
          targetSiteId = null;
        }
      }

      if (!targetSiteId) {
        const siteName = `falbor-diy-${currentChatId}-${Date.now()}`;
        const createSiteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${netlifyConn.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: siteName, custom_domain: null }),
        });

        if (!createSiteResponse.ok) {
          throw new Error('Failed to create Netlify site');
        }

        const newSite = await createSiteResponse.json();
        targetSiteId = newSite.id;
        siteInfo = { id: newSite.id, name: newSite.name, url: newSite.url };
        localStorage.setItem(`netlify-site-${currentChatId}`, newSite.id);
      }

      
      const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${netlifyConn.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: fileDigests,
          async: true,
          skip_processing: false,
          draft: false,
        }),
      });

      if (!deployResponse.ok) {
        throw new Error('Failed to create deployment');
      }

      const deploy = await deployResponse.json();

      
      const MAX_WAIT_MS = 20_000;
      const POLL_INTERVAL_MS = 2_000;
      const startTime = Date.now();
      let filesUploaded = false;
      let deploymentStatus;

      while (Date.now() - startTime < MAX_WAIT_MS) {
        const statusResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys/${deploy.id}`, {
          headers: { Authorization: `Bearer ${netlifyConn.token}` },
        });

        deploymentStatus = await statusResponse.json();

        if (deploymentStatus.state === 'error') {
            throw new Error('Deployment failed: ' + (deploymentStatus.error_message || 'Unknown error'));
        }

        if (!filesUploaded && (deploymentStatus.state === 'prepared' || deploymentStatus.state === 'uploaded')) {
          
          for (const [filePath, { content }] of Object.entries(fileContents)) {
            const normalizedPath = filePath.startsWith('/') ? filePath : '/' + filePath;
            const encodedPath = normalizedPath
              .split('/')
              .map((segment) => encodeURIComponent(segment))
              .join('/');

            let uploadSuccess = false;
            let uploadRetries = 0;

            while (!uploadSuccess && uploadRetries < 3) {
              try {
                const uploadResponse = await fetch(
                  `https://api.netlify.com/api/v1/deploys/${deploy.id}/files${encodedPath}`,
                  {
                    method: 'PUT',
                    headers: {
                      Authorization: `Bearer ${netlifyConn.token}`,
                      'Content-Type': 'application/octet-stream',
                    },
                    body: content as BodyInit,
                  },
                );

                uploadSuccess = uploadResponse.ok;
                if (!uploadSuccess) {
                  uploadRetries++;
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                }
              } catch (error) {
                uploadRetries++;
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }

            if (!uploadSuccess) {
              throw new Error(`Failed to upload file ${filePath}`);
            }
          }
          filesUploaded = true;
        }

        if (deploymentStatus.state === 'ready') {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      const deployUrl = deploymentStatus?.ssl_url || deploymentStatus?.url || siteInfo?.url;

      if (deployUrl) {
        localStorage.setItem(`deploy-url-${currentChatId}`, deployUrl);
        localStorage.setItem(`deploy-source-${currentChatId}`, 'netlify');
      }

      
      deployArtifact.runner.handleDeployAction('complete', 'complete', {
        url: deployUrl,
        source: 'netlify',
      });

      
      toast.success(`🚀 Netlify deployment completed successfully!`);

      return true;
    } catch (error) {
      console.error('Deploy error:', error);
      toast.error(error instanceof Error ? error.message : 'Deployment failed');

      const deploymentId = `deploy-artifact`;
      const deployArtifact = workbenchStore.artifacts.get()[deploymentId];
      if (deployArtifact) {
        deployArtifact.runner.handleDeployAction('deploying', 'failed', {
          error: error instanceof Error ? error.message : 'Deployment failed',
          source: 'netlify'
        });
      }

      return false;
    } finally {
      setIsDeploying(false);
    }
  };

  return {
    isDeploying,
    handleNetlifyDeploy,
    isConnected: !!netlifyConn.user,
  };
}
