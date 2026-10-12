'use client';

import React, { useEffect, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { Badge, TemplateCard, type Template } from '~/components/ui';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTemplates(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex-1 w-full h-full bg-[#FAFAFA] dark:bg-[#111] overflow-y-auto">
      <div className="w-full h-[300px] md:h-[400px] relative bg-black overflow-hidden">
        <video
          className="w-full h-full object-cover opacity-70 block dark:hidden"
          autoPlay
          loop
          muted
          playsInline
          src="/background/video/templates-animation.mp4"
        />
        <video
          className="w-full h-full object-cover hidden dark:block"
          autoPlay
          loop
          muted
          playsInline
          src="/background/video/templates-animation-dark.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAFAFA] dark:from-[#111] via-transparent to-transparent pointer-events-none" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
          <h1 className="text-4xl md:text-5xl text-white mb-4 drop-shadow-lg">Community Templates<Badge variant="secondary" size='lg'>Beta</Badge></h1>
          <p className="text-lg md:text-lg text-gray-200 max-w-2xl drop-shadow-md">
            Discover and use templates built by the community.
          </p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-[#1e1e2e] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 h-80">
                <div className="h-48 bg-gray-200 dark:bg-[#2a2a3a] w-full" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 dark:bg-[#2a2a3a] rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-[#2a2a3a] rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-[#2a2a3a] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#1e1e2e] rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="i-ph:storefront w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No templates yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Be the first to publish a template!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
