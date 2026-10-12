'use client';
import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { motion } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { profileStore } from '~/lib/stores/profile';
import { useAuth } from '~/hooks/useAuth';
import type { TabType, Profile } from './types';
import { useTranslation } from '~/lib/i18n/useTranslation';

interface AvatarDropdownProps {
  onSelectTab: (tab: TabType) => void;
}

export const AvatarDropdown = ({ onSelectTab }: AvatarDropdownProps) => {
  const { t } = useTranslation();
  const profile = useStore(profileStore) as Profile;
  const { user } = useAuth();
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [profile?.avatar, typeof window !== 'undefined' ? window.location.pathname : '']);

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center focus:outline-none hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          {profile?.avatar && profile.avatar !== 'undefined' && profile.avatar !== 'null' && !imgError ? (
            <img
              src={profile.avatar}
              alt={profile?.username || 'Profile'}
              className="w-full h-full rounded-full object-cover"
              loading="eager"
              decoding="sync"
              onError={() => setImgError(true)}
            />
          ) : null}
          <div className={classNames("w-full h-full rounded-full items-center justify-center bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500", profile?.avatar && profile.avatar !== 'undefined' && profile.avatar !== 'null' && !imgError ? "hidden" : "flex")}>
            <div className="i-ph:user w-6 h-6" />
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={classNames(
            'min-w-[240px] z-[9999]',
            'bg-white dark:bg-[#141414]',
            'rounded-lg shadow-lg',
            'border border-gray-200/50 dark:border-gray-800/50',
            'animate-in fade-in-0 zoom-in-95',
            'py-1',
          )}
          sideOffset={8}
          align="end"
          avoidCollisions
          collisionPadding={16}
        >
          {}
          <div
            className={classNames(
              'px-4 py-3 flex items-center gap-3',
              'border-b border-gray-200/50 dark:border-gray-800/50',
            )}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm">
              {profile?.avatar && profile.avatar !== 'undefined' && profile.avatar !== 'null' && !imgError ? (
                <img
                  src={profile.avatar}
                  alt={profile?.username || 'Profile'}
                  className={classNames('w-full h-full', 'object-cover', 'transform-gpu', 'image-rendering-crisp')}
                  loading="eager"
                  decoding="sync"
                  onError={() => setImgError(true)}
                />
              ) : null}
              <div className={classNames("w-full h-full items-center justify-center text-gray-400 dark:text-gray-500 font-medium text-lg", profile?.avatar && profile.avatar !== 'undefined' && profile.avatar !== 'null' && !imgError ? "hidden" : "flex")}>
                <div className="i-ph:user w-6 h-6" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                {profile?.username || user?.displayName || user?.email?.split('@')[0] || t('guest')}
              </div>
              {profile?.bio && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile.bio}</div>}
            </div>
          </div>

          {}
          <DropdownMenu.Item
            className={classNames(
              'flex items-center gap-2 px-4 py-2.5',
              'text-sm text-gray-700 dark:text-gray-200',
              'hover:bg-purple-50 dark:hover:bg-purple-500/10',
              'hover:text-purple-500 dark:hover:text-purple-400',
              'cursor-pointer transition-all duration-200',
              'outline-none',
              'group',
            )}
            onClick={() => {
              const username = profile?.username || user?.displayName || '';
              if (username) {
                window.open(`/u/@${encodeURIComponent(username.trim())}`, '_blank');
              }
            }}
          >
            <div className="i-ph:identification-card w-4 h-4 text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
            Public Profile
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={classNames(
              'flex items-center gap-2 px-4 py-2.5',
              'text-sm text-gray-700 dark:text-gray-200',
              'hover:bg-purple-50 dark:hover:bg-purple-500/10',
              'hover:text-purple-500 dark:hover:text-purple-400',
              'cursor-pointer transition-all duration-200',
              'outline-none',
              'group',
            )}
            onClick={() => onSelectTab('profile')}
          >
            <div className="i-ph:user-circle w-4 h-4 text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
            {t('edit_profile')}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={classNames(
              'flex items-center gap-2 px-4 py-2.5',
              'text-sm text-gray-700 dark:text-gray-200',
              'hover:bg-purple-50 dark:hover:bg-purple-500/10',
              'hover:text-purple-500 dark:hover:text-purple-400',
              'cursor-pointer transition-all duration-200',
              'outline-none',
              'group',
            )}
            onClick={() => onSelectTab('settings')}
          >
            <div className="i-ph:gear-six w-4 h-4 text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
            {t('settings')}
          </DropdownMenu.Item>

          <div className="my-1 border-t border-gray-200/50 dark:border-gray-800/50" />

          <DropdownMenu.Item
            className={classNames(
              'flex items-center gap-2 px-4 py-2.5',
              'text-sm text-gray-700 dark:text-gray-200',
              'hover:bg-purple-50 dark:hover:bg-purple-500/10',
              'hover:text-purple-500 dark:hover:text-purple-400',
              'cursor-pointer transition-all duration-200',
              'outline-none',
              'group',
            )}
            onClick={async () => {
              try {
                const { downloadDebugLog } = await import('~/utils/debugLogger');
                await downloadDebugLog();
              } catch (error) {
                console.error('Failed to download debug log:', error);
              }
            }}
          >
            <div className="i-ph:download w-4 h-4 text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
            {t('download_debug_log')}
          </DropdownMenu.Item>

          {}
          <div className="my-1 border-t border-gray-200/50 dark:border-gray-800/50" />

          <DropdownMenu.Item
            className={classNames(
              'flex items-center gap-2 px-4 py-2.5',
              'text-sm text-red-500 dark:text-red-400',
              'hover:bg-red-50 dark:hover:bg-red-500/10',
              'hover:text-red-600 dark:hover:text-red-300',
              'cursor-pointer transition-all duration-200',
              'outline-none',
              'group',
            )}
            onClick={() => onSelectTab('logout')}
          >
            <div className="i-ph:sign-out w-4 h-4 transition-colors" />
            {t('sign_out')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};