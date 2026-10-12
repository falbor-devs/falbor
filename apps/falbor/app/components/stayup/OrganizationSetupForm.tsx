'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetupButton } from '~/components/ui/setup/SetupButton';
import { Input } from '~/components/ui/Input';

export function OrganizationSetupForm() {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Organization name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      
      const res = await fetch('/api/stayup/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, url })
      });

      const data = await res.json();

      if (res.ok && data.project?.id) {
        
        router.push(`/${data.project.id}`);
        router.refresh();
      } else {
        setError(data.error || 'Failed to create organization');
        setLoading(false);
      }
    } catch (err) {
      setError('A network error occurred.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Organization Name
        </label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Corp"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Website URL (Optional)
        </label>
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="e.g. https://acme.com"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-2">
          This helps us automatically configure CORS settings for telemetry ingestion.
        </p>
      </div>

      <SetupButton
        type="submit"
        isLoading={loading}
        variant='secondary'
      >
        Create Organization
      </SetupButton>
    </form>
  );
}
