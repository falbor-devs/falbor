import { create } from 'zustand';
import Cookies from 'js-cookie';
import type { MCPConfig, MCPServerTools } from '~/lib/services/mcpService';

const isBrowser = typeof window !== 'undefined';

function getStorageKey(): string {
  if (typeof window === 'undefined') return 'mcp_settings_anonymous';
  try {
    const token = Cookies.get('session');
    if (!token) return 'mcp_settings_anonymous';
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return 'mcp_settings_anonymous';
    const payload = JSON.parse(atob(payloadBase64));
    return `mcp_settings_${payload.userId || 'anonymous'}`;
  } catch (e) {
    return 'mcp_settings_anonymous';
  }
}

type MCPSettings = {
  mcpConfig: MCPConfig;
  maxLLMSteps: number;
  mcpEnabled: boolean;
};

const defaultSettings = {
  maxLLMSteps: 10,
  mcpEnabled: true,
  mcpConfig: {
    mcpServers: {},
  },
} satisfies MCPSettings;

type Store = {
  isInitialized: boolean;
  settings: MCPSettings;
  serverTools: MCPServerTools;
  error: string | null;
  isUpdatingConfig: boolean;
  selectedMCPs: string[];
};

type Actions = {
  initialize: () => Promise<void>;
  updateSettings: (settings: MCPSettings) => Promise<void>;
  checkServersAvailabilities: () => Promise<void>;
  toggleSelectedMCP: (serverName: string) => void;
  clearSelectedMCPs: () => void;
};

export const useMCPStore = create<Store & Actions>((set, get) => ({
  isInitialized: false,
  settings: defaultSettings,
  serverTools: {},
  error: null,
  isUpdatingConfig: false,
  selectedMCPs: [],
  initialize: async () => {
    if (get().isInitialized) {
      return;
    }

    if (isBrowser) {
      const storageKey = getStorageKey();
      const savedConfig = localStorage.getItem(storageKey);

      if (savedConfig) {
        try {
          const settings = JSON.parse(savedConfig) as MCPSettings;
          const serverTools = await updateServerConfig(settings.mcpConfig);
          set(() => ({ settings, serverTools }));
        } catch (error) {
          console.error('Error parsing saved mcp config:', error);
          set(() => ({
            error: `Error parsing saved mcp config: ${error instanceof Error ? error.message : String(error)}`,
          }));
        }
      } else {
        localStorage.setItem(storageKey, JSON.stringify(defaultSettings));
      }
    }

    set(() => ({ isInitialized: true }));
  },
  updateSettings: async (newSettings: MCPSettings) => {
    if (get().isUpdatingConfig) {
      return;
    }

    try {
      set(() => ({ isUpdatingConfig: true }));

      const serverTools = await updateServerConfig(newSettings.mcpConfig);

      if (isBrowser) {
        localStorage.setItem(getStorageKey(), JSON.stringify(newSettings));
      }

      set(() => ({ settings: newSettings, serverTools }));
    } catch (error) {
      throw error;
    } finally {
      set(() => ({ isUpdatingConfig: false }));
    }
  },
  checkServersAvailabilities: async () => {
    const response = await fetch('/api/mcp-check', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }

    const serverTools = (await response.json()) as MCPServerTools;

    set(() => ({ serverTools }));
  },
  toggleSelectedMCP: (serverName: string) => {
    set((state) => {
      const isSelected = state.selectedMCPs.includes(serverName);
      if (isSelected) {
        return { selectedMCPs: state.selectedMCPs.filter((name) => name !== serverName) };
      } else {
        return { selectedMCPs: [...state.selectedMCPs, serverName] };
      }
    });
  },
  clearSelectedMCPs: () => {
    set({ selectedMCPs: [] });
  },
}));

async function updateServerConfig(config: MCPConfig) {
  const response = await fetch('/api/mcp-update-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as MCPServerTools;

  return data;
}
