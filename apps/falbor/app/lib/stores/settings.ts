import { atom, map } from 'nanostores';
import { PROVIDER_LIST } from '~/utils/constants';
import type { IProviderConfig } from '~/types/model';
import type { TabVisibilityConfig, TabWindowConfig, UserTabConfig } from '~/components/@settings/core/types';
import { DEFAULT_TAB_CONFIG } from '~/components/@settings/core/constants';
import { toggleTheme } from './theme';
import { create } from 'zustand';
import type { TabType } from '~/components/@settings/core/types';

export const settingsOpenStore = atom(false);
export const settingsTabStore = atom<TabType>('settings');
export const chatSettingsOpenStore = atom(false);
export const blinkPricingStore = atom(false);

export interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  ctrlOrMetaKey?: boolean;
  action: () => void;
  description?: string;
  isPreventDefault?: boolean;
}

export interface Shortcuts {
  toggleTheme: Shortcut;
  toggleTerminal: Shortcut;
}

export const URL_CONFIGURABLE_PROVIDERS = ['Ollama', 'LMStudio', 'OpenAILike'];
export const LOCAL_PROVIDERS = ['OpenAILike', 'LMStudio', 'Ollama'];

export type ProviderSetting = Record<string, IProviderConfig>;

export const shortcutsStore = map<Shortcuts>({
  toggleTheme: {
    key: 'd',
    metaKey: true,
    altKey: true,
    shiftKey: true,
    action: () => toggleTheme(),
    description: 'Toggle theme',
    isPreventDefault: true,
  },
  toggleTerminal: {
    key: '`',
    ctrlOrMetaKey: true,
    action: () => {
    },
    description: 'Toggle terminal',
    isPreventDefault: true,
  },
});

const PROVIDER_SETTINGS_KEY = 'provider_settings';
const AUTO_ENABLED_KEY = 'auto_enabled_providers';

const isBrowser = typeof window !== 'undefined';

interface ConfiguredProvider {
  name: string;
  isConfigured: boolean;
  configMethod: 'environment' | 'none';
}

const fetchConfiguredProviders = async (): Promise<ConfiguredProvider[]> => {
  try {
    const response = await fetch('/api/configured-providers');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as { providers?: ConfiguredProvider[] };

    return data.providers || [];
  } catch (error) {
    console.error('Error fetching configured providers:', error);
    return [];
  }
};

const getInitialProviderSettings = (): ProviderSetting => {
  const initialSettings: ProviderSetting = {};

  PROVIDER_LIST.forEach((provider) => {
    initialSettings[provider.name] = {
      ...provider,
      settings: {
        enabled: !LOCAL_PROVIDERS.includes(provider.name),
      },
    };
  });

  if (isBrowser) {
    const savedSettings = localStorage.getItem(PROVIDER_SETTINGS_KEY);

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        Object.entries(parsed).forEach(([key, value]) => {
          if (initialSettings[key]) {
            initialSettings[key].settings = (value as IProviderConfig).settings;
          }
        });
      } catch (error) {
        console.error('Error parsing saved provider settings:', error);
      }
    }
  }

  return initialSettings;
};

const autoEnableConfiguredProviders = async () => {
  if (!isBrowser) {
    return;
  }

  try {
    const configuredProviders = await fetchConfiguredProviders();
    const currentSettings = providersStore.get();
    const savedSettings = localStorage.getItem(PROVIDER_SETTINGS_KEY);
    const autoEnabledProviders = localStorage.getItem(AUTO_ENABLED_KEY);

    const previouslyAutoEnabled = autoEnabledProviders ? JSON.parse(autoEnabledProviders) : [];
    const newlyAutoEnabled: string[] = [];

    let hasChanges = false;

    configuredProviders.forEach(({ name, isConfigured, configMethod }) => {
      if (isConfigured && configMethod === 'environment' && LOCAL_PROVIDERS.includes(name)) {
        const currentProvider = currentSettings[name];

        if (currentProvider) {
          const hasUserSettings = savedSettings !== null;
          const wasAutoEnabled = previouslyAutoEnabled.includes(name);
          const shouldAutoEnable = !currentProvider.settings.enabled && (!hasUserSettings || wasAutoEnabled);

          if (shouldAutoEnable) {
            currentSettings[name] = {
              ...currentProvider,
              settings: {
                ...currentProvider.settings,
                enabled: true,
              },
            };
            newlyAutoEnabled.push(name);
            hasChanges = true;
          }
        }
      }
    });

    if (hasChanges) {
      providersStore.set(currentSettings);

      localStorage.setItem(PROVIDER_SETTINGS_KEY, JSON.stringify(currentSettings));

      const allAutoEnabled = [...new Set([...previouslyAutoEnabled, ...newlyAutoEnabled])];
      localStorage.setItem(AUTO_ENABLED_KEY, JSON.stringify(allAutoEnabled));

      console.log(`Auto-enabled providers: ${newlyAutoEnabled.join(', ')}`);
    }
  } catch (error) {
    console.error('Error auto-enabling configured providers:', error);
  }
};

export const providersStore = map<ProviderSetting>(getInitialProviderSettings());

export const initializeProviders = autoEnableConfiguredProviders;

if (isBrowser) {
  setTimeout(() => {
    autoEnableConfiguredProviders();
  }, 100);
}

export const updateProviderSettings = (provider: string, settings: ProviderSetting) => {
  const currentSettings = providersStore.get();

  const updatedProvider = {
    ...currentSettings[provider],
    settings: {
      ...currentSettings[provider].settings,
      ...settings,
    },
  };

  providersStore.setKey(provider, updatedProvider);

  const allSettings = providersStore.get();
  localStorage.setItem(PROVIDER_SETTINGS_KEY, JSON.stringify(allSettings));

  if (LOCAL_PROVIDERS.includes(provider) && updatedProvider.settings.enabled !== undefined) {
    updateAutoEnabledTracking(provider, updatedProvider.settings.enabled);
  }
};

const updateAutoEnabledTracking = (providerName: string, isEnabled: boolean) => {
  if (!isBrowser) {
    return;
  }

  try {
    const autoEnabledProviders = localStorage.getItem(AUTO_ENABLED_KEY);
    const currentAutoEnabled = autoEnabledProviders ? JSON.parse(autoEnabledProviders) : [];

    if (isEnabled) {
      if (!currentAutoEnabled.includes(providerName)) {
        currentAutoEnabled.push(providerName);
        localStorage.setItem(AUTO_ENABLED_KEY, JSON.stringify(currentAutoEnabled));
      }
    } else {
      const updatedAutoEnabled = currentAutoEnabled.filter((name: string) => name !== providerName);
      localStorage.setItem(AUTO_ENABLED_KEY, JSON.stringify(updatedAutoEnabled));
    }
  } catch (error) {
    console.error('Error updating auto-enabled tracking:', error);
  }
};

export const isDebugMode = atom(false);

const SETTINGS_KEYS = {
  LATEST_BRANCH: 'isLatestBranch',
  AUTO_SELECT_TEMPLATE: 'autoSelectTemplate',
  CONTEXT_OPTIMIZATION: 'contextOptimizationEnabled',
  EVENT_LOGS: 'isEventLogsEnabled',
  PROMPT_ID: 'promptId',
  DEVELOPER_MODE: 'isDeveloperMode',
  DYNAMIC_REASONING: 'isDynamicReasoningEnabled',
  IMAGE_GENERATION: 'isImageGenerationEnabled',
} as const;

const getInitialSettings = () => {
  const getStoredBoolean = (key: string, defaultValue: boolean): boolean => {
    if (!isBrowser) {
      return defaultValue;
    }

    const stored = localStorage.getItem(key);

    if (stored === null) {
      return defaultValue;
    }

    try {
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  };

  return {
    latestBranch: getStoredBoolean(SETTINGS_KEYS.LATEST_BRANCH, false),
    autoSelectTemplate: getStoredBoolean(SETTINGS_KEYS.AUTO_SELECT_TEMPLATE, false),
    contextOptimization: getStoredBoolean(SETTINGS_KEYS.CONTEXT_OPTIMIZATION, true),
    eventLogs: getStoredBoolean(SETTINGS_KEYS.EVENT_LOGS, true),
    promptId: isBrowser ? localStorage.getItem(SETTINGS_KEYS.PROMPT_ID) || 'default' : 'default',
    developerMode: getStoredBoolean(SETTINGS_KEYS.DEVELOPER_MODE, false),
    dynamicReasoning: getStoredBoolean(SETTINGS_KEYS.DYNAMIC_REASONING, false),
    imageGeneration: getStoredBoolean(SETTINGS_KEYS.IMAGE_GENERATION, false),
  };
};

const initialSettings = getInitialSettings();

export const latestBranchStore = atom<boolean>(initialSettings.latestBranch);
export const autoSelectStarterTemplate = atom<boolean>(initialSettings.autoSelectTemplate);
export const enableContextOptimizationStore = atom<boolean>(initialSettings.contextOptimization);
export const isEventLogsEnabled = atom<boolean>(initialSettings.eventLogs);
export const promptStore = atom<string>(initialSettings.promptId);
export const dynamicReasoningStore = atom<boolean>(initialSettings.dynamicReasoning);
export const imageGenerationStore = atom<boolean>(initialSettings.imageGeneration);

export const updateLatestBranch = (enabled: boolean) => {
  latestBranchStore.set(enabled);
  localStorage.setItem(SETTINGS_KEYS.LATEST_BRANCH, JSON.stringify(enabled));
};

export const updateAutoSelectTemplate = (enabled: boolean) => {
  autoSelectStarterTemplate.set(enabled);
  localStorage.setItem(SETTINGS_KEYS.AUTO_SELECT_TEMPLATE, JSON.stringify(enabled));
};

export const updateContextOptimization = (enabled: boolean) => {
  enableContextOptimizationStore.set(enabled);
  localStorage.setItem(SETTINGS_KEYS.CONTEXT_OPTIMIZATION, JSON.stringify(enabled));
};

export const updateEventLogs = (enabled: boolean) => {
  isEventLogsEnabled.set(enabled);
  localStorage.setItem(SETTINGS_KEYS.EVENT_LOGS, JSON.stringify(enabled));
};

export const updatePromptId = (id: string) => {
  promptStore.set(id);
  localStorage.setItem(SETTINGS_KEYS.PROMPT_ID, id);
};

export const updateDynamicReasoning = (enabled: boolean) => {
  dynamicReasoningStore.set(enabled);
  localStorage.setItem(SETTINGS_KEYS.DYNAMIC_REASONING, JSON.stringify(enabled));
};

export const updateImageGeneration = (enabled: boolean) => {
  imageGenerationStore.set(enabled);
  localStorage.setItem(SETTINGS_KEYS.IMAGE_GENERATION, JSON.stringify(enabled));
};

const getInitialTabConfiguration = (): TabWindowConfig => {
  const defaultConfig: TabWindowConfig = {
    userTabs: DEFAULT_TAB_CONFIG.filter((tab): tab is UserTabConfig => tab.window === 'user'),
  };

  if (!isBrowser) {
    return defaultConfig;
  }

  try {
    const saved = localStorage.getItem('falbor_tab_configuration');

    if (!saved) {
      return defaultConfig;
    }

    const parsed = JSON.parse(saved);

    if (!parsed?.userTabs) {
      return defaultConfig;
    }

    const parsedUserTabs = parsed.userTabs.filter((tab: TabVisibilityConfig): tab is UserTabConfig => tab.window === 'user');
    
    const parsedIds = new Set(parsedUserTabs.map((t: UserTabConfig) => t.id));
    const missingDefaults = defaultConfig.userTabs.filter(t => !parsedIds.has(t.id));

    return {
      userTabs: [...missingDefaults, ...parsedUserTabs],
    };
  } catch (error) {
    console.warn('Failed to parse tab configuration:', error);
    return defaultConfig;
  }
};

export const tabConfigurationStore = map<TabWindowConfig>(getInitialTabConfiguration());

export const resetTabConfiguration = () => {
  const defaultConfig: TabWindowConfig = {
    userTabs: DEFAULT_TAB_CONFIG.filter((tab): tab is UserTabConfig => tab.window === 'user'),
  };

  tabConfigurationStore.set(defaultConfig);
  localStorage.setItem('falbor_tab_configuration', JSON.stringify(defaultConfig));
};

interface SettingsStore {
  isOpen: boolean;
  selectedTab: string;
  openSettings: () => void;
  closeSettings: () => void;
  setSelectedTab: (tab: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  isOpen: false,
  selectedTab: 'user',

  openSettings: () => {
    set({
      isOpen: true,
      selectedTab: 'user',
    });
  },

  closeSettings: () => {
    set({
      isOpen: false,
      selectedTab: 'user',
    });
  },

  setSelectedTab: (tab: string) => {
    set({ selectedTab: tab });
  },
}));

export const applyDesignSchemeStore = atom<boolean>(
  typeof window !== 'undefined' ? localStorage.getItem('applyDesignScheme') === 'true' : false,
);

export const updateApplyDesignScheme = (enabled: boolean) => {
  applyDesignSchemeStore.set(enabled);
  if (typeof window !== 'undefined') {
    localStorage.setItem('applyDesignScheme', String(enabled));
  }
};
