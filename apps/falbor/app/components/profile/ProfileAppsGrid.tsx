'use client';

import { useState } from 'react';
import { EditAppModal } from './EditAppModal';
import { classNames } from '~/utils/classNames';
import { Card } from '~/components/ui/Card';

interface ProfileApp {
  chatId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  url: string;
}

interface ProfileAppsGridProps {
  apps: ProfileApp[];
  isCurrentUser?: boolean;
}

export function ProfileAppsGrid({ apps, isCurrentUser }: ProfileAppsGridProps) {
  const [editingApp, setEditingApp] = useState<ProfileApp | null>(null);

  if (!apps || apps.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app) => (
          <Card
            key={app.chatId}
            className="group relative overflow-hidden flex flex-col hover:border-purple-500/50 transition-colors"
          >
            {}
            <a 
              href={app.url} 
              target="_blank" 
              rel="noreferrer"
              className="flex-1 flex flex-col cursor-pointer"
            >
              <div className="h-40 bg-falbor-elements-background-depth-2 flex items-center justify-center relative overflow-hidden border-b border-falbor-elements-borderColor">
                {app.imageUrl ? (
                  <img src={app.imageUrl} alt={app.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="i-ph:app-window text-4xl text-falbor-elements-textTertiary" />
                )}
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-falbor-elements-textPrimary truncate">
                  {app.title}
                </h4>
                <p className="text-sm text-falbor-elements-textSecondary truncate mt-1">
                  {app.description || 'updated recently'}
                </p>
              </div>
            </a>

            {}
            {isCurrentUser && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setEditingApp(app);
                }}
                className="absolute top-2 right-2 bg-falbor-elements-background-depth-1 hover:bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-falbor-elements-borderColor"
                title="Edit App Details"
              >
                <div className="i-ph:pencil-simple w-4 h-4" />
              </button>
            )}
          </Card>
        ))}
      </div>

      <EditAppModal app={editingApp} onClose={() => setEditingApp(null)} />
    </div>
  );
}
