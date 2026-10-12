'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';

interface B2BSidebarProps {
  profile: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
  };
}

export function B2BSidebar({ profile }: B2BSidebarProps) {
  const router = useRouter();
  const rawPathname = usePathname();
  const searchParams = useSearchParams();

  const pathname = rawPathname || '';
  const currentTab = searchParams.get('tab');

  const isMoneySection =
    pathname.includes('/earnings') || pathname.includes('/revenue');

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }

    router.push('/login?role=marketer');
    router.refresh();
  };

  const navItems = [
    {
      label: 'Home',
      href: `/b2b/${profile.id}`,
      renderIcon: (active: boolean) => (
        <svg
          className={`w-6 h-6 ${active ? 'text-zinc-600 dark:text-zinc-200' : 'text-zinc-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: 'Messages',
      href: `/b2b/${profile.id}/messages`,
      renderIcon: (active: boolean) => (
        <svg
          className={`w-6 h-6 ${active
            ? 'text-zinc-600 dark:text-zinc-200'
            : 'text-zinc-500'
            }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
    {
      label: 'Money',
      href: `/b2b/${profile.id}/earnings`,
      renderIcon: (active: boolean) => (
        <div
          className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs border ${active
            ? 'text-black border-zinc-500'
            : 'border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
            }`}
        >
          $
        </div>
      ),
    },
  ];

  const subItems = [
    {
      label: 'Earnings',
      href: `/b2b/${profile.id}/earnings`,
      active: isMoneySection && !currentTab,
    },
    {
      label: 'Transactions',
      href: `/b2b/${profile.id}/earnings?tab=transactions`,
      active: isMoneySection && currentTab === 'transactions',
    },
    {
      label: 'Payout',
      href: `/b2b/${profile.id}/earnings?tab=payout`,
      active: isMoneySection && currentTab === 'payout',
    },
  ];

  return (
    <aside
      className={`bg-white dark:bg-[#09090b] flex py-6 flex-shrink-0 select-none border-r border-zinc-200 dark:border-zinc-800 transition-all duration-200 ${isMoneySection ? 'w-56' : 'w-20'
        }`}
    >
      {/* Primary Icon Column */}
      <div className="w-20 flex flex-col items-center flex-shrink-0">
        <div className="mb-8">
          <Dropdown
            align="start"
            side="right"
            trigger={
              <button className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:ring-2 hover:ring-amber-400 transition-all outline-none">
                {profile.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-5 h-5 text-zinc-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </button>
            }
          >
            <DropdownItem
              onSelect={() =>
                router.push(`/marketers/profile/${profile.id}`)
              }
            >
              <span className="i-ph:user-circle h-4 w-4 mr-2 text-zinc-500" />
              Public Profile
            </DropdownItem>

            <DropdownItem
              onSelect={() =>
                router.push(`/b2b/${profile.id}/settings/edit`)
              }
            >
              <span className="i-ph:gear-six h-4 w-4 mr-2 text-zinc-500" />
              Settings
            </DropdownItem>

            <DropdownItem
              onSelect={handleLogout}
              className="text-red-600 dark:text-red-400"
            >
              <span className="i-ph:sign-out h-4 w-4 mr-2" />
              Log Out
            </DropdownItem>
          </Dropdown>
        </div>

        <nav className="flex-1 flex flex-col items-center gap-6 w-full">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.label === 'Money' && isMoneySection);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center gap-1 group w-full py-1.5 transition-colors ${isActive
                  ? 'text-[#0099ff] font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
              >
                <div
                  className={`p-2 rounded-xl transition-all ${isActive
                    ? 'bg-[#0099ff]/20'
                    : 'group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800'
                    }`}
                >
                  {item.renderIcon(isActive)}
                </div>

                <span className="text-[10px] tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Money Sub Navigation */}
      {isMoneySection && (
        <div className="flex-1 flex flex-col pl-2 pt-2 pr-3 space-y-1.5 border-l border-zinc-100 dark:border-zinc-900">
          {subItems.map((sub) => (
            <Link
              key={sub.label}
              href={sub.href}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${sub.active
                ? 'bg-[#0099ff]/20 text-[#0099ff]'
                : 'text-zinc-500 hover:bg-[#0099ff]/20 hover:text-[#0099ff]'
                }`}
            >
              {sub.label}
            </Link>
          ))}
        </div>
      )}
    </aside>
  );
}