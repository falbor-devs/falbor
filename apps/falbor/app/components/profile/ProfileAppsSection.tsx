'use client';

import { useState } from 'react';
import { ProfileAppsGrid } from './ProfileAppsGrid';
import { ManageAppsModal } from './ManageAppsModal';
import { Button } from '~/components/ui/Button';

interface ProfileApp {
  chatId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  url: string;
}

interface ProfileAppsSectionProps {
  apps: ProfileApp[];
  isCurrentUser?: boolean;
}

export function ProfileAppsSection({ apps, isCurrentUser }: ProfileAppsSectionProps) {
  const [manageOpen, setManageOpen] = useState(false);

  
  if ((!apps || apps.length === 0) && !isCurrentUser) {
    return null;
  }

  return (
    <div className="mb-10 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-falbor-elements-textPrimary">
          Websites ({apps?.length || 0})
        </h3>

        {isCurrentUser && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setManageOpen(true)}
          >
            Manage websites
          </Button>
        )}
      </div>

      <ProfileAppsGrid apps={apps || []} isCurrentUser={isCurrentUser} />

      {isCurrentUser && (
        <ManageAppsModal open={manageOpen} onOpenChange={setManageOpen} />
      )}
    </div>
  );
}
