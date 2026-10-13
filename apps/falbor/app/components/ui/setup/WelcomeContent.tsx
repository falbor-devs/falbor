'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SetupButton } from './SetupButton';

import { createWorkspace, getLastUsedWorkspace } from '~/lib/actions/workspaces';
import { toast } from 'react-toastify';

export function WelcomeContent() {
  const router = useRouter();
  const [loadingRoute, setLoadingRoute] = useState<'org' | 'chat' | null>(null);

  const handleRoute = async (route: string, type: 'org' | 'chat') => {
    setLoadingRoute(type);
    
    if (type === 'chat') {
      try {
        const existing = await getLastUsedWorkspace();
        const workspaceId = existing?.id ?? (await createWorkspace("Untitled Workspace"));
        router.push(`/workspace/${workspaceId}`);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "You are on the free plan; you cannot create a workspace.");
        setLoadingRoute(null);
      }
      return;
    }

    router.push(route);
  };

  return (
    <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 xl:px-32 relative z-10">
      <div className="mb-12">
        <h1 className="text-[2.5rem] leading-tight font-semibold tracking-tight text-gray-900 dark:text-white mb-4">
          Welcome to Falbor
        </h1>
        <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-400 mb-8 max-w-md">
          What would you like to do today? Start managing your telemetry or jump straight into our AI website builder.
        </p>

        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
          Why use the Organization Dashboard:
        </p>
        <ul className="space-y-3 mb-10">
          <li className="flex items-center text-[15px] text-gray-700 dark:text-gray-300">
            <div className="i-ph:check text-gray-900 dark:text-gray-100 w-4 h-4 mr-3" />
            Manage multiple projects in one place
          </li>
          <li className="flex items-center text-[15px] text-gray-700 dark:text-gray-300">
            <div className="i-ph:check text-gray-900 dark:text-gray-100 w-4 h-4 mr-3" />
            Real-time error tracking and telemetry
          </li>
          <li className="flex items-center text-[15px] text-gray-700 dark:text-gray-300">
            <div className="i-ph:check text-gray-900 dark:text-gray-100 w-4 h-4 mr-3" />
            Monitor staging and production environments
          </li>
        </ul>

        <div className="flex items-center gap-6">
          <SetupButton
            onClick={() => handleRoute('/workspace/org-setup', 'org')}
            icon={<div className="i-ph:buildings w-4 h-4" />}
            isLoading={loadingRoute === 'org'}
          >
            Organization Dashboard
          </SetupButton>

          <SetupButton 
            variant="secondary" 
            onClick={() => handleRoute('/', 'chat')}
            isLoading={loadingRoute === 'chat'}
          >
            Build a website
          </SetupButton>
        </div>

        <div className="mt-8 flex items-start gap-2 text-gray-500 dark:text-gray-500">
          <div className="i-ph:info mt-0.5 w-4 h-4" />
          <p className="text-[13px]">
            You can always switch between the two later.
          </p>
        </div>
      </div>
    </div>
  );
}
