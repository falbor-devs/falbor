'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  shortDescription: string;
  mainImage: string | null;
}

export function ProfileTemplatesSection({ userId }: { userId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    fetch(`/api/templates?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTemplates(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Templates</h3>
        <div className="animate-pulse flex gap-4 overflow-x-auto pb-4">
          {[1, 2].map((i) => (
            <div key={i} className="min-w-[280px] h-48 bg-gray-200 dark:bg-[#1e1e2e] rounded-xl border border-gray-200 dark:border-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return null; 
  }

  return (
    <div className="mt-12">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <div className="i-ph:storefront text-indigo-500 w-6 h-6" />
        Templates
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Link
            key={template.id}
            href={`/templates/${template.id}`}
            className="group bg-white dark:bg-[#1e1e2e] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-indigo-500 transition-all flex h-28"
          >
            <div className="w-1/3 bg-gray-100 dark:bg-[#111] overflow-hidden flex-shrink-0 relative">
              {template.mainImage ? (
                <img 
                  src={template.mainImage} 
                  alt={template.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <div className="i-ph:image w-6 h-6" />
                </div>
              )}
            </div>
            <div className="p-3 flex flex-col flex-1 overflow-hidden">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{template.name}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {template.shortDescription}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
