'use client';

import ignore from 'ignore';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useGit } from '~/lib/hooks/useGit';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { toast } from 'react-toastify';
import { detectProjectCommands, createCommandsMessage, escapeFalborTags } from '~/utils/projectCommands';
import { generateId } from '~/utils/fileUtils';
import * as chatApi from '~/lib/api/data/chat';
import type { Message } from 'ai';


const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '.github/**',
  '.vscode/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/*lock.yaml',
];

const ig = ignore().add(IGNORE_PATTERNS);
const MAX_FILE_SIZE = 100 * 1024;
const MAX_TOTAL_SIZE = 500 * 1024;

type CloneStatus = 'idle' | 'cloning' | 'importing' | 'success' | 'error';

import { startWebContainer } from '~/lib/webcontainer';

export default function GitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-falbor-elements-background-depth-1"><div className="i-svg-spinners:90-ring-with-bg text-4xl text-accent-500"></div></div>}>
      <GitPageContent />
    </Suspense>
  );
}

function GitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ repo?: string[] }>();

  let repoUrl = searchParams.get('url') ?? '';
  
  if (!repoUrl && params?.repo?.length) {
    repoUrl = `https://${params.repo.join('/')}`;
  }

  const { ready, gitClone } = useGit();

  const [status, setStatus] = useState<CloneStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    startWebContainer();
  }, []);

  useEffect(() => {
    if (!repoUrl) {
      toast.error('No repository URL provided.');
      router.replace('/');
      return;
    }

    if (!ready || status !== 'idle') return;

    let cancelled = false;

    const run = async () => {
      setStatus('cloning');

      
      const ticker = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 6, 80));
      }, 400);

      try {
        
        const { workdir, data } = await gitClone(repoUrl);

        if (cancelled) { clearInterval(ticker); return; }

        setProgress(82);
        setStatus('importing');

        
        const filePaths = Object.keys(data).filter((fp) => !ig.ignores(fp));
        const textDecoder = new TextDecoder('utf-8');

        let totalSize = 0;
        const skippedFiles: string[] = [];
        const fileContents: { path: string; content: string }[] = [];

        for (const filePath of filePaths) {
          const { data: content, encoding } = data[filePath];

          
          if (
            content instanceof Uint8Array &&
            !filePath.match(/\.(txt|md|astro|mjs|js|jsx|ts|tsx|json|html|css|scss|less|yml|yaml|xml|svg|vue|svelte)$/i)
          ) {
            skippedFiles.push(filePath);
            continue;
          }

          try {
            const textContent =
              encoding === 'utf8'
                ? content
                : content instanceof Uint8Array
                ? textDecoder.decode(content)
                : '';

            if (!textContent) continue;

            const fileSize = new TextEncoder().encode(textContent).length;

            if (fileSize > MAX_FILE_SIZE) {
              skippedFiles.push(`${filePath} (too large: ${Math.round(fileSize / 1024)}KB)`);
              continue;
            }

            if (totalSize + fileSize > MAX_TOTAL_SIZE) {
              skippedFiles.push(`${filePath} (would exceed total size limit)`);
              continue;
            }

            totalSize += fileSize;
            fileContents.push({ path: filePath, content: textContent as string });
          } catch (e: any) {
            skippedFiles.push(`${filePath} (error: ${e.message})`);
          }
        }

        setProgress(90);

        
        const commands = await detectProjectCommands(fileContents);
        const commandsMessage = createCommandsMessage(commands);

        const filesMessage: Message = {
          role: 'assistant',
          content: `Cloning the repo ${repoUrl} into ${workdir}
${
  skippedFiles.length > 0
    ? `\nSkipped files (${skippedFiles.length}):\n${skippedFiles.map((f) => `- ${f}`).join('\n')}`
    : ''
}

<falborArtifact id="imported-files" title="Git Cloned Files" type="bundled">
${fileContents
  .map(
    (file) =>
      `<falborAction type="file" filePath="${file.path}">
${escapeFalborTags(file.content)}
</falborAction>`,
  )
  .join('\n')}
</falborArtifact>`,
          id: generateId(),
          createdAt: new Date(),
        };

        const messages: Message[] = [filesMessage];
        if (commandsMessage) messages.push(commandsMessage);

        setProgress(95);

        
        const projectName = repoUrl.split('/').slice(-1)[0].replace(/\.git$/, '');
        const newId = await chatApi.createChatFromMessages(
          `Git Project: ${projectName}`,
          messages,
          undefined,
        );

        if (cancelled) return;

        setProgress(100);
        setStatus('success');

        
        await new Promise((r) => setTimeout(r, 400));

        window.location.href = `/chat/${newId}`;
      } catch (err) {
        clearInterval(ticker);
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setErrorMsg(message);
        setStatus('error');
      }
    };

    run();

    return () => { cancelled = true; };
    
  }, [ready, repoUrl]);

  const repoName = repoUrl.split('/').pop()?.replace(/\.git$/, '') ?? repoUrl;

  const statusLabel: Record<CloneStatus, string> = {
    idle: 'Preparing…',
    cloning: 'Cloning repository…',
    importing: 'Processing files…',
    success: 'Done! Opening project…',
    error: 'Clone failed',
  };

  return (
    <div className="flex flex-col h-full w-full bg-falbor-elements-background-depth-1">
      <BackgroundRays />
      <Header />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md mx-4 rounded-2xl border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 p-8 shadow-xl text-center">

          {}
          <div className="flex justify-center mb-6">
            {status === 'error' ? (
              <div className="i-ph:warning-circle text-red-400 text-6xl" />
            ) : status === 'success' ? (
              <div className="i-ph:check-circle text-green-400 text-6xl" />
            ) : (
              <div className="i-ph:git-branch text-accent-500 text-6xl animate-pulse" />
            )}
          </div>

          {}
          <h1 className="text-xl font-semibold text-falbor-elements-textPrimary mb-1">
            {statusLabel[status]}
          </h1>

          {}
          <p className="text-sm text-falbor-elements-textSecondary mb-6 truncate" title={repoUrl}>
            {repoName}
          </p>

          {}
          {status !== 'error' && (
            <div className="w-full bg-falbor-elements-background-depth-3 rounded-full h-2 mb-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {}
          {status === 'cloning' && (
            <p className="text-xs text-falbor-elements-textSecondary">
              Fetching files from GitHub…
            </p>
          )}
          {status === 'importing' && (
            <p className="text-xs text-falbor-elements-textSecondary">
              Building your workspace…
            </p>
          )}
          {status === 'success' && (
            <p className="text-xs text-green-400">Redirecting to your new chat…</p>
          )}

          {}
          {status === 'error' && (
            <>
              <p className="text-sm text-red-400 mb-5 break-words">{errorMsg}</p>
              <button
                onClick={() => router.replace('/')}
                className="px-5 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors"
              >
                Back to home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
