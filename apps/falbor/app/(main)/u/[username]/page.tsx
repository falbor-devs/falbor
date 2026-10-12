import React from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { classNames } from '~/utils/classNames';
import { verifyToken, COOKIE_NAME } from '~/lib/auth';

import { ProfileCover } from '~/components/profile/ProfileCover';
import { ProfileHeader } from '~/components/profile/ProfileHeader';
import { ProfileBio } from '~/components/profile/ProfileBio';
import { ProfileSkills } from '~/components/profile/ProfileSkills';
import { ProfileLinksGrid } from '~/components/profile/ProfileLinksGrid';
import { ProfileActivity } from '~/components/profile/ProfileActivity';
import { ProfileAppsSection } from '~/components/profile/ProfileAppsSection';
import Link from 'next/link';

async function getCurrentUserId() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifyToken(token);
    return payload?.userId || null;
  }
  return null;
}

async function getProfile(username: string) {
  const { db } = await import('~/lib/db');
  const { users, follows } = await import('~/lib/db/schema');
  const { eq, and } = await import('drizzle-orm');

  let rawUsername = username;
  if (rawUsername.startsWith('%40') || rawUsername.startsWith('@')) {
    rawUsername = rawUsername.replace(/^%40|^@/, '');
  }
  const decodedUsername = decodeURIComponent(rawUsername);

  const currentUserId = await getCurrentUserId();

  try {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        coverUrl: users.coverUrl,
        timezone: users.timezone,
        displayEmail: users.displayEmail,
        instagramUrl: users.instagramUrl,
        linkedinUrl: users.linkedinUrl,
        twitterUrl: users.twitterUrl,
        customLinks: users.customLinks,
        location: users.location,
        statusMessage: users.statusMessage,
        skills: users.skills,
        badges: users.badges,
        stats: users.stats,
        subscriptionTier: users.subscriptionTier,
        profileApps: users.profileApps,
      })
      .from(users)
      .where(eq(users.username, decodedUsername))
      .limit(1);

    if (!user) {
      return null;
    }

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const [followRecord] = await db
        .select()
        .from(follows)
        .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, user.id)))
        .limit(1);

      if (followRecord) isFollowing = true;
    }

    
    const { sql } = await import('drizzle-orm');

    const [followersCountRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, user.id));

    const [followingCountRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followerId, user.id));

    const followersCount = Number(followersCountRes?.count || 0);
    const followingCount = Number(followingCountRes?.count || 0);
    const viewsCount = (user.stats as { views?: number })?.views || 0;

    return {
      id: user.id,
      username: user.username || user.displayName || "",
      displayName: user.displayName || "",
      avatar: user.avatarUrl || "",
      bio: user.bio || "",
      cover: user.coverUrl || "",
      timezone: user.timezone || "",
      displayEmail: user.displayEmail || false,
      instagram: user.instagramUrl || "",
      linkedin: user.linkedinUrl || "",
      twitter: user.twitterUrl || "",
      customLinks: (user.customLinks as any[]) || [],
      location: user.location || "",
      statusMessage: user.statusMessage || "",
      skills: (user.skills as any[]) || [],
      badges: (user.badges as any[]) || [],
      stats: { followers: followersCount, following: followingCount, views: viewsCount },
      subscriptionTier: user.subscriptionTier || "free",
      profileApps: (user.profileApps as any[]) || [],
      isFollowing,
      isCurrentUser: currentUserId === user.id
    };
  } catch (error) {
    console.error("Error fetching public profile:", error);
    return null;
  }
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const profile = await getProfile(params.username);

  if (!profile) {
    notFound();
  }

  return (
    <div className="w-full min-h-screen bg-[#F1EEEA] dark:bg-transparent antialiased font-sans">
      <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Link href="/"
          className='absolute top-2.5
          text-gray-500 hover:text-gray-900
           dark:hover:text-white transition-colors 
           flex items-center gap-2'>
          <div className="i-ph:arrow-left" />
          Go to the main page
        </Link>
        <ProfileCover coverUrl={profile.cover} username={profile.username} isCurrentUser={profile.isCurrentUser} />

        <ProfileHeader
          avatarUrl={profile.avatar}
          username={profile.username}
          displayName={profile.displayName}
          location={profile.location}
          statusMessage={profile.statusMessage}
          badges={profile.badges}
          displayEmail={profile.displayEmail}
          instagram={profile.instagram}
          linkedin={profile.linkedin}
          twitter={profile.twitter}
          isFollowing={profile.isFollowing}
          isCurrentUser={profile.isCurrentUser}
          subscriptionTier={profile.subscriptionTier}
        />

        <div className="px-4 sm:px-8">
          <ProfileBio
            bio={profile.bio}
            username={profile.username}
            stats={profile.stats}
          />

          <ProfileSkills skills={profile.skills} />

          <ProfileLinksGrid links={profile.customLinks} />

          <ProfileAppsSection apps={profile.profileApps} isCurrentUser={profile.isCurrentUser} />

          <ProfileActivity username={profile.username} />
        </div>
      </div>
    </div>
  );
}
