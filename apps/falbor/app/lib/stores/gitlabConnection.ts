import { atom, computed } from 'nanostores';
import Cookies from 'js-cookie';
import { logStore } from '~/lib/stores/logs';
import { GitLabApiService } from '~/lib/services/gitlabApiService';
import { calculateStatsSummary } from '~/utils/gitlabStats';
import type { GitLabConnection, GitLabStats } from '~/types/GitLab';

const gitlabConnectionAtom = atom<GitLabConnection>({
  user: null,
  token: '',
  tokenType: 'personal-access-token',
});

const gitlabUrlAtom = atom('https://gitlab.com');

function initializeConnection() {
  try {
    const savedConnection = localStorage.getItem('gitlab_connection');

    if (savedConnection) {
      const parsed = JSON.parse(savedConnection);
      parsed.tokenType = 'personal-access-token';

      if (parsed.gitlabUrl) {
        gitlabUrlAtom.set(parsed.gitlabUrl);
      }

      if (parsed.user) {
        gitlabConnectionAtom.set(parsed);
      }
    }
  } catch (error) {
    console.error('Error initializing GitLab connection:', error);
    localStorage.removeItem('gitlab_connection');
  }
}

if (typeof window !== 'undefined') {
  initializeConnection();
}

export const isGitLabConnected = computed(gitlabConnectionAtom, (connection) => !!connection.user);

export const gitlabConnection = computed(gitlabConnectionAtom, (connection) => connection);

export const gitlabUser = computed(gitlabConnectionAtom, (connection) => connection.user);

export const gitlabStats = computed(gitlabConnectionAtom, (connection) => connection.stats);

export const gitlabUrl = computed(gitlabUrlAtom, (url) => url);

class GitLabConnectionStore {
  async connect(token: string, gitlabUrl = 'https://gitlab.com') {
    try {
      const apiService = new GitLabApiService(token, gitlabUrl);

      const user = await apiService.getUser();

      gitlabConnectionAtom.set({
        user,
        token,
        tokenType: 'personal-access-token',
        gitlabUrl,
      });

      Cookies.set('gitlabUsername', user.username);
      Cookies.set('gitlabToken', token);
      Cookies.set('git:gitlab.com', JSON.stringify({ username: user.username, password: token }));
      Cookies.set('gitlabUrl', gitlabUrl);

      localStorage.setItem(
        'gitlab_connection',
        JSON.stringify({
          user,
          token,
          tokenType: 'personal-access-token',
          gitlabUrl,
        }),
      );

      logStore.logInfo('Connected to GitLab', {
        type: 'system',
        message: `Connected to GitLab as ${user.username}`,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to connect to GitLab:', error);

      logStore.logError(`GitLab authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        type: 'system',
        message: 'GitLab authentication failed',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async fetchStats(_forceRefresh = false) {
    const connection = gitlabConnectionAtom.get();

    if (!connection.user || !connection.token) {
      throw new Error('Not connected to GitLab');
    }

    try {
      const apiService = new GitLabApiService(connection.token, connection.gitlabUrl || 'https://gitlab.com');

      const userData = await apiService.getUser();

      const projects = await apiService.getProjects();

      const events = await apiService.getEvents();

      const groups = await apiService.getGroups();

      const snippets = await apiService.getSnippets();

      const stats: GitLabStats = calculateStatsSummary(projects, events, groups, snippets, userData);

      gitlabConnectionAtom.set({
        ...connection,
        stats,
      });

      const updatedConnection = { ...connection, stats };
      localStorage.setItem('gitlab_connection', JSON.stringify(updatedConnection));

      return { success: true, stats };
    } catch (error) {
      console.error('Error fetching GitLab stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  disconnect() {
    Cookies.remove('gitlabToken');
    Cookies.remove('gitlabUsername');
    Cookies.remove('git:gitlab.com');
    Cookies.remove('gitlabUrl');

    localStorage.removeItem('gitlab_connection');

    gitlabConnectionAtom.set({
      user: null,
      token: '',
      tokenType: 'personal-access-token',
    });

    logStore.logInfo('Disconnected from GitLab', {
      type: 'system',
      message: 'Disconnected from GitLab',
    });
  }

  loadSavedConnection() {
    try {
      const savedConnection = localStorage.getItem('gitlab_connection');

      if (savedConnection) {
        const parsed = JSON.parse(savedConnection);
        parsed.tokenType = 'personal-access-token';

        if (parsed.gitlabUrl) {
          gitlabUrlAtom.set(parsed.gitlabUrl);
        }

        gitlabConnectionAtom.set(parsed);

        return parsed;
      }
    } catch (error) {
      console.error('Error parsing saved GitLab connection:', error);
      localStorage.removeItem('gitlab_connection');
    }

    return null;
  }

  setGitLabUrl(url: string) {
    gitlabUrlAtom.set(url);
  }

  setToken(token: string) {
    gitlabConnectionAtom.set({
      ...gitlabConnectionAtom.get(),
      token,
    });
  }

}

export const gitlabConnectionStore = new GitLabConnectionStore();

export function useGitLabConnection() {
  return {
    connection: gitlabConnection,
    isConnected: isGitLabConnected,
    user: gitlabUser,
    stats: gitlabStats,
    gitlabUrl,
    connect: gitlabConnectionStore.connect.bind(gitlabConnectionStore),
    disconnect: gitlabConnectionStore.disconnect.bind(gitlabConnectionStore),
    fetchStats: gitlabConnectionStore.fetchStats.bind(gitlabConnectionStore),
    loadSavedConnection: gitlabConnectionStore.loadSavedConnection.bind(gitlabConnectionStore),
    setGitLabUrl: gitlabConnectionStore.setGitLabUrl.bind(gitlabConnectionStore),
    setToken: gitlabConnectionStore.setToken.bind(gitlabConnectionStore),
  };
}
