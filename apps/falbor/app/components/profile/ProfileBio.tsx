import { ProfileStats } from './ProfileStats';

interface ProfileBioProps {
  bio?: string;
  username: string;
  joinDateStr?: string;
  stats?: {
    followers?: number;
    following?: number;
    views?: number;
  };
}

export function ProfileBio({ bio, username, joinDateStr = "May 2025", stats }: ProfileBioProps) {
  return (
    <div className="mt-6 mb-8 max-w-3xl">
      <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 mb-3">
        <span>@{username.toLowerCase().replace(/\s+/g, '-')}</span>
        <span>&middot;</span>
        <span>Joined {joinDateStr}</span>
      </div>

      {bio && (
        <div className="text-gray-800 dark:text-gray-300 leading-relaxed text-[14px] sm:text-[15px] whitespace-pre-wrap">
          {bio}
        </div>
      )}

      <ProfileStats username={username} stats={stats} />
    </div>
  );
}
