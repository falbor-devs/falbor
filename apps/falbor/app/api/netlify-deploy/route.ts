import { NextResponse } from "next/server";
const json = NextResponse.json;
import crypto from 'crypto';
import type { NetlifySiteInfo } from '~/types/netlify';

interface DeployRequestBody {
  siteId?: string;
  files: Record<string, string>;
  chatId: string;
}

async function readNetlifyError(response: Response) {
  try {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = (await response.json()) as { message?: string; error?: string } | undefined;
      return data?.message || data?.error || JSON.stringify(data);
    }

    const text = await response.text();

    return text;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  try {
    const { siteId, files, token, chatId } = (await request.json()) as DeployRequestBody & { token: string };

    if (!token) {
      return json({ error: 'Not connected to Netlify' }, { status: 401 });
    }

    let targetSiteId = siteId;
    let siteInfo: NetlifySiteInfo | undefined;

    // If no siteId provided, create a new site
    if (!targetSiteId) {
      const siteName = `falbor-diy-${chatId}-${Date.now()}`;
      const createSiteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: siteName,
          custom_domain: null,
        }),
      });

      if (!createSiteResponse.ok) {
        const errorDetail = await readNetlifyError(createSiteResponse);
        return json(
          { error: `Failed to create site${errorDetail ? `: ${errorDetail}` : ''}` },
          { status: createSiteResponse.status },
        );
      }

      const newSite = (await createSiteResponse.json()) as any;
      targetSiteId = newSite.id;
      siteInfo = {
        id: newSite.id,
        name: newSite.name,
        url: newSite.url,
        chatId,
      };
    } else {
      // Get existing site info
      if (targetSiteId) {
        const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (siteResponse.ok) {
          const existingSite = (await siteResponse.json()) as any;
          siteInfo = {
            id: existingSite.id,
            name: existingSite.name,
            url: existingSite.url,
            chatId,
          };
        } else {
          targetSiteId = undefined;
        }
      }

      // If no siteId provided or site doesn't exist, create a new site
      if (!targetSiteId) {
        const siteName = `falbor-diy-${chatId}-${Date.now()}`;
        const createSiteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: siteName,
            custom_domain: null,
          }),
        });

        if (!createSiteResponse.ok) {
          const errorDetail = await readNetlifyError(createSiteResponse);
          return json(
            { error: `Failed to create site${errorDetail ? `: ${errorDetail}` : ''}` },
            { status: createSiteResponse.status },
          );
        }

        const newSite = (await createSiteResponse.json()) as any;
        targetSiteId = newSite.id;
        siteInfo = {
          id: newSite.id,
          name: newSite.name,
          url: newSite.url,
          chatId,
        };
      }
    }

    // Create file digests
    const fileDigests: Record<string, string> = {};

    for (const [filePath, content] of Object.entries(files)) {
      const normalizedPath = filePath.startsWith('/') ? filePath : '/' + filePath;
      const isBinary = /\.(png|jpg|jpeg|gif|webp|ico|bmp|mp3|mp4|wav|woff|woff2|ttf|eot)$/i.test(normalizedPath);
      const contentToHash = isBinary ? Buffer.from(content as string, 'base64') : content;
      const hash = crypto.createHash('sha1').update(contentToHash).digest('hex');
      fileDigests[normalizedPath] = hash;
    }

    // Create a new deploy with digests
    const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: fileDigests,
        async: true,
        skip_processing: false,
        draft: false,
        function_schedules: [],
        framework: null,
      }),
    });

    if (!deployResponse.ok) {
      const errorDetail = await readNetlifyError(deployResponse);
      return json(
        { error: `Failed to create deployment${errorDetail ? `: ${errorDetail}` : ''}` },
        { status: deployResponse.status },
      );
    }

    const deploy = (await deployResponse.json()) as any;

    // Poll for up to ~20 seconds (safe within Vercel's 30s default limit)
    // to wait for the deploy to reach 'prepared' so we can upload files.
    const MAX_WAIT_MS = 20_000;
    const POLL_INTERVAL_MS = 2_000;
    const startTime = Date.now();
    let filesUploaded = false;

    while (Date.now() - startTime < MAX_WAIT_MS) {
      const statusResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys/${deploy.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!statusResponse.ok) {
        const errorDetail = await readNetlifyError(statusResponse);
        return json(
          { error: `Failed to check deployment status${errorDetail ? `: ${errorDetail}` : ''}` },
          { status: statusResponse.status },
        );
      }

      const status = (await statusResponse.json()) as any;

      if (!filesUploaded && (status.state === 'prepared' || status.state === 'uploaded')) {
        // Upload all files
        for (const [filePath, content] of Object.entries(files)) {
          const normalizedPath = filePath.startsWith('/') ? filePath : '/' + filePath;
          const encodedPath = normalizedPath
            .split('/')
            .map((segment) => encodeURIComponent(segment))
            .join('/');

          let uploadSuccess = false;
          let uploadRetries = 0;

          const isBinary = /\.(png|jpg|jpeg|gif|webp|ico|bmp|mp3|mp4|wav|woff|woff2|ttf|eot)$/i.test(filePath);
          const bodyContent = isBinary ? Buffer.from(content as string, 'base64') : content;

          while (!uploadSuccess && uploadRetries < 3) {
            try {
              const uploadResponse = await fetch(
                `https://api.netlify.com/api/v1/deploys/${deploy.id}/files${encodedPath}`,
                {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/octet-stream',
                  },
                  body: bodyContent,
                },
              );

              uploadSuccess = uploadResponse.ok;

              if (!uploadSuccess) {
                console.error('Upload failed:', await uploadResponse.text());
                uploadRetries++;
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            } catch (error) {
              console.error('Upload error:', error);
              uploadRetries++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          if (!uploadSuccess) {
            return json({ error: `Failed to upload file ${filePath}` }, { status: 500 });
          }
        }

        filesUploaded = true;
      }

      if (status.state === 'ready') {
        return json({
          success: true,
          deploy: {
            id: status.id,
            state: status.state,
            url: status.ssl_url || status.url,
          },
          site: siteInfo,
        });
      }

      if (status.state === 'error') {
        return json({ error: status.error_message || 'Deploy preparation failed' }, { status: 500 });
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    // Timed out waiting for 'ready', but files are uploaded.
    // Return the deploy ID — the client can check the URL directly.
    // Netlify will finish processing in the background.
    return json({
      success: true,
      deploy: {
        id: deploy.id,
        state: 'processing',
        // Netlify site URL is predictable from the site info
        url: siteInfo?.url || `https://${siteInfo?.name}.netlify.app`,
      },
      site: siteInfo,
    });
  } catch (error) {
    console.error('Deploy error:', error);
    return json({ error: 'Deployment failed' }, { status: 500 });
  }
}
