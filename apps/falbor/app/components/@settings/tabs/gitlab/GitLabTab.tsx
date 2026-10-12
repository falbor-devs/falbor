'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGitLabConnection } from '~/lib/hooks';
import GitLabConnection from './components/GitLabConnection';
import { StatsDisplay } from './components/StatsDisplay';
import { RepositoryList } from './components/RepositoryList';


const GitLabLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path
      fill="currentColor"
      d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"
    />
  </svg>
);

interface ConnectionTestResult {
  status: 'success' | 'error' | 'testing';
  message: string;
  timestamp?: number;
}

export default function GitLabTab() {
  const { connection, isConnected, isLoading, error, testConnection, refreshStats } = useGitLabConnection();
  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult | null>(null);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  const handleTestConnection = async () => {
    if (!connection?.user) {
      setConnectionTest({
        status: 'error',
        message: 'No connection established',
        timestamp: Date.now(),
      });
      return;
    }

    setConnectionTest({
      status: 'testing',
      message: 'Testing connection...',
    });

    try {
      const isValid = await testConnection();

      if (isValid) {
        setConnectionTest({
          status: 'success',
          message: `Connected successfully as ${connection.user.username}`,
          timestamp: Date.now(),
        });
      } else {
        setConnectionTest({
          status: 'error',
          message: 'Connection test failed',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      setConnectionTest({
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      });
    }
  };

  
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <GitLabLogo />
          <h2 className="text-lg font-medium text-falbor-elements-textPrimary">GitLab Integration</h2>
        </div>
        <div className="flex items-center justify-center p-4">
          <div className="flex items-center gap-2">
            <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
            <span className="text-falbor-elements-textSecondary">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  
  if (error && !connection) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <GitLabLogo />
          <h2 className="text-lg font-medium text-falbor-elements-textPrimary">GitLab Integration</h2>
        </div>
        <div className="text-sm text-red-600 dark:text-red-400 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          {error}
        </div>
      </div>
    );
  }

  
  if (!isConnected || !connection) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <GitLabLogo />
          <h2 className="text-lg font-medium text-falbor-elements-textPrimary">GitLab Integration</h2>
        </div>
        <p className="text-sm text-falbor-elements-textSecondary">
          Connect your GitLab account to enable advanced repository management features, statistics, and seamless
          integration.
        </p>
        <GitLabConnection connectionTest={connectionTest} onTestConnection={handleTestConnection} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {}
      <motion.div
        className="flex items-center justify-between gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <GitLabLogo />
          <h2 className="text-lg font-medium text-falbor-elements-textPrimary dark:text-falbor-elements-textPrimary">
            GitLab Integration
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {connection?.rateLimit && (
            <div className="flex items-center gap-2 px-3 py-1 bg-falbor-elements-background-depth-1 rounded-lg text-xs">
              <div className="i-ph:cloud w-4 h-4 text-falbor-elements-textSecondary" />
              <span className="text-falbor-elements-textSecondary">
                API: {connection.rateLimit.remaining}/{connection.rateLimit.limit}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      <p className="text-sm text-falbor-elements-textSecondary dark:text-falbor-elements-textSecondary">
        Manage your GitLab integration with advanced repository features and comprehensive statistics
      </p>

      {}
      {connectionTest && (
        <div
          className={`p-3 rounded-lg border ${connectionTest.status === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : connectionTest.status === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 ${connectionTest.status === 'success'
                ? 'text-green-600'
                : connectionTest.status === 'error'
                  ? 'text-red-600'
                  : 'text-blue-600'
                }`}
            >
              {connectionTest.status === 'success' ? (
                <div className="i-ph:check-circle" />
              ) : connectionTest.status === 'error' ? (
                <div className="i-ph:x-circle" />
              ) : (
                <div className="i-ph:spinner animate-spin" />
              )}
            </div>
            <span
              className={`text-sm ${connectionTest.status === 'success'
                ? 'text-green-800 dark:text-green-200'
                : connectionTest.status === 'error'
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-blue-800 dark:text-blue-200'
                }`}
            >
              {connectionTest.message}
            </span>
          </div>
        </div>
      )}

      {}
      <GitLabConnection connectionTest={connectionTest} onTestConnection={handleTestConnection} />

      {}
      {connection?.user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border-t border-falbor-elements-borderColor pt-6"
        >
          <div className="flex items-center gap-4 p-4 bg-falbor-elements-background-depth-1 rounded-lg">
            <div className="w-12 h-12 rounded-full border-2 border-falbor-elements-item-contentAccent flex items-center justify-center bg-falbor-elements-background-depth-2 overflow-hidden">
              {connection.user.avatar_url &&
                connection.user.avatar_url !== 'null' &&
                connection.user.avatar_url !== '' ? (
                <img
                  src={connection.user.avatar_url}
                  alt={connection.user.username}
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';

                    const parent = target.parentElement;

                    if (parent) {
                      parent.innerHTML = (connection.user?.name || connection.user?.username || 'U')
                        .charAt(0)
                        .toUpperCase();
                      parent.classList.add(
                        'text-white',
                        'font-semibold',
                        'text-sm',
                        'flex',
                        'items-center',
                        'justify-center',
                      );
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-falbor-elements-item-contentAccent flex items-center justify-center text-white font-semibold text-sm">
                  {(connection.user?.name || connection.user?.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-falbor-elements-textPrimary">
                {connection.user?.name || connection.user?.username}
              </h4>
              <p className="text-sm text-falbor-elements-textSecondary">{connection.user?.username}</p>
            </div>
          </div>
        </motion.div>
      )}

      {}
      {connection?.stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="border-t border-falbor-elements-borderColor pt-6"
        >
          <h3 className="text-base font-medium text-falbor-elements-textPrimary mb-4">Statistics</h3>
          <StatsDisplay
            stats={connection.stats}
            onRefresh={async () => {
              setIsRefreshingStats(true);

              try {
                await refreshStats();
              } catch (error) {
                console.error('Failed to refresh stats:', error);
              } finally {
                setIsRefreshingStats(false);
              }
            }}
            isRefreshing={isRefreshingStats}
          />
        </motion.div>
      )}

      {}
      {connection?.stats?.projects && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="border-t border-falbor-elements-borderColor pt-6"
        >
          <RepositoryList
            repositories={connection.stats.projects}
            onRefresh={async () => {
              setIsRefreshingStats(true);

              try {
                await refreshStats();
              } catch (error) {
                console.error('Failed to refresh repositories:', error);
              } finally {
                setIsRefreshingStats(false);
              }
            }}
            isRefreshing={isRefreshingStats}
          />
        </motion.div>
      )}
    </div>
  );
}
