'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { profileStore, updateProfile } from '~/lib/stores/profile';
import { classNames } from '~/utils/classNames';
import { DialogRoot, Dialog, DialogTitle, DialogDescription, DialogButton } from '~/components/ui/Dialog';
import { AnimatePresence } from 'framer-motion';

import { useRouter } from 'next/navigation';

interface PublishedApp {
  id: string;
  title: string;
  description: string | null;
  url: string;
  createdAt: string;
}

interface ProfileApp {
  chatId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  url: string;
}

interface ManageAppsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageAppsModal({ open, onOpenChange }: ManageAppsModalProps) {
  const profile = useStore(profileStore);
  const router = useRouter();
  const [publishedApps, setPublishedApps] = useState<PublishedApp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchPublishedApps();
      const currentSelected = new Set((profile.profileApps || []).map((app: ProfileApp) => app.chatId));
      setSelectedIds(currentSelected);
    }
  }, [open, profile.profileApps]);

  const fetchPublishedApps = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/profile/apps');
      if (!res.ok) throw new Error('Failed to fetch apps');
      const data = await res.json();
      setPublishedApps(data.apps || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load published apps');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const existingProfileApps = profile.profileApps || [];
      const newProfileApps: ProfileApp[] = [];

      for (const id of Array.from(selectedIds)) {
        const existingApp = existingProfileApps.find((a: ProfileApp) => a.chatId === id);
        if (existingApp) {
          newProfileApps.push(existingApp);
        } else {
          const publishedApp = publishedApps.find(a => a.id === id);
          if (publishedApp) {
            newProfileApps.push({
              chatId: publishedApp.id,
              title: publishedApp.title || 'Untitled App',
              description: publishedApp.description || 'updated recently',
              url: publishedApp.url,
            });
          }
        }
      }

      updateProfile({ profileApps: newProfileApps });
      
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileApps: newProfileApps }),
      });

      if (!res.ok) throw new Error('Failed to save profile apps');
      
      toast.success('Apps updated successfully');
      router.refresh();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save apps');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog onClose={() => onOpenChange(false)}>
            <div className="p-6">
              <DialogTitle className="mb-2">Manage Apps</DialogTitle>
              <DialogDescription className="mb-6">
                Select the published apps you want to showcase on your profile. Only apps that have been published are listed here.
              </DialogDescription>

              <div className="max-h-[60vh] overflow-y-auto mb-6 pr-2 space-y-2">
                {isLoading && publishedApps.length === 0 ? (
                  <div className="flex justify-center p-8">
                    <div className="i-ph:spinner-gap animate-spin w-6 h-6 text-orange-500" />
                  </div>
                ) : publishedApps.length === 0 ? (
                  <div className="text-center p-8 text-falbor-elements-textSecondary bg-falbor-elements-background-depth-2 rounded-xl border border-falbor-elements-borderColor">
                    No published apps found. Publish a chat to see it here!
                  </div>
                ) : (
                  publishedApps.map((app) => {
                    const isSelected = selectedIds.has(app.id);
                    return (
                      <div
                        key={app.id}
                        onClick={() => handleToggle(app.id)}
                        className={classNames(
                          "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                          isSelected
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-falbor-elements-borderColor hover:bg-falbor-elements-background-depth-2"
                        )}
                      >
                        <div className={classNames(
                          "w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                          isSelected ? "border-purple-500 bg-purple-500 text-white" : "border-falbor-elements-borderColor"
                        )}>
                          {isSelected && <div className="i-ph:check-bold w-4 h-4" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-falbor-elements-textPrimary truncate">
                            {app.title || 'Untitled App'}
                          </h4>
                          <a 
                            href={app.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-falbor-elements-textSecondary hover:text-purple-500 hover:underline truncate block mt-0.5"
                          >
                            {app.url}
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-falbor-elements-borderColor">
                <DialogButton type="secondary" onClick={() => onOpenChange(false)}>
                  Cancel
                </DialogButton>
                <DialogButton type="primary" onClick={handleSave} disabled={isLoading}>
                  {isLoading && <div className="i-ph:spinner-gap animate-spin w-4 h-4" />}
                  Save Changes
                </DialogButton>
              </div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </DialogRoot>
  );
}
