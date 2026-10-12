'use client';

import { useRouter } from 'next/navigation';
import { SetupButton } from '~/components/ui/setup/SetupButton';

export function MarketerOnboardingContent() {
  const router = useRouter();

  return (
    <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 xl:px-32 relative z-10">
      <div className="mb-12">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-6 shadow-inner">
          <div className="i-ph:megaphone text-blue-600 dark:text-blue-400 w-6 h-6" />
        </div>
        <h1 className="text-[2.5rem] leading-tight font-semibold tracking-tight text-gray-900 dark:text-white mb-4">
          Welcome, Marketer
        </h1>
        <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-400 mb-8 max-w-md">
          You're one step away from being discoverable by businesses on Falbor. Let's build your marketer profile.
        </p>

        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
          Your profile will include:
        </p>
        <ul className="space-y-3 mb-10">
          <li className="flex items-center text-[15px] text-gray-700 dark:text-gray-300">
            <div className="i-ph:check text-gray-900 dark:text-gray-100 w-4 h-4 mr-3" />
            Your name, photo, and bio
          </li>
          <li className="flex items-center text-[15px] text-gray-700 dark:text-gray-300">
            <div className="i-ph:check text-gray-900 dark:text-gray-100 w-4 h-4 mr-3" />
            Years of experience and specialties
          </li>
          <li className="flex items-center text-[15px] text-gray-700 dark:text-gray-300">
            <div className="i-ph:check text-gray-900 dark:text-gray-100 w-4 h-4 mr-3" />
            Contact details you control sharing
          </li>
        </ul>

        <SetupButton
          onClick={() => router.push('/b2b/profile-setup')}
          icon={<div className="i-ph:arrow-right w-4 h-4" />}
        >
          Set Up My Marketer Profile
        </SetupButton>
      </div>
    </div>
  );
}
