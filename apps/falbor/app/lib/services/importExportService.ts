import Cookies from 'js-cookie';
import { type Message } from 'ai';
import { getAllChats, deleteChat } from '~/lib/persistence/chats';

interface ExtendedMessage extends Message {
  name?: string;
  function_call?: any;
  timestamp?: number;
}

export class ImportExportService {
  static async exportAllChats(db: IDBDatabase): Promise<{ chats: any[]; exportDate: string }> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      const chats = await getAllChats(db);

      const sanitizedChats = chats.map((chat) => ({
        id: chat.id,
        description: chat.description || '',
        messages: chat.messages.map((msg: ExtendedMessage) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          name: msg.name,
          function_call: msg.function_call,
          timestamp: msg.timestamp,
        })),
        timestamp: chat.timestamp,
        urlId: chat.urlId || null,
        metadata: chat.metadata || null,
      }));

      console.log(`Successfully prepared ${sanitizedChats.length} chats for export`);

      return {
        chats: sanitizedChats,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error exporting chats:', error);
      throw new Error(`Failed to export chats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async exportSettings(): Promise<any> {
    try {
      const allCookies = Cookies.get();

      return {
        core: {
          falbor_user_profile: this._safeGetItem('falbor_user_profile'),
          falbor_settings: this._safeGetItem('falbor_settings'),
          falbor_profile: this._safeGetItem('falbor_profile'),
          theme: this._safeGetItem('theme'),
        },

        providers: {
          provider_settings: this._safeGetItem('provider_settings'),

          selectedModel: allCookies.selectedModel,
          selectedProvider: allCookies.selectedProvider,

          providers: allCookies.providers,
        },

        features: {
          viewed_features: this._safeGetItem('falbor_viewed_features'),
          developer_mode: this._safeGetItem('falbor_developer_mode'),

          contextOptimizationEnabled: this._safeGetItem('contextOptimizationEnabled'),

          autoSelectTemplate: this._safeGetItem('autoSelectTemplate'),

          isLatestBranch: this._safeGetItem('isLatestBranch'),

          isEventLogsEnabled: this._safeGetItem('isEventLogsEnabled'),

          energySaverMode: this._safeGetItem('energySaverMode'),
          autoEnergySaver: this._safeGetItem('autoEnergySaver'),
        },

        ui: {
          falbor_tab_configuration: this._safeGetItem('falbor_tab_configuration'),
          tabConfiguration: allCookies.tabConfiguration,

          promptId: this._safeGetItem('promptId'),
          cachedPrompt: allCookies.cachedPrompt,
        },

        connections: {
          netlify_connection: this._safeGetItem('netlify_connection'),

          ...this._getGitHubConnections(allCookies),
        },

        debug: {
          isDebugEnabled: allCookies.isDebugEnabled,
          acknowledged_debug_issues: this._safeGetItem('falbor_acknowledged_debug_issues'),
          acknowledged_connection_issue: this._safeGetItem('falbor_acknowledged_connection_issue'),

          error_logs: this._safeGetItem('error_logs'),
          falbor_read_logs: this._safeGetItem('falbor_read_logs'),

          eventLogs: allCookies.eventLogs,
        },

        updates: {
          update_settings: this._safeGetItem('update_settings'),
          last_acknowledged_update: this._safeGetItem('falbor_last_acknowledged_version'),
        },

        chatSnapshots: this._getChatSnapshots(),

        _raw: {
          localStorage: this._getAllLocalStorage(),
          cookies: allCookies,
        },

        _meta: {
          exportDate: new Date().toISOString(),
          version: '2.0',
          appVersion: process.env.NEXT_PUBLIC_VERSION || 'unknown',
        },
      };
    } catch (error) {
      console.error('Error exporting settings:', error);
      throw error;
    }
  }

  static async importSettings(importedData: any): Promise<void> {
    const isNewFormat = importedData._meta?.version === '2.0';

    if (isNewFormat) {
      await this._importComprehensiveFormat(importedData);
    } else {
      await this._importLegacyFormat(importedData);
    }
  }

  static importAPIKeys(keys: Record<string, any>): Record<string, string> {
    void keys;
    throw new Error('Browser-based API key import has been disabled');
  }

  static createAPIKeysTemplate(): Record<string, any> {
    const template = {
      Anthropic: '',
      OpenAI: '',
      Google: '',
      Groq: '',
      HuggingFace: '',
      OpenRouter: '',
      Deepseek: '',
      Mistral: '',
      OpenAILike: '',
      Together: '',
      xAI: '',
      Perplexity: '',
      Cohere: '',
      AzureOpenAI: '',
    };

    return {
      _comment:
        "Fill in your API keys for each provider. Keys will be stored with the provider name (e.g., 'OpenAI'). The application also supports the older format with keys like 'OpenAI_API_KEY' for backward compatibility.",
      ...template,
    };
  }

  static async resetAllSettings(db: IDBDatabase): Promise<void> {
    const localStorageKeysToPreserve: string[] = ['debug_mode'];

    const allLocalStorageKeys = Object.keys(localStorage);

    allLocalStorageKeys.forEach((key) => {
      if (!localStorageKeysToPreserve.includes(key)) {
        try {
          localStorage.removeItem(key);
        } catch (err) {
          console.error(`Error removing localStorage item ${key}:`, err);
        }
      }
    });

    const cookiesToPreserve: string[] = [];

    const allCookies = Cookies.get();
    const cookieKeys = Object.keys(allCookies);

    cookieKeys.forEach((key) => {
      if (!cookiesToPreserve.includes(key)) {
        try {
          Cookies.remove(key);
        } catch (err) {
          console.error(`Error removing cookie ${key}:`, err);
        }
      }
    });

    if (!db) {
      console.warn('Database not initialized, skipping IndexedDB reset');
    } else {
      const chats = await getAllChats(db);

      const deletePromises = chats.map((chat) => deleteChat(db, chat.id));
      await Promise.all(deletePromises);
    }

    const snapshotKeys = Object.keys(localStorage).filter((key) => key.startsWith('snapshot:'));
    snapshotKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.error(`Error removing snapshot ${key}:`, err);
      }
    });
  }

  static async deleteAllChats(db: IDBDatabase): Promise<void> {
    localStorage.removeItem('falbor_chat_history');

    if (!db) {
      throw new Error('Database not initialized');
    }

    const chats = await getAllChats(db);
    const deletePromises = chats.map((chat) => deleteChat(db, chat.id));
    await Promise.all(deletePromises);
  }

  private static async _importComprehensiveFormat(data: any): Promise<void> {
    if (data.core) {
      Object.entries(data.core).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          try {
            this._safeSetItem(key, value);
          } catch (err) {
            console.error(`Error importing core setting ${key}:`, err);
          }
        }
      });
    }

    if (data.providers) {
      if (data.providers.provider_settings) {
        try {
          this._safeSetItem('provider_settings', data.providers.provider_settings);
        } catch (err) {
          console.error('Error importing provider settings:', err);
        }
      }

      const providerCookies = ['selectedModel', 'selectedProvider', 'providers'];
      providerCookies.forEach((key) => {
        if (data.providers[key]) {
          try {
            this._safeSetCookie(key, data.providers[key]);
          } catch (err) {
            console.error(`Error importing provider cookie ${key}:`, err);
          }
        }
      });
    }

    if (data.features) {
      Object.entries(data.features).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          try {
            this._safeSetItem(key, value);
          } catch (err) {
            console.error(`Error importing feature setting ${key}:`, err);
          }
        }
      });
    }

    if (data.ui) {
      if (data.ui.falbor_tab_configuration) {
        try {
          this._safeSetItem('falbor_tab_configuration', data.ui.falbor_tab_configuration);
        } catch (err) {
          console.error('Error importing tab configuration:', err);
        }
      }

      if (data.ui.promptId) {
        try {
          this._safeSetItem('promptId', data.ui.promptId);
        } catch (err) {
          console.error('Error importing prompt ID:', err);
        }
      }

      const uiCookies = ['tabConfiguration', 'cachedPrompt'];
      uiCookies.forEach((key) => {
        if (data.ui[key]) {
          try {
            this._safeSetCookie(key, data.ui[key]);
          } catch (err) {
            console.error(`Error importing UI cookie ${key}:`, err);
          }
        }
      });
    }

    if (data.connections) {
      if (data.connections.netlify_connection) {
        try {
          this._safeSetItem('netlify_connection', data.connections.netlify_connection);
        } catch (err) {
          console.error('Error importing Netlify connection:', err);
        }
      }

      Object.entries(data.connections).forEach(([key, value]) => {
        if (key.startsWith('github_') && value !== null && value !== undefined) {
          try {
            this._safeSetItem(key, value);
          } catch (err) {
            console.error(`Error importing GitHub connection ${key}:`, err);
          }
        }
      });
    }

    if (data.debug) {
      const debugLocalStorageKeys = [
        'falbor_acknowledged_debug_issues',
        'falbor_acknowledged_connection_issue',
        'error_logs',
        'falbor_read_logs',
      ];

      debugLocalStorageKeys.forEach((key) => {
        if (data.debug[key] !== null && data.debug[key] !== undefined) {
          try {
            this._safeSetItem(key, data.debug[key]);
          } catch (err) {
            console.error(`Error importing debug setting ${key}:`, err);
          }
        }
      });

      const debugCookies = ['isDebugEnabled', 'eventLogs'];
      debugCookies.forEach((key) => {
        if (data.debug[key]) {
          try {
            this._safeSetCookie(key, data.debug[key]);
          } catch (err) {
            console.error(`Error importing debug cookie ${key}:`, err);
          }
        }
      });
    }

    if (data.updates) {
      if (data.updates.update_settings) {
        try {
          this._safeSetItem('update_settings', data.updates.update_settings);
        } catch (err) {
          console.error('Error importing update settings:', err);
        }
      }

      if (data.updates.last_acknowledged_update) {
        try {
          this._safeSetItem('falbor_last_acknowledged_version', data.updates.last_acknowledged_update);
        } catch (err) {
          console.error('Error importing last acknowledged update:', err);
        }
      }
    }

    if (data.chatSnapshots) {
      Object.entries(data.chatSnapshots).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          try {
            this._safeSetItem(key, value);
          } catch (err) {
            console.error(`Error importing chat snapshot ${key}:`, err);
          }
        }
      });
    }
  }

  private static async _importLegacyFormat(data: any): Promise<void> {

    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (key === 'exportDate' || key === 'version' || key === 'appVersion') {
          return;
        }

        try {
          const isCookie = [
            'selectedModel',
            'selectedProvider',
            'providers',
            'tabConfiguration',
            'cachedPrompt',
            'isDebugEnabled',
            'eventLogs',
          ].includes(key);

          if (isCookie) {
            this._safeSetCookie(key, value);
          } else {
            this._safeSetItem(key, value);
          }
        } catch (err) {
          console.error(`Error importing legacy setting ${key}:`, err);
        }
      }
    });
  }

  private static _safeGetItem(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (err) {
      console.error(`Error getting localStorage item ${key}:`, err);
      return null;
    }
  }

  private static _getAllLocalStorage(): Record<string, any> {
    const result: Record<string, any> = {};

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key) {
          try {
            const value = localStorage.getItem(key);
            result[key] = value ? JSON.parse(value) : null;
          } catch {
            result[key] = null;
          }
        }
      }
    } catch (err) {
      console.error('Error getting all localStorage items:', err);
    }

    return result;
  }

  private static _getGitHubConnections(_cookies: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    const localStorageKeys = Object.keys(localStorage).filter((key) => key.startsWith('github_'));
    localStorageKeys.forEach((key) => {
      try {
        const value = localStorage.getItem(key);
        result[key] = value ? JSON.parse(value) : null;
      } catch (err) {
        console.error(`Error getting GitHub connection ${key}:`, err);
        result[key] = null;
      }
    });

    return result;
  }

  private static _getChatSnapshots(): Record<string, any> {
    const result: Record<string, any> = {};

    const snapshotKeys = Object.keys(localStorage).filter((key) => key.startsWith('snapshot:'));
    snapshotKeys.forEach((key) => {
      try {
        const value = localStorage.getItem(key);
        result[key] = value ? JSON.parse(value) : null;
      } catch (err) {
        console.error(`Error getting chat snapshot ${key}:`, err);
        result[key] = null;
      }
    });

    return result;
  }

  private static _safeSetItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Error setting localStorage item ${key}:`, err);
    }
  }

  private static _safeSetCookie(key: string, value: any): void {
    try {
      Cookies.set(key, typeof value === 'string' ? value : JSON.stringify(value), { expires: 365 });
    } catch (err) {
      console.error(`Error setting cookie ${key}:`, err);
    }
  }
}
