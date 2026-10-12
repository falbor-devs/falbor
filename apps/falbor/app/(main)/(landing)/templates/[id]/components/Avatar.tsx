import React from 'react';
import type { User } from '../types';

export function initials(user?: User) {
  return (user?.displayName || user?.username || 'U')
    .trim()
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ user, small = false }: { user?: User; small?: boolean }) {
  const size = small ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm';

  return user?.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt=""
      className={`${size} rounded-full object-cover ring-4 ring-white dark:ring-slate-950`}
    />
  ) : (
    <div
      className={`${size} flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-semibold text-white ring-4 ring-white dark:ring-slate-950`}
      aria-hidden="true"
    >
      {initials(user)}
    </div>
  );
}
