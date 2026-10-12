import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ImportExportService } from '~/lib/services/importExportService';
import { useIndexedDB } from '~/lib/hooks/useIndexedDB';
import { generateId } from 'ai';

interface UseDataOperationsProps {
  onReloadSettings?: () => void;
  onReloadChats?: () => void;
  onResetSettings?: () => void;
  onResetChats?: () => void;
  customDb?: IDBDatabase;
}

export function useDataOperations({
  onReloadSettings,
  onReloadChats,
  onResetSettings,
  onResetChats,
  customDb,
}: UseDataOperationsProps = {}) {
  const { db: defaultDb } = useIndexedDB();
  const db = customDb || defaultDb;
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [lastOperation, setLastOperation] = useState<{ type: string; data: any } | null>(null);

  const showProgress = useCallback((message: string, percent: number) => {
    setProgressMessage(message);
    setProgressPercent(percent);
    toast.dismiss('progress-toast');
    toast.loading(`${message} (${percent}%)`, {
      position: 'bottom-right',
      autoClose: 3000,
      toastId: 'progress-toast',
    });
  }, []);

  const handleExportSettings = useCallback(async () => {
    setIsExporting(true);
    setProgressPercent(0);
    toast.dismiss('progress-toast');
    toast.loading('Preparing settings export...', {
      position: 'bottom-right',
      autoClose: 3000,
      toastId: 'progress-toast',
    });
    try {
      showProgress('Exporting settings', 25);
      const settingsData = await ImportExportService.exportSettings();
      showProgress('Creating file', 50);
      const blob = new Blob([JSON.stringify(settingsData, null, 2)], {
        type: 'application/json',
      });
      showProgress('Downloading file', 75);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'falbor-settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showProgress('Completing export', 100);
      toast.dismiss('progress-toast');
      toast.success('Settings exported successfully', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      setLastOperation({ type: 'export-settings', data: settingsData });
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.dismiss('progress-toast');
      toast.error(`Failed to export settings: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      setIsExporting(false);
      setProgressPercent(0);
      setProgressMessage('');
    }
  }, [showProgress]);

  const handleExportSelectedSettings = useCallback(
    async (categoryIds: string[]) => {
      if (!categoryIds || categoryIds.length === 0) {
        toast.error('No settings categories selected', {
          position: 'bottom-right',
          autoClose: 3000,
        });
        return;
      }
      setIsExporting(true);
      setProgressPercent(0);
      toast.dismiss('progress-toast');
      toast.loading(`Preparing export of ${categoryIds.length} settings categories...`, {
        position: 'bottom-right',
        autoClose: 3000,
        toastId: 'progress-toast',
      });
      try {
        showProgress('Exporting settings', 20);
        const allSettings = await ImportExportService.exportSettings();
        showProgress('Filtering selected categories', 40);
        const filteredSettings: Record<string, any> = {
          exportDate: allSettings.exportDate,
        };
        categoryIds.forEach((category) => {
          if (allSettings[category]) {
            filteredSettings[category] = allSettings[category];
          }
        });
        showProgress('Creating file', 60);
        const blob = new Blob([JSON.stringify(filteredSettings, null, 2)], {
          type: 'application/json',
        });
        showProgress('Downloading file', 80);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `falbor-settings-${categoryIds.join('-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showProgress('Completing export', 100);
        toast.dismiss('progress-toast');
        toast.success(`${categoryIds.length} settings categories exported successfully`, {
          position: 'bottom-right',
          autoClose: 3000,
        });
        setLastOperation({
          type: 'export-selected-settings',
          data: { settings: filteredSettings, categories: categoryIds },
        });
      } catch (error) {
        console.error('Error exporting selected settings:', error);
        toast.dismiss('progress-toast');
        toast.error(`Failed to export settings: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          position: 'bottom-right',
          autoClose: 3000,
        });
      } finally {
        setIsExporting(false);
        setProgressPercent(0);
        setProgressMessage('');
      }
    },
    [showProgress],
  );

  const handleExportAllChats = useCallback(async () => {
    if (!db) {
      toast.error('Database not available', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      return;
    }
    console.log('Export: Using database', {
      name: db.name,
      version: db.version,
      objectStoreNames: Array.from(db.objectStoreNames),
    });
    setIsExporting(true);
    setProgressPercent(0);
    toast.dismiss('progress-toast');
    toast.loading('Preparing chats export...', {
      position: 'bottom-right',
      autoClose: 3000,
      toastId: 'progress-toast',
    });
    try {
      showProgress('Retrieving chats from database', 25);
      console.log('Database details:', {
        name: db.name,
        version: db.version,
        objectStoreNames: Array.from(db.objectStoreNames),
      });
      const directChats = await new Promise<any[]>((resolve, reject) => {
        try {
          console.log(`Creating transaction on '${db.name}' database, objectStore 'chats'`);
          const transaction = db.transaction(['chats'], 'readonly');
          const store = transaction.objectStore('chats');
          const request = store.getAll();
          request.onsuccess = () => {
            console.log(`Found ${request.result ? request.result.length : 0} chats directly from database`);
            resolve(request.result || []);
          };
          request.onerror = () => {
            console.error('Error querying chats store:', request.error);
            reject(request.error);
          };
        } catch (err) {
          console.error('Error creating transaction:', err);
          reject(err);
        }
      });
      const exportData = {
        chats: directChats,
        exportDate: new Date().toISOString(),
      };
      console.log(`Preparing to export ${exportData.chats.length} chats`);
      showProgress('Creating file', 50);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      showProgress('Downloading file', 75);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'falbor-chats.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showProgress('Completing export', 100);
      toast.dismiss('progress-toast');
      toast.success(`${exportData.chats.length} chats exported successfully`, {
        position: 'bottom-right',
        autoClose: 3000,
      });
      setLastOperation({ type: 'export-chats', data: exportData });
    } catch (error) {
      console.error('Error exporting chats:', error);
      toast.dismiss('progress-toast');
      toast.error(`Failed to export chats: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      setIsExporting(false);
      setProgressPercent(0);
      setProgressMessage('');
    }
  }, [db, showProgress]);

  const handleExportSelectedChats = useCallback(
    async (chatIds: string[]) => {
      if (!db) {
        toast.error('Database not available', {
          position: 'bottom-right',
          autoClose: 3000,
        });
        return;
      }
      if (!chatIds || chatIds.length === 0) {
        toast.error('No chats selected', {
          position: 'bottom-right',
          autoClose: 3000,
        });
        return;
      }
      setIsExporting(true);
      setProgressPercent(0);
      toast.dismiss('progress-toast');
      toast.loading(`Preparing export of ${chatIds.length} chats...`, {
        position: 'bottom-right',
        autoClose: 3000,
        toastId: 'progress-toast',
      });
      try {
        showProgress('Retrieving chats from database', 25);
        const transaction = db.transaction(['chats'], 'readonly');
        const store = transaction.objectStore('chats');
        const chatPromises = chatIds.map((chatId) => {
          return new Promise<any>((resolve, reject) => {
            const request = store.get(chatId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        });
        const chats = await Promise.all(chatPromises);
        const filteredChats = chats.filter(Boolean);
        console.log(`Retrieved ${filteredChats.length} chats for export`);
        const exportData = {
          chats: filteredChats,
          exportDate: new Date().toISOString(),
        };
        showProgress('Creating file', 50);
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        showProgress('Downloading file', 75);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'falbor-selected-chats.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showProgress('Completing export', 100);
        toast.dismiss('progress-toast');
        toast.success(`${filteredChats.length} chats exported successfully`, {
          position: 'bottom-right',
          autoClose: 3000,
        });
        setLastOperation({ type: 'export-selected-chats', data: { chatIds, chats: filteredChats } });
      } catch (error) {
        console.error('Error exporting selected chats:', error);
        toast.dismiss('progress-toast');
        toast.error(`Failed to export selected chats: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          position: 'bottom-right',
          autoClose: 3000,
        });
      } finally {
        setIsExporting(false);
        setProgressPercent(0);
        setProgressMessage('');
      }
    },
    [db, showProgress],
  );

  const handleImportSettings = useCallback(
    async (file: File) => {
      setIsImporting(true);
      setProgressPercent(0);
      toast.dismiss('progress-toast');
      toast.loading(`Importing settings from ${file.name}...`, {
        position: 'bottom-right',
        autoClose: 3000,
        toastId: 'progress-toast',
      });
      try {
        showProgress('Reading file', 20);
        const fileContent = await file.text();
        showProgress('Parsing settings data', 40);
        const importedData = JSON.parse(fileContent);
        showProgress('Validating settings data', 60);
        const currentSettings = await ImportExportService.exportSettings();
        setLastOperation({ type: 'import-settings', data: { previous: currentSettings } });
        showProgress('Applying settings', 80);
        await ImportExportService.importSettings(importedData);
        showProgress('Completing import', 100);
        toast.dismiss('progress-toast');
        toast.success('Settings imported successfully', {
          position: 'bottom-right',
          autoClose: 3000,
        });
        if (onReloadSettings) {
          onReloadSettings();
        }
      } catch (error) {
        console.error('Error importing settings:', error);
        toast.dismiss('progress-toast');
        toast.error(`Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          position: 'bottom-right',
          autoClose: 3000,
        });
      } finally {
        setIsImporting(false);
        setProgressPercent(0);
        setProgressMessage('');
      }
    },
    [onReloadSettings, showProgress],
  );

  const handleImportChats = useCallback(
    async (file: File) => {
      if (!db) {
        toast.error('Database not available', {
          position: 'bottom-right',
          autoClose: 3000,
        });
        return;
      }
      setIsImporting(true);
      setProgressPercent(0);
      toast.dismiss('progress-toast');
      toast.loading(`Importing chats from ${file.name}...`, {
        position: 'bottom-right',
        autoClose: 3000,
        toastId: 'progress-toast',
      });
      try {
        showProgress('Reading file', 20);
        const fileContent = await file.text();
        showProgress('Parsing chat data', 40);
        const importedData = JSON.parse(fileContent);
        if (!importedData.chats || !Array.isArray(importedData.chats)) {
          throw new Error('Invalid chat data format: missing or invalid chats array');
        }
        showProgress('Validating chat data', 60);
        const validatedChats = importedData.chats.map((chat: any) => {
          if (!chat.id || !Array.isArray(chat.messages)) {
            throw new Error('Invalid chat format: missing required fields');
          }
          const validatedMessages = chat.messages.map((msg: any) => {
            if (!msg.role || !msg.content) {
              throw new Error('Invalid message format: missing required fields');
            }
            return {
              id: msg.id || generateId(),
              role: msg.role,
              content: msg.content,
              name: msg.name,
              function_call: msg.function_call,
              timestamp: msg.timestamp || Date.now(),
            };
          });
          return {
            id: chat.id,
            description: chat.description || '',
            messages: validatedMessages,
            timestamp: chat.timestamp || new Date().toISOString(),
            urlId: chat.urlId || null,
            metadata: chat.metadata || null,
          };
        });
        showProgress('Preparing database transaction', 70);
        const currentChats = await ImportExportService.exportAllChats(db);
        setLastOperation({ type: 'import-chats', data: { previous: currentChats } });
        showProgress(`Importing ${validatedChats.length} chats`, 80);
        const transaction = db.transaction(['chats'], 'readwrite');
        const store = transaction.objectStore('chats');
        let processed = 0;
        for (const chat of validatedChats) {
          store.put(chat);
          processed++;
          if (processed % 5 === 0 || processed === validatedChats.length) {
            showProgress(
              `Imported ${processed} of ${validatedChats.length} chats`,
              80 + (processed / validatedChats.length) * 20,
            );
          }
        }
        await new Promise((resolve, reject) => {
          transaction.oncomplete = resolve;
          transaction.onerror = reject;
        });
        showProgress('Completing import', 100);
        toast.dismiss('progress-toast');
        toast.success(`${validatedChats.length} chats imported successfully`, {
          position: 'bottom-right',
          autoClose: 3000,
        });
        if (onReloadChats) {
          onReloadChats();
        }
      } catch (error) {
        console.error('Error importing chats:', error);
        toast.dismiss('progress-toast');
        toast.error(`Failed to import chats: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          position: 'bottom-right',
          autoClose: 3000,
        });
      } finally {
        setIsImporting(false);
        setProgressPercent(0);
        setProgressMessage('');
      }
    },
    [db, onReloadChats, showProgress],
  );

  const handleImportAPIKeys = useCallback(
    async (file: File) => {
      setIsImporting(true);
      setProgressPercent(0);
      toast.dismiss('progress-toast');
      toast.loading(`Importing API keys from ${file.name}...`, {
        position: 'bottom-right',
        autoClose: 3000,
        toastId: 'progress-toast',
      });
      try {
        showProgress('Reading file', 20);
        const fileContent = await file.text();
        showProgress('Parsing API keys data', 40);
        const importedData = JSON.parse(fileContent);
        showProgress('Validating API keys data', 60);
        const apiKeysStr = document.cookie.split(';').find((row) => row.trim().startsWith('apiKeys='));
        const currentApiKeys = apiKeysStr ? JSON.parse(decodeURIComponent(apiKeysStr.split('=')[1])) : {};
        setLastOperation({ type: 'import-api-keys', data: { previous: currentApiKeys } });
        showProgress('Applying API keys', 80);
        const newKeys = ImportExportService.importAPIKeys(importedData);
        const apiKeysJson = JSON.stringify(newKeys);
        document.cookie = `apiKeys=${apiKeysJson}; path=/; max-age=31536000`;
        showProgress('Completing import', 100);
        toast.dismiss('progress-toast');
        const keyCount = Object.keys(newKeys).length;
        const newKeyCount = Object.keys(newKeys).filter(
          (key) => !currentApiKeys[key] || currentApiKeys[key] !== newKeys[key],
        ).length;
        toast.success(
          `${keyCount} API keys imported successfully (${newKeyCount} new/updated)\n` +
          'Note: Keys are stored in browser cookies. For server-side usage, add them to your .env.local file.',
          { position: 'bottom-right', autoClose: 5000 },
        );
        if (onReloadSettings) {
          onReloadSettings();
        }
      } catch (error) {
        console.error('Error importing API keys:', error);
        toast.dismiss('progress-toast');
        toast.error(`Failed to import API keys: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          position: 'bottom-right',
          autoClose: 3000,
        });
      } finally {
        setIsImporting(false);
        setProgressPercent(0);
        setProgressMessage('');
      }
    },
    [onReloadSettings, showProgress],
  );

  const handleResetSettings = useCallback(async () => {
    setIsResetting(true);
    setProgressPercent(0);
    toast.dismiss('progress-toast');
    toast.loading('Resetting settings...', {
      position: 'bottom-right',
      autoClose: 3000,
      toastId: 'progress-toast',
    });
    try {
      if (db) {
        showProgress('Backing up current settings', 25);
        const currentSettings = await ImportExportService.exportSettings();
        setLastOperation({ type: 'reset-settings', data: { previous: currentSettings } });
        showProgress('Resetting settings to defaults', 50);
        await ImportExportService.resetAllSettings(db);
        showProgress('Completing reset', 100);
        toast.dismiss('progress-toast');
        toast.success('Settings reset successfully', {
          position: 'bottom-right',
          autoClose: 3000,
        });
        if (onResetSettings) {
          onResetSettings();
        }
      } else {
        toast.dismiss('progress-toast');
        toast.error('Database not available', {
          position: 'bottom-right',
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.dismiss('progress-toast');
      toast.error(`Failed to reset settings: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      setIsResetting(false);
      setProgressPercent(0);
      setProgressMessage('');
    }
  }, [db, onResetSettings, showProgress]);

  const handleResetChats = useCallback(async () => {
    if (!db) {
      toast.error('Database not available', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      return;
    }
    setIsResetting(true);
    setProgressPercent(0);
    toast.dismiss('progress-toast');
    toast.loading('Deleting all chats...', {
      position: 'bottom-right',
      autoClose: 3000,
      toastId: 'progress-toast',
    });
    try {
      showProgress('Backing up current chats', 25);
      const currentChats = await ImportExportService.exportAllChats(db);
      setLastOperation({ type: 'reset-chats', data: { previous: currentChats } });
      showProgress('Deleting chats from database', 50);
      await ImportExportService.deleteAllChats(db);
      showProgress('Completing deletion', 100);
      toast.dismiss('progress-toast');
      toast.success('All chats deleted successfully', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      if (onResetChats) {
        onResetChats();
      }
    } catch (error) {
      console.error('Error resetting chats:', error);
      toast.dismiss('progress-toast');
      toast.error(`Failed to delete chats: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      setIsResetting(false);
      setProgressPercent(0);
      setProgressMessage('');
    }
  }, [db, onResetChats, showProgress]);

  const handleDownloadTemplate = useCallback(async () => {
    setIsDownloadingTemplate(true);
    setProgressPercent(0);
    toast.dismiss('progress-toast');
    toast.loading('Creating API keys template...', {
      position: 'bottom-right',
      autoClose: 3000,
      toastId: 'progress-toast',
    });
    try {
      showProgress('Creating template', 50);
      const templateData = ImportExportService.createAPIKeysTemplate();
      showProgress('Downloading template', 75);
      const blob = new Blob([JSON.stringify(templateData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'falbor-api-keys-template.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showProgress('Completing download', 100);
      toast.dismiss('progress-toast');
      toast.success('Template downloaded successfully', {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.dismiss('progress-toast');
      toast.error(`Failed to download template: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      setIsDownloadingTemplate(false);
      setProgressPercent(0);
      setProgressMessage('');
    }
  }, [showProgress]);

  const handleExportAPIKeys = useCallback(async () => {
    setIsExporting(true);
    setProgressPercent(0);
    toast.dismiss('progress-toast');
    toast.loading('Exporting API keys...', {
      position: 'bottom-right',
      autoClose: 3000,
      toastId: 'progress-toast',
    });
    try {
      showProgress('Retrieving API keys', 25);
      const response = await fetch('/api/export-api-keys');
      if (!response.ok) {
        throw new Error('Failed to retrieve API keys from server');
      }
      const apiKeys = await response.json();
      showProgress('Creating file', 50);
      const blob = new Blob([JSON.stringify(apiKeys, null, 2)], {
        type: 'application/json',
      });
      showProgress('Downloading file', 75);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'falbor-api-keys.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showProgress('Completing export', 100);
      toast.dismiss('progress-toast');
      toast.success('API keys exported successfully', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      setLastOperation({ type: 'export-api-keys', data: apiKeys });
    } catch (error) {
      console.error('Error exporting API keys:', error);
      toast.dismiss('progress-toast');
      toast.error(`Failed to export API keys: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      setIsExporting(false);
      setProgressPercent(0);
      setProgressMessage('');
    }
  }, [showProgress]);

  const handleUndo = useCallback(async () => {
    if (!lastOperation || !db) {
      toast.error('Nothing to undo', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      return;
    }
    toast.dismiss('progress-toast');
    toast.loading('Processing undo operation...', {
      position: 'bottom-right',
      autoClose: 3000,
      toastId: 'progress-toast',
    });
    try {
      switch (lastOperation.type) {
        case 'import-settings': {
          await ImportExportService.importSettings(lastOperation.data.previous);
          toast.dismiss('progress-toast');
          toast.success('Operation undone successfully', {
            position: 'bottom-right',
            autoClose: 3000,
          });
          if (onReloadSettings) {
            onReloadSettings();
          }
          break;
        }
        case 'import-chats': {
          await ImportExportService.deleteAllChats(db);
          const transaction = db.transaction(['chats'], 'readwrite');
          const store = transaction.objectStore('chats');
          for (const chat of lastOperation.data.previous.chats) {
            store.put(chat);
          }
          await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
          });
          toast.dismiss('progress-toast');
          toast.success('Operation undone successfully', {
            position: 'bottom-right',
            autoClose: 3000,
          });
          if (onReloadChats) {
            onReloadChats();
          }
          break;
        }
        case 'reset-settings': {
          await ImportExportService.importSettings(lastOperation.data.previous);
          toast.dismiss('progress-toast');
          toast.success('Operation undone successfully', {
            position: 'bottom-right',
            autoClose: 3000,
          });
          if (onReloadSettings) {
            onReloadSettings();
          }
          break;
        }
        case 'reset-chats': {
          const chatTransaction = db.transaction(['chats'], 'readwrite');
          const chatStore = chatTransaction.objectStore('chats');
          for (const chat of lastOperation.data.previous.chats) {
            chatStore.put(chat);
          }
          await new Promise((resolve, reject) => {
            chatTransaction.oncomplete = resolve;
            chatTransaction.onerror = reject;
          });
          toast.dismiss('progress-toast');
          toast.success('Operation undone successfully', {
            position: 'bottom-right',
            autoClose: 3000,
          });
          if (onReloadChats) {
            onReloadChats();
          }
          break;
        }
        case 'import-api-keys': {
          const previousAPIKeys = lastOperation.data.previous;
          const newKeys = ImportExportService.importAPIKeys(previousAPIKeys);
          const apiKeysJson = JSON.stringify(newKeys);
          document.cookie = `apiKeys=${apiKeysJson}; path=/; max-age=31536000`;
          toast.dismiss('progress-toast');
          toast.success('Operation undone successfully', {
            position: 'bottom-right',
            autoClose: 3000,
          });
          if (onReloadSettings) {
            onReloadSettings();
          }
          break;
        }
        default:
          toast.dismiss('progress-toast');
          toast.error('Cannot undo this operation', {
            position: 'bottom-right',
            autoClose: 3000,
          });
      }
      setLastOperation(null);
    } catch (error) {
      console.error('Error undoing operation:', error);
      toast.dismiss('progress-toast');
      toast.error(`Failed to undo: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        position: 'bottom-right',
        autoClose: 3000,
      });
    }
  }, [lastOperation, db, onReloadSettings, onReloadChats]);

  return {
    isExporting,
    isImporting,
    isResetting,
    isDownloadingTemplate,
    progressMessage,
    progressPercent,
    lastOperation,
    handleExportSettings,
    handleExportSelectedSettings,
    handleExportAllChats,
    handleExportSelectedChats,
    handleImportSettings,
    handleImportChats,
    handleImportAPIKeys,
    handleResetSettings,
    handleResetChats,
    handleDownloadTemplate,
    handleExportAPIKeys,
    handleUndo,
  };
}
