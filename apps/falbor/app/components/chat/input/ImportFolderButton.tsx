'use client';
import React, { useState } from 'react';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { MAX_FILES, isBinaryFile, shouldIncludeFile } from '~/utils/fileUtils';
import { createChatFromFolder } from '~/utils/folderImport';
import { logStore } from '~/lib/stores/logs'; 
import { Button } from '~/components/ui/Button';
import { DropdownItem } from '~/components/ui/Dropdown';
import { classNames } from '~/utils/classNames';

interface ImportFolderButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
  asMenuItem?: boolean;
}

export const ImportFolderButton: React.FC<ImportFolderButtonProps> = ({ className, importChat, asMenuItem }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files || []);

    const filteredFiles = allFiles.filter((file) => {
      const path = file.webkitRelativePath.split('/').slice(1).join('/');
      const include = shouldIncludeFile(path);

      return include;
    });

    if (filteredFiles.length === 0) {
      const error = new Error('No valid files found');
      logStore.logError('File import failed - no valid files', error, { folderName: 'Unknown Folder' });
      toast.error('No files found in the selected folder');

      return;
    }

    if (filteredFiles.length > MAX_FILES) {
      const error = new Error(`Too many files: ${filteredFiles.length}`);
      logStore.logError('File import failed - too many files', error, {
        fileCount: filteredFiles.length,
        maxFiles: MAX_FILES,
      });
      toast.error(
        `This folder contains ${filteredFiles.length.toLocaleString()} files. This product is not yet optimized for very large projects. Please select a folder with fewer than ${MAX_FILES.toLocaleString()} files.`,
      );

      return;
    }

    const folderName = filteredFiles[0]?.webkitRelativePath.split('/')[0] || 'Unknown Folder';
    setIsLoading(true);

    const loadingToast = toast.loading(`Importing ${folderName}...`);

    try {
      const fileChecks = await Promise.all(
        filteredFiles.map(async (file) => ({
          file,
          isBinary: await isBinaryFile(file),
        })),
      );

      const textFiles = fileChecks.filter((f) => !f.isBinary).map((f) => f.file);
      const binaryFilePaths = fileChecks
        .filter((f) => f.isBinary)
        .map((f) => f.file.webkitRelativePath.split('/').slice(1).join('/'));

      if (textFiles.length === 0) {
        const error = new Error('No text files found');
        logStore.logError('File import failed - no text files', error, { folderName });
        toast.error('No text files found in the selected folder');

        return;
      }

      if (binaryFilePaths.length > 0) {
        logStore.logWarning(`Skipping binary files during import`, {
          folderName,
          binaryCount: binaryFilePaths.length,
        });
        toast.info(`Skipping ${binaryFilePaths.length} binary files`);
      }

      const messages = await createChatFromFolder(textFiles, binaryFilePaths, folderName);

      if (importChat) {
        await importChat(folderName, [...messages]);
      }

      logStore.logSystem('Folder imported successfully', {
        folderName,
        textFileCount: textFiles.length,
        binaryFileCount: binaryFilePaths.length,
      });
      toast.success('Folder imported successfully');
    } catch (error) {
      logStore.logError('Failed to import folder', error, { folderName });
      console.error('Failed to import folder:', error);
      toast.error('Failed to import folder');
    } finally {
      setIsLoading(false);
      toast.dismiss(loadingToast);
      e.target.value = ''; 
    }
  };

  const inputId = 'folder-import';

  return (
    <>
      <input
        type="file"
        id={inputId}
        className="hidden"
        webkitdirectory=""
        directory=""
        onChange={handleFileChange}
        {...({} as any)}
      />

      {asMenuItem ? (
        <DropdownItem
          onSelect={(e) => {
            if (isLoading) {
              e.preventDefault();
              return;
            }
            document.getElementById(inputId)?.click();
          }}
          className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <div className="flex items-center gap-2 w-full text-falbor-elements-textPrimary">
            {isLoading ? (
              <div className="i-svg-spinners:90-ring-with-bg text-falbor-elements-loader-progress text-lg animate-spin"></div>
            ) : (
              <div className="i-ph:upload-simple text-lg text-falbor-elements-textSecondary"></div>
            )}
            <span>{isLoading ? 'Importing...' : 'Import Folder'}</span>
          </div>
        </DropdownItem>
      ) : (
        <Button
          onClick={() => {
            const input = document.getElementById(inputId);
            input?.click();
          }}
          title="Import Folder"
          variant="default"
          size="default"
          className={classNames(
            'gap-2 bg-falbor-elements-background-depth-1 w-full',
            'text-falbor-elements-textPrimary',
            'hover:bg-falbor-elements-background-depth-2',
            'border border-falbor-elements-borderColor',
            'h-10 px-4 py-2 min-w-[120px] justify-center',
            'transition-all duration-200 ease-in-out',
            className,
          )}
          disabled={isLoading}
        >
          <span className="i-ph:upload-simple w-4 h-4" />
          {isLoading ? 'Importing...' : 'Import Folder'}
        </Button>
      )}
    </>
  );
};