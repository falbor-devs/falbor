'use client';

import React from 'react';
import { B2BSidebar } from './B2BSidebar';
import { B2BDashboardContent } from './B2BDashboardContent';

interface MarketerDashboardClientProps {
  profile: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
  };
}

export function MarketerDashboardClient({ profile }: MarketerDashboardClientProps) {
  return (
    <div className="flex min-h-screen bg-[#F9FAFB] dark:bg-[#09090B] text-zinc-900 dark:text-white font-sans">
      <B2BSidebar profile={profile} />
      <B2BDashboardContent profile={profile} />
    </div>
  );
}
