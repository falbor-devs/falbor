import React from 'react';
import Link from 'next/link';

export interface TemplateUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Template {
  id: string;
  name: string;
  shortDescription: string;
  mainImage: string | null;
  createdAt: string;
  user: TemplateUser | null;
}

interface TemplateCardProps {
  template: Template;
}

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Link
      href={`/templates/${template.id}`}
      className="group flex flex-col w-[90%] rounded-md overflow-hidden bg-transparent"
    >
      <div className="w-[90%] h-[400px] rounded-md overflow-hidden bg-[#F3F0F5] dark:bg-[#111] mb-4 border border-[#D6D5DE] dark:border-[#333] relative">
        {template.mainImage ? (
          <img
            src={template.mainImage}
            alt={template.name}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
            <div className="i-ph:image w-10 h-10" />
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 px-1">
        <h3 className="text-md font-semibold w-[90%] text-black dark:text-white mb-1">
          {template.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
          {template.shortDescription}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            {template.user?.avatarUrl ? (
              <img src={template.user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300">
                {template.user?.displayName?.charAt(0) || template.user?.username?.charAt(0) || 'U'}
              </div>
            )}
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {template.user?.displayName || template.user?.username || 'Unknown User'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}