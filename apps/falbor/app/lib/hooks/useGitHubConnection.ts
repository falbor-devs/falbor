import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import type { GitHubUserResponse, GitHubConnection } from '~/types/GitHub';
import { useGitHubAPI } from './useGitHubAPI';
import { githubConnection, isConnecting, updateGitHubConnection } from '~/lib/stores/github';

export interface ConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  isConnecting: boolean;
  connection: GitHubConnection | null;
  error: string | null;
  isServerSide: boolean;
}

export interface UseGitHubConnectionReturn extends ConnectionState {
  connect: (token: string, tokenType: 'classic' | 'fine-grained') => Promise<void>;
  disconnect: () => void;
  refreshConnection: () => Promise<void>;
  testConnection: () => Promise<boolean>;
}

const STORAGE_KEY = 'github_connection';

export function useGitHubConnection(): UseGitHubConnectionReturn {
  const connection = useStore(githubConnection);
  const connecting = useStore(isConnecting);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useGitHubAPI();
  useEffect(() => {
    loadSavedConnection();
  }, []);

  const loadSavedConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (connection?.user) {
        setIsLoading(false);
        return;
      }
      if (connection?.token && (!connection.user || !connection.stats)) {
        await refreshConnectionData(connection);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading saved connection:', error);
      setError('Failed to load saved connection');
      setIsLoading(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [connection]);

  const refreshConnectionData = useCallback(async (connection: GitHubConnection) => {
    if (!connection.token) {
      return;
    }

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `${connection.tokenType === 'classic' ? 'token' : 'Bearer'} ${connection.token}`,
          'User-Agent': 'Falbor',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const userData = (await response.json()) as GitHubUserResponse;

      const updatedConnection: GitHubConnection = {
        ...connection,
        user: userData,
      };

      updateGitHubConnection(updatedConnection);
    } catch (error) {
      console.error('Error refreshing connection data:', error);
    }
  }, []);

  const connect = useCallback(async (token: string, tokenType: 'classic' | 'fine-grained') => {
    if (!token.trim()) {
      setError('Token is required');
      return;
    }

    console.log('Setting isConnecting to true');
    isConnecting.set(true);
    setError(null);

    try {
      console.log('Making API request to GitHub...');
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `${tokenType === 'classic' ? 'token' : 'Bearer'} ${token}`,
          'User-Agent': 'Falbor',
        },
      });
      console.log('GitHub API response status:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }
      const userData = (await response.json()) as GitHubUserResponse;
      const connectionData: GitHubConnection = {
        user: userData,
        token,
        tokenType,
      };
      Cookies.set('githubToken', token);
      Cookies.set('githubUsername', userData.login);
      Cookies.set(
        'git:github.com',
        JSON.stringify({
          username: token,
          password: 'x-oauth-basic',
        }),
      );
      updateGitHubConnection(connectionData);

      toast.success(`Connected to GitHub as ${userData.login}`);
    } catch (error) {
      console.error('Failed to connect to GitHub:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to GitHub';

      setError(errorMessage);
      toast.error(`Failed to connect: ${errorMessage}`);
      throw error;
    } finally {
      isConnecting.set(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    Cookies.remove('githubToken');
    Cookies.remove('githubUsername');
    Cookies.remove('git:github.com');
    updateGitHubConnection({
      user: null,
      token: '',
      tokenType: 'classic',
    });

    setError(null);
    toast.success('Disconnected from GitHub');
  }, []);

  const refreshConnection = useCallback(async () => {
    if (!connection?.token) {
      throw new Error('No connection to refresh');
    }

    setIsLoading(true);
    setError(null);

    try {
      await refreshConnectionData(connection);
    } catch (error) {
      console.error('Error refreshing connection:', error);
      setError('Failed to refresh connection');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [connection, refreshConnectionData]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!connection) {
      return false;
    }

    try {
      const isServerSide = !connection.token;
      if (isServerSide) {
        const response = await fetch('/api/github-user');
        return response.ok;
      }
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `${connection.tokenType === 'classic' ? 'token' : 'Bearer'} ${connection.token}`,
          'User-Agent': 'Falbor',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }, [connection]);

  return {
    isConnected: !!connection?.user,
    isLoading,
    isConnecting: connecting,
    connection,
    error,
    isServerSide: !connection?.token,
    connect,
    disconnect,
    refreshConnection,
    testConnection,
  };
}
