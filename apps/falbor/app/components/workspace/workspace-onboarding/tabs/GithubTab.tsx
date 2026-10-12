import React from 'react';
import { GitHubRepositorySelector } from '~/components/@settings/tabs/github/components/GitHubRepositorySelector';

interface GithubTabProps {
  githubRepoSelected: { url: string; branch?: string } | null;
  setGithubRepoSelected: (val: { url: string; branch?: string } | null) => void;
}

export function GithubTab({ githubRepoSelected, setGithubRepoSelected }: GithubTabProps) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1C1D21] flex items-center justify-center text-gray-600 dark:text-gray-400">
          <div className="i-ph:github-logo text-2xl" />
        </div>
        <div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">Connect GitHub</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">The central bridge connecting your code into Falbor</p>
        </div>
      </div>
      <div className="space-y-6">
        {githubRepoSelected ? (
          <div className="p-4 bg-gray-100 dark:bg-[#1C1D21] border border-[#0099ff] rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900 dark:text-white font-medium">Repository Selected</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{githubRepoSelected.url}</p>
            </div>
            <button
              onClick={() => setGithubRepoSelected(null)}
              className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <GitHubRepositorySelector
            onClone={(url, branch) => setGithubRepoSelected({ url, branch })}
          />
        )}
      </div>
    </div>
  );
}
