import { atom, computed } from 'nanostores';
import Cookies from 'js-cookie';
import { logStore } from '~/lib/stores/logs';
import { gitHubApiService } from '~/lib/services/githubApiService';
import { calculateStatsSummary } from '~/utils/githubStats';
import type { GitHubConnection } from '~/types/GitHub';

const githubConnectionAtom = atom<GitHubConnection>({
  user: null,
  token: '',
  tokenType: 'classic',
});

function initializeConnection() {
  try {
    const savedConnection = localStorage.getItem('github_connection');

    if (savedConnection) {
      const parsed = JSON.parse(savedConnection);

      if (!parsed.tokenType) {
        parsed.tokenType = 'classic';
      }

      if (parsed.user) {
        githubConnectionAtom.set(parsed);
      }
    }
  } catch (error) {
    console.error('Error initializing GitHub connection:', error);
    localStorage.removeItem('github_connection');
  }
}

if (typeof window !== 'undefined') {
  initializeConnection();
}

export const isGitHubConnected = computed(githubConnectionAtom, (connection) => !!connection.user);

export const githubStatsSummary = computed(githubConnectionAtom, (connection) => {
  if (!connection.stats) {
    return null;
  }

  return calculateStatsSummary(connection.stats);
});

export const isGitHubConnecting = atom(false);
export const isGitHubLoadingStats = atom(false);

export const githubConnectionStore = {
  get: () => githubConnectionAtom.get(),

  async connect(token: string, tokenType: 'classic' | 'fine-grained' = 'classic'): Promise<void> {
    if (isGitHubConnecting.get()) {
      throw new Error('Connection already in progress');
    }

    isGitHubConnecting.set(true);

    try {
      const { user, rateLimit } = await gitHubApiService.fetchUser(token, tokenType);

      const connection: GitHubConnection = {
        user,
        token,
        tokenType,
        rateLimit,
      };

      Cookies.set('githubUsername', user.login);
      Cookies.set('githubToken', token);
      Cookies.set('git:github.com', JSON.stringify({ username: token, password: 'x-oauth-basic' }));

      localStorage.setItem('github_connection', JSON.stringify(connection));

      githubConnectionAtom.set(connection);

      logStore.logInfo('Connected to GitHub', {
        type: 'system',
        message: `Connected to GitHub as ${user.login}`,
      });

      this.fetchStats().catch((error) => {
        console.error('Failed to fetch initial GitHub stats:', error);
      });
    } catch (error) {
      console.error('Failed to connect to GitHub:', error);
      logStore.logError(`GitHub authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        type: 'system',
        message: 'GitHub authentication failed',
      });
      throw error;
    } finally {
      isGitHubConnecting.set(false);
    }
  },

  disconnect(): void {
    githubConnectionAtom.set({
      user: null,
      token: '',
      tokenType: 'classic',
    });

    localStorage.removeItem('github_connection');

    Cookies.remove('githubUsername');
    Cookies.remove('githubToken');
    Cookies.remove('git:github.com');

    gitHubApiService.clearCache();

    logStore.logInfo('Disconnected from GitHub', {
      type: 'system',
      message: 'Disconnected from GitHub',
    });
  },

  async fetchStats(): Promise<void> {
    const connection = githubConnectionAtom.get();

    if (!connection.user || !connection.token) {
      throw new Error('Not connected to GitHub');
    }

    if (isGitHubLoadingStats.get()) {
      return;
    }

    isGitHubLoadingStats.set(true);

    try {
      const stats = await gitHubApiService.fetchStats(connection.token, connection.tokenType);

      const updatedConnection: GitHubConnection = {
        ...connection,
        stats,
      };

      localStorage.setItem('github_connection', JSON.stringify(updatedConnection));

      githubConnectionAtom.set(updatedConnection);

      logStore.logInfo('GitHub stats refreshed', {
        type: 'system',
        message: 'Successfully refreshed GitHub statistics',
      });
    } catch (error) {
      console.error('Failed to fetch GitHub stats:', error);

      if (error instanceof Error && error.message.includes('401')) {
        logStore.logError('GitHub token has expired', {
          type: 'system',
          message: 'GitHub token has expired. Please reconnect your account.',
        });
        this.disconnect();
      }

      throw error;
    } finally {
      isGitHubLoadingStats.set(false);
    }
  },

  updateTokenType(tokenType: 'classic' | 'fine-grained'): void {
    const connection = githubConnectionAtom.get();
    const updatedConnection = {
      ...connection,
      tokenType,
    };

    githubConnectionAtom.set(updatedConnection);
    localStorage.setItem('github_connection', JSON.stringify(updatedConnection));
  },

  clearCache(): void {
    const connection = githubConnectionAtom.get();

    if (connection.token) {
      gitHubApiService.clearUserCache(connection.token);
    }
  },

  subscribe: githubConnectionAtom.subscribe.bind(githubConnectionAtom),
};

export { githubConnectionAtom };
