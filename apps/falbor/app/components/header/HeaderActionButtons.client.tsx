'use client';
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { DeployButton } from '~/components/deploy/DeployButton';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';
import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { streamingState } from '~/lib/stores/streaming';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';

interface HeaderActionButtonsProps {
  chatStarted: boolean;
}

export function HeaderActionButtons({ chatStarted: _chatStarted }: HeaderActionButtonsProps) {
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];

  const [isSyncing, setIsSyncing] = useState(false);
  const streaming = useStore(streamingState);

  const handleSyncFiles = useCallback(async () => {
    setIsSyncing(true);

    try {
      const directoryHandle = await window.showDirectoryPicker();
      await workbenchStore.syncFiles(directoryHandle);
      toast.success('Files synced successfully');
    } catch (error) {
      console.error('Error syncing files:', error);
      toast.error('Failed to sync files');
    } finally {
      setIsSyncing(false);
    }
  }, []);
  const shouldShowButtons = _chatStarted || activePreview;

  return (
    <div className="flex items-center gap-2">
      {}
      {}
      {}
      <button
        onClick={() => aiSidebarStore.toggle()}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-sm"
      >
        <i className="i-ph:sparkle-fill text-sm" />
        <span>AI Agent</span>
      </button>

      {shouldShowButtons && (
        <div className="flex">
          <DeployButton />
        </div>
      )}
      {shouldShowButtons && (
        <button
          onClick={() => {
            workbenchStore.showWorkbench.set(true);
            workbenchStore.currentView.set('preview');
          }}
          className="md:hidden bg-[#00A3FF] hover:bg-[#0088DD] text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors border-0 ml-2"
        >
          Preview
        </button>
      )}
    </div>
  );
}