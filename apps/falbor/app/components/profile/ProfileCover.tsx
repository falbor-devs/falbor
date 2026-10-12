'use client';

import { useState, useRef } from 'react';
import { classNames } from '~/utils/classNames';
import * as Popover from '@radix-ui/react-popover';
import { toast } from 'react-toastify';

interface ProfileCoverProps {
  coverUrl?: string;
  username: string;
  isCurrentUser?: boolean;
}

const TEMPLATE_IMAGES = [
  '/background/bg.png',
  '/background/background-light-styled.png',
  '/background/background-dark-styled.png',
  '/background/bg__.png',
  '/background/forest_bg.png',
  '/background/Main-Bg.png',
];

export function ProfileCover({ coverUrl: initialCoverUrl, username, isCurrentUser }: ProfileCoverProps) {
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateCover = async (newCoverUrl: string) => {
    try {
      setIsUploading(true);
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover: newCoverUrl }),
      });

      if (!res.ok) throw new Error('Failed to update cover');

      setCoverUrl(newCoverUrl);
      setPopoverOpen(false);
      toast.success('Cover picture updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update cover picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      handleUpdateCover(base64String);
    };
    reader.onerror = () => {
      toast.error('Error reading file');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative w-full h-28 md:h-36 rounded-md overflow-hidden border border-gray-300 dark:border-gray-800 group">
      <div
        className={classNames(
          "w-full h-full relative"
        )}
      >
        {coverUrl && (
          <img
            src={coverUrl}
            alt={`${username} cover`}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {isCurrentUser && (
        <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
          <Popover.Trigger asChild>
            <button
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 sm:px-4 sm:py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-sm font-medium"
              disabled={isUploading}
            >
              <div className="i-ph:camera w-5 h-5" />
              <span className="hidden sm:inline">Edit Cover</span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 p-4 bg-white dark:bg-[#1E1E1E] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 outline-none animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
              sideOffset={8}
              align="end"
            >
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Cover Image</h4>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {TEMPLATE_IMAGES.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => handleUpdateCover(url)}
                    className="w-full h-16 rounded-lg overflow-hidden border-2 border-transparent hover:border-orange-500 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <img src={url} alt={`Template ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <div className="h-px w-full bg-gray-200 dark:bg-gray-800 mb-4" />

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                <div className="i-ph:upload-simple" />
                {isUploading ? 'Uploading...' : 'Upload from computer'}
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
}
