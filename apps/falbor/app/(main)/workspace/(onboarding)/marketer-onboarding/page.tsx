'use client';

import { WelcomeHeader } from '~/components/ui/setup/WelcomeHeader';
import { MarketerOnboardingContent } from '~/components/marketer/MarketerOnboardingContent';

export default function MarketerOnboardingPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white dark:bg-[#09090b] font-sans text-gray-900 dark:text-gray-100 overflow-hidden">
      <WelcomeHeader />
      <div className="flex flex-1 w-full max-w-7xl mx-auto items-center pt-20">
        <MarketerOnboardingContent />
      </div>
    </div>
  );
}
