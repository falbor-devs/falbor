'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '~/components/ui/Input';
import { classNames } from '~/utils/classNames';
import { searchMetaInterests } from '~/lib/actions/metaAds';
import { COUNTRIES, GENDER_OPTIONS } from '../constants';
import type { MetaInterest, StepProps } from '../types';

interface AudienceStepProps extends StepProps {
  workspaceId: string;
}

export function AudienceStep({ draft, update, workspaceId }: AudienceStepProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MetaInterest[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      searchMetaInterests(workspaceId, query)
        .then(setResults)
        .catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(handle);
  }, [query, workspaceId]);

  const toggleCountry = (code: string) => {
    const next = draft.countries.includes(code)
      ? draft.countries.filter((c) => c !== code)
      : [...draft.countries, code];
    update({ countries: next });
  };

  const addInterest = (interest: MetaInterest) => {
    if (!draft.interests.find((i) => i.id === interest.id)) {
      update({ interests: [...draft.interests, interest] });
    }
    setQuery('');
    setResults([]);
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Locations</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar p-0.5">
          {COUNTRIES.map((c) => (
            <label key={c.code} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={draft.countries.includes(c.code)}
                onChange={() => toggleCountry(c.code)}
                className="accent-[#0866FF]"
              />
              {c.name}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Minimum Age</label>
          <Input
            type="number"
            min={18}
            max={65}
            value={draft.ageMin}
            onChange={(e) => update({ ageMin: parseInt(e.target.value) || 18 })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Maximum Age</label>
          <Input
            type="number"
            min={18}
            max={65}
            value={draft.ageMax}
            onChange={(e) => update({ ageMax: parseInt(e.target.value) || 65 })}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Gender</label>
        <div className="flex gap-2">
          {GENDER_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => update({ gender: g })}
              className={classNames(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                draft.gender === g
                  ? 'bg-[#0866FF] text-white'
                  : 'bg-gray-100 dark:bg-[#18181b] text-gray-600 dark:text-gray-400',
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Interests (optional)</label>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search interests e.g. fitness" />
        {results.length > 0 && (
          <div className="mt-1 border border-gray-200 dark:border-gray-800 rounded-lg max-h-32 overflow-y-auto custom-scrollbar">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => addInterest(r)}
                className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-[#18181b] text-gray-700 dark:text-gray-300"
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
        {draft.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {draft.interests.map((i) => (
              <span
                key={i.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0866FF]/10 text-[#0866FF] text-xs"
              >
                {i.name}
                <button
                  type="button"
                  onClick={() => update({ interests: draft.interests.filter((x) => x.id !== i.id) })}
                >
                  <i className="i-ph:x-bold text-[10px]" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
