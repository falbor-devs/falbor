import type { WebContainer } from '@webcontainer/api';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { webcontainer as webcontainerPromise } from '~/lib/webcontainer';
import git, { type GitAuth, type PromiseFsClient } from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

const lookupSavedPassword = (url: string) => {
  const domain = url.split('/')[2];
  const gitCreds = Cookies.get(`git:${domain}`);

  if (!gitCreds) {
    return null;
  }

  try {
    const { username, password } = JSON.parse(gitCreds || '{}');
    return { username, password };
  } catch (error) {
    console.log(`Failed to parse Git Cookie ${error}`);
    return null;
  }
};

const saveGitAuth = (url: string, auth: GitAuth) => {
  const domain = url.split('/')[2];
  Cookies.set(`git:${domain}`, JSON.stringify(auth));
};

export function useGit() {
  const [ready, setReady] = useState(false);
  const [webcontainer, setWebcontainer] = useState<WebContainer>();
  const [fs, setFs] = useState<PromiseFsClient>();
  const fileData = useRef<Record<string, { data: any; encoding?: string }>>({});
  useEffect(() => {
    webcontainerPromise.then((container) => {
      fileData.current = {};
      setWebcontainer(container);
      setFs(getFs(container, fileData));
      setReady(true);
    });
  }, []);

  const gitClone = useCallback(
    async (url: string, retryCount = 0) => {
      if (!webcontainer || !fs || !ready) {
        throw new Error('Webcontainer not initialized. Please try again later.');
      }

      fileData.current = {};

      let branch: string | undefined;
      let baseUrl = url;

      if (url.includes('#')) {
        [baseUrl, branch] = url.split('#');
      }
      const headers: {
        [x: string]: string;
      } = {
        'User-Agent': 'falbor',
      };

      const auth = lookupSavedPassword(url);

      if (auth) {
        headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
      }
      const githubToken = process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN;
      const isGitHubUrl = baseUrl.includes('github.com');

      if (isGitHubUrl && githubToken && !githubToken.startsWith('your_') && !headers.Authorization) {
        headers.Authorization = `Bearer ${githubToken}`;
      }

      try {
        if (retryCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
          console.log(`Retrying git clone (attempt ${retryCount + 1})...`);
        }

        await git.clone({
          fs,
          http,
          dir: webcontainer.workdir,
          url: baseUrl,
          depth: 1,
          singleBranch: true,
          ref: branch,
          corsProxy: '/api/git-proxy',
          headers,
          onProgress: (event) => {
            console.log('Git clone progress:', event);
          },
          onAuth: (authUrl) => {
            const saved = lookupSavedPassword(authUrl);

            if (saved) {
              console.log('Using saved authentication for', authUrl);
              return saved;
            }
            const ghToken = process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN;

            if (authUrl.includes('github.com') && ghToken && !ghToken.startsWith('your_')) {
              return { username: 'oauth2', password: ghToken };
            }
            console.log('Repository requires authentication:', authUrl);

            if (confirm('This repository requires authentication. Would you like to enter your GitHub credentials?')) {
              const enteredAuth = {
                username: prompt('Enter username') || '',
                password: prompt('Enter password or personal access token') || '',
              };
              return enteredAuth;
            } else {
              return { cancel: true };
            }
          },
          onAuthFailure: (baseUrl, _auth) => {
            console.error(`Authentication failed for ${baseUrl}`);
            toast.error(
              `Authentication failed for ${baseUrl.split('/')[2]}. Please check your credentials and try again.`,
            );
            throw new Error(
              `Authentication failed for ${baseUrl.split('/')[2]}. Please check your credentials and try again.`,
            );
          },
          onAuthSuccess: (baseUrl, auth) => {
            console.log(`Authentication successful for ${baseUrl}`);
            saveGitAuth(baseUrl, auth);
          },
        });

        const data: Record<string, { data: any; encoding?: string }> = {};

        for (const [key, value] of Object.entries(fileData.current)) {
          data[key] = value;
        }

        return { workdir: webcontainer.workdir, data };
      } catch (error) {
        console.error('Git clone error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Authentication failed')) {
          toast.error(`Authentication failed. Please check your GitHub credentials and try again.`);
          throw error;
        } else if (
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('ECONNREFUSED')
        ) {
          toast.error(`Network error while connecting to repository. Please check your internet connection.`);
          if (retryCount < 3) {
            return gitClone(url, retryCount + 1);
          }

          throw new Error(
            `Failed to connect to repository after multiple attempts. Please check your internet connection.`,
          );
        } else if (errorMessage.includes('404')) {
          toast.error(`Repository not found. Please check the URL and make sure the repository exists.`);
          throw new Error(`Repository not found. Please check the URL and make sure the repository exists.`);
        } else if (errorMessage.includes('401')) {
          toast.error(`Unauthorized access to repository. Please connect your GitHub account with proper permissions.`);
          throw new Error(
            `Unauthorized access to repository. Please connect your GitHub account with proper permissions.`,
          );
        } else {
          toast.error(`Failed to clone repository: ${errorMessage}`);
          throw error;
        }
      }
    },
    [webcontainer, fs, ready],
  );

  return { ready, gitClone };
}

const getFs = (
  webcontainer: WebContainer,
  record: MutableRefObject<Record<string, { data: any; encoding?: string }>>,
) => ({
  promises: {
    readFile: async (path: string, options: any) => {
      const encoding = options?.encoding;
      const relativePath = pathUtils.relative(webcontainer.workdir, path);

      try {
        const result = await webcontainer.fs.readFile(relativePath, encoding);

        return result;
      } catch (error) {
        throw error;
      }
    },
    writeFile: async (path: string, data: any, options: any = {}) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);

      if (record.current) {
        record.current[relativePath] = { data, encoding: options?.encoding };
      }

      try {
        if (data instanceof Uint8Array) {
          const result = await webcontainer.fs.writeFile(relativePath, data);
          return result;
        } else {
          const encoding = options?.encoding || 'utf8';
          const result = await webcontainer.fs.writeFile(relativePath, data, encoding);

          return result;
        }
      } catch (error) {
        throw error;
      }
    },
    mkdir: async (path: string, options: any) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);

      try {
        const result = await webcontainer.fs.mkdir(relativePath, { ...options, recursive: true });

        return result;
      } catch (error) {
        throw error;
      }
    },
    readdir: async (path: string, options: any) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);

      try {
        const result = await webcontainer.fs.readdir(relativePath, options);

        return result;
      } catch (error) {
        throw error;
      }
    },
    rm: async (path: string, options: any) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);

      try {
        const result = await webcontainer.fs.rm(relativePath, { ...(options || {}) });

        return result;
      } catch (error) {
        throw error;
      }
    },
    rmdir: async (path: string, options: any) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);

      try {
        const result = await webcontainer.fs.rm(relativePath, { recursive: true, ...options });

        return result;
      } catch (error) {
        throw error;
      }
    },
    unlink: async (path: string) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);

      try {
        return await webcontainer.fs.rm(relativePath, { recursive: false });
      } catch (error) {
        throw error;
      }
    },
    stat: async (path: string) => {
      try {
        const relativePath = pathUtils.relative(webcontainer.workdir, path);
        const dirPath = pathUtils.dirname(relativePath);
        const fileName = pathUtils.basename(relativePath);
        if (relativePath === '.git/index') {
          return {
            isFile: () => true,
            isDirectory: () => false,
            isSymbolicLink: () => false,
            size: 12,
            mode: 0o100644,
            mtimeMs: Date.now(),
            ctimeMs: Date.now(),
            birthtimeMs: Date.now(),
            atimeMs: Date.now(),
            uid: 1000,
            gid: 1000,
            dev: 1,
            ino: 1,
            nlink: 1,
            rdev: 0,
            blksize: 4096,
            blocks: 1,
            mtime: new Date(),
            ctime: new Date(),
            birthtime: new Date(),
            atime: new Date(),
          };
        }

        const resp = await webcontainer.fs.readdir(dirPath, { withFileTypes: true });
        const fileInfo = resp.find((x) => x.name === fileName);

        if (!fileInfo) {
          const err = new Error(`ENOENT: no such file or directory, stat '${path}'`) as NodeJS.ErrnoException;
          err.code = 'ENOENT';
          err.errno = -2;
          err.syscall = 'stat';
          err.path = path;
          throw err;
        }

        return {
          isFile: () => fileInfo.isFile(),
          isDirectory: () => fileInfo.isDirectory(),
          isSymbolicLink: () => false,
          size: fileInfo.isDirectory() ? 4096 : 1,
          mode: fileInfo.isDirectory() ? 0o040755 : 0o100644,
          mtimeMs: Date.now(),
          ctimeMs: Date.now(),
          birthtimeMs: Date.now(),
          atimeMs: Date.now(),
          uid: 1000,
          gid: 1000,
          dev: 1,
          ino: 1,
          nlink: 1,
          rdev: 0,
          blksize: 4096,
          blocks: 8,
          mtime: new Date(),
          ctime: new Date(),
          birthtime: new Date(),
          atime: new Date(),
        };
      } catch (error: any) {
        if (!error.code) {
          error.code = 'ENOENT';
          error.errno = -2;
          error.syscall = 'stat';
          error.path = path;
        }

        throw error;
      }
    },
    lstat: async (path: string) => {
      return await getFs(webcontainer, record).promises.stat(path);
    },
    readlink: async (path: string) => {
      throw new Error(`EINVAL: invalid argument, readlink '${path}'`);
    },
    symlink: async (target: string, path: string) => {
      throw new Error(`EPERM: operation not permitted, symlink '${target}' -> '${path}'`);
    },

    chmod: async (_path: string, _mode: number) => {
      return await Promise.resolve();
    },
  },
});

const pathUtils = {
  dirname: (path: string) => {
    if (!path || !path.includes('/')) {
      return '.';
    }
    path = path.replace(/\/+$/, '');
    return path.split('/').slice(0, -1).join('/') || '/';
  },

  basename: (path: string, ext?: string) => {
    path = path.replace(/\/+$/, '');
    const base = path.split('/').pop() || '';
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }

    return base;
  },
  relative: (from: string, to: string): string => {
    if (!from || !to) {
      return '.';
    }
    const normalizePathParts = (p: string) => p.replace(/\/+$/, '').split('/').filter(Boolean);

    const fromParts = normalizePathParts(from);
    const toParts = normalizePathParts(to);
    let commonLength = 0;
    const minLength = Math.min(fromParts.length, toParts.length);

    for (let i = 0; i < minLength; i++) {
      if (fromParts[i] !== toParts[i]) {
        break;
      }

      commonLength++;
    }
    const upCount = fromParts.length - commonLength;
    const remainingPath = toParts.slice(commonLength);
    const relativeParts = [...Array(upCount).fill('..'), ...remainingPath];
    return relativeParts.length === 0 ? '.' : relativeParts.join('/');
  },
};
