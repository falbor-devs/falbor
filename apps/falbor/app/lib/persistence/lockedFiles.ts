import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('LockedFiles');

export const LOCKED_FILES_KEY = 'falbor.lockedFiles';

export interface LockedItem {
  chatId: string;
  path: string;
  isFolder: boolean;
}

let lockedItemsCache: LockedItem[] | null = null;
const lockedItemsMap = new Map<string, Map<string, LockedItem>>();
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 300;
function getChatMap(chatId: string, createIfMissing = false): Map<string, LockedItem> | undefined {
  if (createIfMissing && !lockedItemsMap.has(chatId)) {
    lockedItemsMap.set(chatId, new Map());
  }
  return lockedItemsMap.get(chatId);
}
function initializeCache(): LockedItem[] {
  if (lockedItemsCache !== null) {
    return lockedItemsCache;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const lockedItemsJson = localStorage.getItem(LOCKED_FILES_KEY);

      if (lockedItemsJson) {
        const items = JSON.parse(lockedItemsJson);
        const normalizedItems = items.map((item: any) => ({
          ...item,
          isFolder: item.isFolder !== undefined ? item.isFolder : false,
        }));
        lockedItemsCache = normalizedItems;
        rebuildLookupMaps(normalizedItems);
        return normalizedItems;
      }
    }

    lockedItemsCache = [];

    return [];
  } catch (error) {
    logger.error('Failed to initialize locked items cache', error);
    lockedItemsCache = [];
    return [];
  }
}

function rebuildLookupMaps(items: LockedItem[]): void {
  lockedItemsMap.clear();
  for (const item of items) {
    if (!lockedItemsMap.has(item.chatId)) {
      lockedItemsMap.set(item.chatId, new Map());
    }
    const chatMap = lockedItemsMap.get(item.chatId)!;
    chatMap.set(item.path, item);
  }
}

export function saveLockedItems(items: LockedItem[]): void {
  lockedItemsCache = [...items];
  rebuildLookupMaps(items);
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCKED_FILES_KEY, JSON.stringify(items));
        logger.info(`Saved ${items.length} locked items to localStorage`);
      }
    } catch (error) {
      logger.error('Failed to save locked items to localStorage', error);
    }
  }, SAVE_DEBOUNCE_MS);
}

export function getLockedItems(): LockedItem[] {

  if (lockedItemsCache !== null) {
    return lockedItemsCache;
  }

  return initializeCache();
}

export function addLockedItem(chatId: string, path: string, isFolder: boolean = false): void {

  const lockedItems = getLockedItems();

  const newItem = { chatId, path, isFolder };

  const chatMap = getChatMap(chatId, true)!;
  chatMap.set(path, newItem);

  const filteredItems = lockedItems.filter((item) => !(item.chatId === chatId && item.path === path));
  filteredItems.push(newItem);

  saveLockedItems(filteredItems);

  logger.info(`Added locked ${isFolder ? 'folder' : 'file'}: ${path} for chat: ${chatId}`);
}

export function addLockedFile(chatId: string, filePath: string): void {
  addLockedItem(chatId, filePath);
}

export function addLockedFolder(chatId: string, folderPath: string): void {
  addLockedItem(chatId, folderPath);
}

export function removeLockedItem(chatId: string, path: string): void {

  const lockedItems = getLockedItems();

  const chatMap = getChatMap(chatId);

  if (chatMap) {
    chatMap.delete(path);
  }

  const filteredItems = lockedItems.filter((item) => !(item.chatId === chatId && item.path === path));

  saveLockedItems(filteredItems);

  logger.info(`Removed lock for: ${path} in chat: ${chatId}`);
}

export function removeLockedFile(chatId: string, filePath: string): void {
  removeLockedItem(chatId, filePath);
}

export function removeLockedFolder(chatId: string, folderPath: string): void {
  removeLockedItem(chatId, folderPath);
}

export function isPathDirectlyLocked(chatId: string, path: string): { locked: boolean; isFolder?: boolean } {

  getLockedItems();

  const chatMap = getChatMap(chatId);

  if (chatMap) {
    const lockedItem = chatMap.get(path);

    if (lockedItem) {
      return { locked: true, isFolder: lockedItem.isFolder };
    }
  }

  return { locked: false };
}

export function isFileLocked(chatId: string, filePath: string): { locked: boolean; lockedBy?: string } {

  getLockedItems();

  const chatMap = getChatMap(chatId);

  if (chatMap) {

    const directLock = chatMap.get(filePath);

    if (directLock && !directLock.isFolder) {
      return { locked: true, lockedBy: filePath };
    }
  }

  return checkParentFolderLocks(chatId, filePath);
}

export function isFolderLocked(chatId: string, folderPath: string): { locked: boolean; lockedBy?: string } {

  getLockedItems();

  const chatMap = getChatMap(chatId);

  if (chatMap) {

    const directLock = chatMap.get(folderPath);

    if (directLock && directLock.isFolder) {
      return { locked: true, lockedBy: folderPath };
    }
  }

  return checkParentFolderLocks(chatId, folderPath);
}

function checkParentFolderLocks(chatId: string, path: string): { locked: boolean; lockedBy?: string } {
  const chatMap = getChatMap(chatId);

  if (!chatMap) {
    return { locked: false };
  }

  const pathParts = path.split('/');
  let currentPath = '';

  for (let i = 0; i < pathParts.length - 1; i++) {
    currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];

    const folderLock = chatMap.get(currentPath);

    if (folderLock && folderLock.isFolder) {
      return { locked: true, lockedBy: currentPath };
    }
  }

  return { locked: false };
}

export function getLockedItemsForChat(chatId: string): LockedItem[] {

  const allItems = getLockedItems();

  const chatMap = getChatMap(chatId);

  if (chatMap) {

    return Array.from(chatMap.values());
  }

  return allItems.filter((item) => item.chatId === chatId);
}

export function getLockedFilesForChat(chatId: string): LockedItem[] {

  const chatItems = getLockedItemsForChat(chatId);

  return chatItems.filter((item) => !item.isFolder);
}

export function getLockedFoldersForChat(chatId: string): LockedItem[] {

  const chatItems = getLockedItemsForChat(chatId);

  return chatItems.filter((item) => item.isFolder);
}

export function isPathInLockedFolder(chatId: string, path: string): { locked: boolean; lockedBy?: string } {

  return checkParentFolderLocks(chatId, path);
}

export function migrateLegacyLocks(currentChatId: string): void {
  try {

    clearCache();

    if (typeof localStorage !== 'undefined') {
      const lockedItemsJson = localStorage.getItem(LOCKED_FILES_KEY);

      if (lockedItemsJson) {
        const lockedItems = JSON.parse(lockedItemsJson);

        if (Array.isArray(lockedItems)) {
          let hasLegacyItems = false;

          const updatedItems = lockedItems.map((item) => {
            const needsUpdate = !item.chatId || item.isFolder === undefined;

            if (needsUpdate) {
              hasLegacyItems = true;
              return {
                ...item,
                chatId: item.chatId || currentChatId,
                isFolder: item.isFolder !== undefined ? item.isFolder : false,
              };
            }

            return item;
          });

          if (hasLegacyItems) {
            saveLockedItems(updatedItems);
            logger.info(`Migrated ${updatedItems.length} legacy locks to chat ID: ${currentChatId}`);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Failed to migrate legacy locks', error);
  }
}

export function clearCache(): void {
  lockedItemsCache = null;
  lockedItemsMap.clear();
  logger.info('Cleared locked items cache');
}

export function batchLockItems(chatId: string, items: Array<{ path: string; isFolder: boolean }>): void {
  if (items.length === 0) {
    return;
  }

  const lockedItems = getLockedItems();

  const pathsToLock = new Set(items.map((item) => item.path));

  const filteredItems = lockedItems.filter((item) => !(item.chatId === chatId && pathsToLock.has(item.path)));

  const newItems = items.map((item) => ({
    chatId,
    path: item.path,
    isFolder: item.isFolder,
  }));

  const updatedItems = [...filteredItems, ...newItems];
  saveLockedItems(updatedItems);

  logger.info(`Batch locked ${items.length} items for chat: ${chatId}`);
}

export function batchUnlockItems(chatId: string, paths: string[]): void {
  if (paths.length === 0) {
    return;
  }

  const lockedItems = getLockedItems();

  const pathsToUnlock = new Set(paths);

  const chatMap = getChatMap(chatId);

  if (chatMap) {
    paths.forEach((path) => chatMap.delete(path));
  }

  const filteredItems = lockedItems.filter((item) => !(item.chatId === chatId && pathsToUnlock.has(item.path)));

  saveLockedItems(filteredItems);

  logger.info(`Batch unlocked ${paths.length} items for chat: ${chatId}`);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === LOCKED_FILES_KEY) {
      logger.info('Detected localStorage change for locked items, refreshing cache');
      clearCache();
    }
  });
}
