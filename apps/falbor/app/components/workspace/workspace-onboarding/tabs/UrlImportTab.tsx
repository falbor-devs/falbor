import React from 'react';

interface UrlImportTabProps {
  websiteUrl: string;
  setWebsiteUrl: (url: string) => void;
  urlVerified: boolean;
  setUrlVerified: (verified: boolean) => void;
  isValidPublicUrl: (url: string) => boolean;
}

export function UrlImportTab({
  websiteUrl,
  setWebsiteUrl,
  urlVerified,
  setUrlVerified,
  isValidPublicUrl
}: UrlImportTabProps) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1C1D21] flex items-center justify-center text-gray-600 dark:text-gray-400">
          <div className="i-ph:link text-2xl" />
        </div>
        <div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">Import by URL</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Scan a URL to extract product intent, audience, and pages</p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website URL</label>
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full bg-gray-50 dark:bg-[#1C1D21] text-gray-900 dark:text-white border border-gray-200 dark:border-transparent rounded-lg px-4 py-3 focus:outline-none focus:border-[#0099ff] focus:ring-1 focus:ring-[#0099ff]/50 transition-all"
        />
        <p className="text-xs text-gray-500 mt-3">
          Our system will crawl the provided URL and automatically configure the workspace context based on the site's content.
        </p>

        {websiteUrl.trim().length > 0 && !isValidPublicUrl(websiteUrl) && (
          <p className="text-sm text-red-500 dark:text-red-400 mt-2">
            Please enter a valid, public HTTPS URL (e.g., https://example.com).
          </p>
        )}

        <div className="mt-6 flex items-start gap-3 p-4 bg-gray-50 dark:bg-[#1C1D21]/50 rounded-lg border border-gray-200 dark:border-[#353538]">
          <input
            type="checkbox"
            id="verify-url"
            checked={urlVerified}
            onChange={(e) => setUrlVerified(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#0099ff] focus:ring-[#0099ff] focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 bg-white dark:bg-[#1C1D21] cursor-pointer"
          />
          <label htmlFor="verify-url" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            I confirm that I own this website or have explicit permission to import its content.
          </label>
        </div>
      </div>
    </div>
  );
}
