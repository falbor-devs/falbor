'use client';

import { useState, useRef, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { profileStore, updateProfile } from '~/lib/stores/profile';
import { DialogRoot, Dialog, DialogTitle, DialogButton } from '~/components/ui/Dialog';
import { AnimatePresence } from 'framer-motion';

import { useRouter } from 'next/navigation';

interface ProfileApp {
  chatId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  url: string;
}

interface EditAppModalProps {
  app: ProfileApp | null;
  onClose: () => void;
}

export function EditAppModal({ app, onClose }: EditAppModalProps) {
  const profile = useStore(profileStore);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (app) {
      setTitle(app.title || '');
      setDescription(app.description || '');
      setImageUrl(app.imageUrl || '');
    }
  }, [app]);

  if (!app) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.onerror = () => {
      toast.error('Error reading file');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const existingProfileApps = profile.profileApps || [];
      const newProfileApps = existingProfileApps.map((a: ProfileApp) => {
        if (a.chatId === app.chatId) {
          return {
            ...a,
            title,
            description,
            imageUrl,
          };
        }
        return a;
      });

      updateProfile({ profileApps: newProfileApps });
      
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileApps: newProfileApps }),
      });

      if (!res.ok) throw new Error('Failed to save app edits');
      
      toast.success('App updated successfully');
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save app');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogRoot open={!!app} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {app && (
          <Dialog onClose={onClose}>
            <div className="p-6">
              <DialogTitle className="mb-6">Edit App Details</DialogTitle>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-falbor-elements-textPrimary mb-1">
                    App Icon / Image
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor overflow-hidden flex items-center justify-center flex-shrink-0">
                      {imageUrl ? (
                        <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="i-ph:app-window text-2xl text-falbor-elements-textTertiary" />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-falbor-elements-background-depth-2 hover:bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary transition-colors border border-falbor-elements-borderColor"
                    >
                      Change Image
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-falbor-elements-textPrimary mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-lg text-falbor-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="App Title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-falbor-elements-textPrimary mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-lg text-falbor-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g. updated recently"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-falbor-elements-borderColor">
                <DialogButton type="secondary" onClick={onClose}>
                  Cancel
                </DialogButton>
                <DialogButton type="primary" onClick={handleSave} disabled={isLoading || !title.trim()}>
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
