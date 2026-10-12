import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '~/lib/db';
import { users, follows } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';

async function getFollowing(username: string) {
  let rawUsername = username;
  if (rawUsername.startsWith('%40') || rawUsername.startsWith('@')) {
    rawUsername = rawUsername.replace(/^%40|^@/, '');
  }
  const decodedUsername = decodeURIComponent(rawUsername);

  
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, decodedUsername))
    .limit(1);

  if (!targetUser) return null;

  
  const followingList = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(eq(follows.followerId, targetUser.id));

  return followingList;
}

export default async function FollowingPage({ params }: { params: { username: string } }) {
  const following = await getFollowing(params.username);

  if (!following) {
    notFound();
  }

  const displayUsername = decodeURIComponent(params.username).replace(/^@/, '');

  return (
    <div className="w-full min-h-screen bg-[#F1EEEA] dark:bg-transparent antialiased font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href={`/u/${displayUsername}`} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2">
            <div className="i-ph:arrow-left" />
            Back to profile
          </Link>
          <h1 className="text-3xl font-bold mt-4 text-gray-900 dark:text-white">Following</h1>
        </div>

        {following.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="i-ph:users text-4xl mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">@{displayUsername} isn't following anyone yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800/50">
            {following.map(user => (
              <Link 
                key={user.id} 
                href={`/u/${user.username || user.displayName}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 flex-shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName || ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">
                      <div className="i-ph:user" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user.displayName || user.username}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
