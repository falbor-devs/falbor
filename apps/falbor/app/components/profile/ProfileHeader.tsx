'use client';

import { useState } from 'react';
import { classNames } from '~/utils/classNames';

interface ProfileHeaderProps {
  avatarUrl?: string;
  username: string;
  displayName?: string;
  location?: string;
  statusMessage?: string;
  badges?: any[];
  displayEmail?: boolean;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  isFollowing?: boolean;
  isCurrentUser?: boolean;
  subscriptionTier?: string;
}

export function ProfileHeader({
  avatarUrl, username, displayName, location, statusMessage, badges = [],
  displayEmail, instagram, linkedin, twitter,
  isFollowing: initialIsFollowing = false, isCurrentUser = false, subscriptionTier = 'free'
}: ProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);

  const display = displayName || username;

  const handleFollowToggle = async () => {
    setIsLoadingFollow(true);
    try {
      const res = await fetch(`/api/profiles/${username}/follow`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error("Failed to toggle follow", error);
    } finally {
      setIsLoadingFollow(false);
    }
  };

  return (
    <div className="relative px-4 sm:px-8 -mt-12 sm:-mt-16 mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
        {}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-4 border-[#F1EEEA] dark:border-transparent bg-white flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={display}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500">
              <div className="i-ph:user text-4xl" />
            </div>
          )}

          {}
          {statusMessage && (
            <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" title={statusMessage} />
          )}
        </div>

        <div className="flex flex-col pb-2">
          {}
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {location && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow-sm">
                <div className="i-ph:map-pin-fill text-orange-400" />
                {location}
              </span>
            )}
          </div>

          <div className='relative top-1'>
            <h1 className="text-xl sm:text-2xl leading-none font-semibold tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5">
              {display}
              {}
              {subscriptionTier !== 'free' && (
                <div className="flex items-center gap-1">
                  <div className="i-ph:seal-check-fill text-blue-500 w-6 h-6" title="Verified Account" />
                  {}
                </div>
              )}
            </h1>

            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">@{username}</p>
          </div>

          {statusMessage && (
            <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-2 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
              {statusMessage}
            </p>
          )}
        </div>
      </div>

      {}
      <div className="flex flex-col sm:items-end gap-3 sm:mt-0 self-start sm:self-end">
        {!isCurrentUser && (
          <button
            onClick={handleFollowToggle}
            disabled={isLoadingFollow}
            className={classNames(
              "px-4 py-1.5 text-sm rounded-lg relative top-3 font-medium transition-all shadow-sm flex items-center justify-center gap-1.5",
              isFollowing
                ? "bg-gray-200 text-gray-800 hover:bg-red-100 hover:text-red-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-red-900/30 dark:hover:text-red-400 border border-gray-300 dark:border-gray-700"
                : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100",
              isLoadingFollow ? "opacity-50 cursor-not-allowed" : ""
            )}
          >
            {isLoadingFollow && <div className="i-ph:spinner-gap animate-spin w-3.5 h-3.5" />}
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
        <div className="flex items-center gap-3 mt-4 sm:mt-0 sm:pb-2 self-start sm:self-end">
          {displayEmail && (
            <a href={`mailto:hello@${username.toLowerCase().replace(/\s+/g, '')}.com`} className="text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors" title="Email">
              <div className="i-ph:envelope-simple text-xl" />
            </a>
          )}
          {instagram && (
            <a href={instagram} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors" title="Instagram">
              <div className="i-ph:instagram-logo text-xl" />
            </a>
          )}
          {linkedin && (
            <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors" title="LinkedIn">
              <div className="i-ph:linkedin-logo text-xl" />
            </a>
          )}
          {twitter && (
            <a href={twitter} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors" title="Twitter">
              <div className="i-ph:x-logo text-xl" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
