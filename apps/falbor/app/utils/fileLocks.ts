import {
  getLockedItems,
  isFileLocked as isFileLockedInternal,
  isFolderLocked as isFolderLockedInternal,
  isPathInLockedFolder,
} from '~/lib/persistence/lockedFiles';
import { createScopedLogger } from './logger';

const logger = createScopedLogger('FileLocks');
export function getCurrentChatId(): string {
  try {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/chat\/([^/]+)/);

      if (match && match[1]) {
        return match[1];
      }
    }
    return 'default';
  } catch (error) {
    logger.error('Failed to get current chat ID', error);
    return 'default';
  }
}
export function isFileLocked(filePath: string, chatId?: string): { locked: boolean; lockedBy?: string } {
  try {
    const currentChatId = chatId || getCurrentChatId();
    const result = isFileLockedInternal(currentChatId, filePath);
    if (!result.locked) {
      const folderLockResult = isPathInLockedFolder(currentChatId, filePath);

      if (folderLockResult.locked) {
        return folderLockResult;
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed to check if file is locked', error);
    return { locked: false };
  }
}
export function isFolderLocked(folderPath: string, chatId?: string): { locked: boolean; lockedBy?: string } {
  try {
    const currentChatId = chatId || getCurrentChatId();
    return isFolderLockedInternal(currentChatId, folderPath);
  } catch (error) {
    logger.error('Failed to check if folder is locked', error);
    return { locked: false };
  }
}
export function hasLockedItems(chatId?: string): boolean {
  try {
    const currentChatId = chatId || getCurrentChatId();
    const lockedItems = getLockedItems();

    return lockedItems.some((item) => item.chatId === currentChatId);
  } catch (error) {
    logger.error('Failed to check for locked items', error);
    return false;
  }
}
