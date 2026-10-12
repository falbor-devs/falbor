'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DialogRoot, Dialog } from '~/components/ui/Dialog';
import { RichTextEditor } from '~/components/ui/RichTextEditor';
import { getWorkspaceById, updateWorkspaceOnboarding } from '~/lib/actions/workspaces';
import { Badge } from '~/components/ui';

import SocialConnectionTab from '~/components/@settings/tabs/social/SocialConnectionTab';
import MembersTab from './Members/MembersTab';
import SubscriptionTab from './SubscriptionTab';
import { DeveloperTab } from './DeveloperTab';

interface WorkspaceSettingsModalProps {
  workspaceId: string;
  onClose: () => void;
  isOpen: boolean;
  defaultTab?: string;
}

export function WorkspaceSettingsModal({ workspaceId, onClose, isOpen, defaultTab = 'knowledge' }: WorkspaceSettingsModalProps) {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<string>(defaultTab);
  const [promptContent, setPromptContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userTier, setUserTier] = useState<string>('free');

  useEffect(() => {
    if (isOpen) {
      if (defaultTab) setSelectedOption(defaultTab);
      setIsLoading(true);

      fetch('/api/user/credits')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.subscriptionTier) {
            setUserTier(d.subscriptionTier.toLowerCase());
          }
        })
        .catch(() => { });

      getWorkspaceById(workspaceId).then((workspace) => {
        if (workspace?.contextPrompt) {
          setPromptContent(workspace.contextPrompt);
        }
        setIsLoading(false);
      });
    }
  }, [workspaceId, isOpen, defaultTab]);

  const isPowerOrBusiness = userTier === 'power' || userTier === 'business';

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateWorkspaceOnboarding(workspaceId, promptContent);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const options = [
    {
      id: 'knowledge',
      title: 'Knowledge',
      icon: 'i-ph:brain',
    },
    {
      id: 'members',
      title: 'Members',
      icon: 'i-ph:users',
      badge: !isPowerOrBusiness ? 'Power +' : undefined,
      requiresPower: !isPowerOrBusiness,
    },
    {
      id: 'social-connection',
      title: 'Social Connection',
      icon: 'i-ph:share-network',
    },
    {
      id: 'developer',
      title: 'Developer',
      icon: 'i-ph:code',
    },
    {
      id: 'subscription',
      title: 'Subscription',
      icon: 'i-ph:credit-card',
    },
  ];

  const handleSelectOption = (option: typeof options[0]) => {
    setSelectedOption(option.id);
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog showCloseButton={true} onClose={onClose} className="!w-[90vw] !max-w-[1400px] !h-[88vh] !max-h-[900px] p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row w-full h-full min-h-0">
          <div className="w-full md:w-[280px] p-6 flex flex-col shrink-0 bg-gray-50 dark:bg-[#111114]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 px-1">Workspace Settings</h2>
            <div className="flex-1 flex flex-col gap-2">
              {options.map((option) => {
                const isLockedMembers = option.id === 'members' && option.requiresPower;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(option)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${isLockedMembers ? 'cursor-not-allowed' : ''
                      } ${selectedOption === option.id
                        ? 'bg-blue-50 dark:bg-[#0099ff]/20 text-[#0099ff] shadow-sm'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/70 dark:hover:bg-[#1C1D21]'
                      }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`${option.icon} text-xl ${selectedOption === option.id ? 'text-[#0099ff]' : ''}`} />
                      <span>{option.title}</span>
                    </div>
                    {option.badge && (
                      <Badge className="bg-[#0099ff]/20 rounded-md text-[#0099ff] text-[10px] px-1.5 py-0.5 ml-2">
                        {option.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 flex flex-col p-4 bg-gray-50 dark:bg-[#111114] overflow-hidden">
            <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white dark:bg-[#1C1D21] rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-transparent">
              {selectedOption === 'knowledge' ? (
                <>
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Project Knowledge</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Review and edit the AI-generated context for your workspace.
                      </p>
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={isLoading || isSubmitting}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors shadow-sm ${!isLoading && !isSubmitting
                        ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200'
                        : 'bg-gray-100 text-gray-400 dark:bg-[#2B2D31] dark:text-gray-600 cursor-not-allowed'
                        }`}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden rounded-lg relative">
                    {isLoading ? (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        Loading knowledge...
                      </div>
                    ) : (
                      <RichTextEditor
                        value={promptContent}
                        onChange={setPromptContent}
                      />
                    )}
                  </div>
                </>
              ) : selectedOption === 'members' ? (
                !isPowerOrBusiness ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="p-4 rounded-full bg-[#E1DFE3]">
                      <div className="i-ph:lock-key-duotone w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold dark:text-white">
                      Workspace Members Feature Locked
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                      Adding and managing workspace team members requires a <strong className="text-[#0099ff]">Power</strong> or <strong className="text-[#0099ff]">Business</strong> plan (Power Plus).
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        if (workspaceId) {
                          router.push(`/workspace/${workspaceId}/upgrade?highlight=power_business`);
                        } else {
                          router.push('/upgrade?highlight=power_business');
                        }
                      }}
                      className="px-6 py-2.5 bg-[#0099ff]/20 hover:bg-[#0099ff]/30 text-[#0099ff] rounded-md text-sm font-semibold transition-all"
                    >
                      Upgrade to Power or Business
                    </button>
                  </div>
                ) : (
                  <MembersTab workspaceId={workspaceId} />
                )
              ) : selectedOption === 'social-connection' ? (
                <SocialConnectionTab />
              ) : selectedOption === 'developer' ? (
                <DeveloperTab workspaceId={workspaceId} />
              ) : selectedOption === 'subscription' ? (
                <SubscriptionTab />
              ) : null}

            </div>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}