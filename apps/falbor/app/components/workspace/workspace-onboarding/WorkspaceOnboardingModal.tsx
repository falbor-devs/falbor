'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateWorkspaceOnboarding } from '~/lib/actions/workspaces';
import { DialogRoot, Dialog } from '~/components/ui/Dialog';

import { GithubTab } from './tabs/GithubTab';
import { ZipUploadTab } from './tabs/ZipUploadTab';
import { UrlImportTab } from './tabs/UrlImportTab';
import { AiExtractionTab } from './tabs/AiExtractionTab';
import { NewSaasBusinessTab } from './tabs/NewSaasBusinessTab';

interface WorkspaceOnboardingModalProps {
  workspaceId: string;
}

export function WorkspaceOnboardingModal({ workspaceId }: WorkspaceOnboardingModalProps) {
  const router = useRouter();
  const [businessMode, setBusinessMode] = useState<'existing' | 'new' | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>('github');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [urlVerified, setUrlVerified] = useState(false);
  const [githubRepoSelected, setGithubRepoSelected] = useState<{ url: string, branch?: string } | null>(null);

  // Step 2 State
  const [step, setStep] = useState<1 | 2>(1);
  const [promptContent, setPromptContent] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [businessGoal, setBusinessGoal] = useState('');

  const options = [
    {
      id: 'github',
      title: 'Import from GitHub',
      icon: 'i-ph:github-logo',
      image: '/icons/github.png',
    },
    {
      id: 'zip',
      title: 'Upload code zip',
      icon: 'i-ph:file-zip',
    },
    {
      id: 'url',
      title: 'Scan by URL',
      icon: 'i-ph:link',
    },
  ];

  const isValidPublicUrl = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      if (url.protocol !== 'https:') return false;
      if (url.hostname === 'localhost' || url.hostname.startsWith('127.')) return false;
      if (!url.hostname.includes('.')) return false;
      return true;
    } catch {
      return false;
    }
  };

  const canProceed = () => {
    if (businessMode === 'new') return businessGoal.trim().length >= 10;
    if (businessMode !== 'existing') return false;
    if (selectedOption === 'github' && githubRepoSelected) return true;
    if (selectedOption === 'url' && isValidPublicUrl(websiteUrl) && urlVerified) return true;
    if (selectedOption === 'zip' && uploadFile) return true;
    return false;
  };

  const handleNext = async () => {
    if (businessMode === 'new') {
      if (!canProceed()) return;
      setIsSubmitting(true);
      try {
        await updateWorkspaceOnboarding(workspaceId, undefined, { businessMode: 'new', businessGoal });
        router.refresh();
        window.location.reload();
      } catch (e) {
        console.error('Failed to initialize new SaaS workspace:', e);
        setIsSubmitting(false);
      }
      return;
    }

    if (step === 1) {
      if (!canProceed()) return;
      setStep(2);
      setIsAiProcessing(true);
      return;
    }

    if (step === 2) {
      setIsSubmitting(true);
      try {
        await updateWorkspaceOnboarding(workspaceId, promptContent, { businessMode: 'existing' });
        router.refresh();
        window.location.reload();
      } catch (e) {
        console.error('Failed to update workspace onboarding:', e);
        setIsSubmitting(false);
      }
    }
  };

  const renderContent = () => {
    switch (selectedOption) {
      case 'github':
        return <GithubTab githubRepoSelected={githubRepoSelected} setGithubRepoSelected={setGithubRepoSelected} />;
      case 'zip':
        return <ZipUploadTab uploadFile={uploadFile} setUploadFile={setUploadFile} />;
      case 'url':
        return (
          <UrlImportTab
            websiteUrl={websiteUrl}
            setWebsiteUrl={setWebsiteUrl}
            urlVerified={urlVerified}
            setUrlVerified={setUrlVerified}
            isValidPublicUrl={isValidPublicUrl}
          />
        );
      default:
        return null;
    }
  };

  return (
    <DialogRoot open={true} onOpenChange={() => {}}>
      <Dialog showCloseButton={false} className="!w-[1000px] !max-w-[1000px] !h-[700px] p-0 overflow-hidden">
        {businessMode === null ? (
          <div className="flex min-h-[700px] w-full flex-col bg-gray-50 p-8 dark:bg-[#111114]">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">How do you want to use this workspace?</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Choose the path that matches your business today.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setBusinessMode('existing')}
                  className="rounded-2xl border border-gray-200 bg-white p-6 text-left transition-colors hover:border-[#0099ff] dark:border-[#353538] dark:bg-[#1C1D21]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0099ff]/10 text-xl text-[#0099ff]"><div className="i-ph:link" /></div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">I already have a SaaS business</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">Connect your GitHub repository, code archive, or live website.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessMode('new')}
                  className="rounded-2xl border border-gray-200 bg-white p-6 text-left transition-colors hover:border-[#0099ff] dark:border-[#353538] dark:bg-[#1C1D21]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0099ff]/10 text-xl text-[#0099ff]"><div className="i-ph:rocket-launch" /></div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">I want to start a SaaS business</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">Share your direction and let Falbor research a realistic opportunity.</p>
                </button>
              </div>
            </div>
          </div>
        ) : businessMode === 'new' ? (
          <div className="flex h-full flex-col">
            <NewSaasBusinessTab goal={businessGoal} setGoal={setBusinessGoal} />
            <div className="flex justify-between border-t border-gray-200 bg-gray-50 px-8 py-4 dark:border-[#353538] dark:bg-[#111114]">
              <button type="button" onClick={() => setBusinessMode(null)} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-[#1C1D21]">Back</button>
              <button type="button" onClick={handleNext} disabled={!canProceed() || isSubmitting} className={`rounded-lg px-8 py-2 text-sm font-medium transition-colors ${canProceed() && !isSubmitting ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black' : 'cursor-not-allowed bg-[#0099ff]/10 text-[#0099ff]'}`}>{isSubmitting ? 'Starting research...' : 'Start research'}</button>
            </div>
          </div>
        ) : step === 1 ? (
          <div className="flex flex-col md:flex-row w-full h-full min-h-[700px]">
            {/* Left Sidebar */}
            <div className="w-full md:w-[280px] p-6 flex flex-col shrink-0 bg-gray-50 dark:bg-[#111114]">
              <div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connect Workspace</h2><button type="button" onClick={() => setBusinessMode(null)} className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Back</button></div>
              <div className="flex-1 flex flex-col gap-2">
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOption(option.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${selectedOption === option.id
                      ? 'bg-blue-50 dark:bg-[#0099ff]/20 text-[#0099ff] shadow-sm'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/80 dark:hover:bg-[#1C1D21]/50'
                      }`}
                  >
                    {option.image ? (
                      <img src={option.image} alt={option.title} className="w-6 h-6 object-contain" />
                    ) : (
                      <div className={`${option.icon} text-lg ${selectedOption === option.id ? 'text-[#0099ff]' : ''}`} />
                    )}
                    {option.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col py-3 mr-3 bg-gray-50 dark:bg-[#111114]">
              <div className="flex-1 flex flex-col p-8 overflow-hidden bg-white dark:bg-[#1C1D21] rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-transparent">
                <div className="flex-1 overflow-y-auto pr-2 flex flex-col">
                  {renderContent()}
                </div>

                <div className="mt-8 pt-6 flex justify-end shrink-0">
                  <button
                    onClick={handleNext}
                    disabled={!canProceed() || isSubmitting}
                    className={`px-8 py-1.5 rounded-lg font-medium transition-colors shadow-sm ${canProceed() && !isSubmitting
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-gray-200'
                      : 'bg-[#0099ff]/10 text-[#0099ff] cursor-not-allowed'
                      }`}
                  >
                    {isSubmitting ? 'Saving...' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <AiExtractionTab
            isAiProcessing={isAiProcessing}
            setIsAiProcessing={setIsAiProcessing}
            promptContent={promptContent}
            setPromptContent={setPromptContent}
            isSubmitting={isSubmitting}
            handleNext={handleNext}
            url={selectedOption === 'url' ? websiteUrl : undefined}
            githubRepo={selectedOption === 'github' ? githubRepoSelected?.url : undefined}
          />
        )}
      </Dialog>
    </DialogRoot>
  );
}
