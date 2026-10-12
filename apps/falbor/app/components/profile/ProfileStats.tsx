import Link from 'next/link';

interface ProfileStatsProps {
  username: string;
  stats?: {
    followers?: number;
    following?: number;
    views?: number;
  };
}

export function ProfileStats({ username, stats }: ProfileStatsProps) {
  const followers = stats?.followers || 0;
  const following = stats?.following || 0;
  const views = stats?.views || 0;

  return (
    <div className="flex items-center gap-4 mt-3">
      <Link href={`/u/${username}/followers`} className="flex items-center gap-1.5 cursor-pointer group text-[13px]">
        <span className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
          {followers.toLocaleString()}
        </span>
        <span className="text-gray-500 group-hover:text-purple-600 transition-colors">Followers</span>
      </Link>
      <Link href={`/u/${username}/following`} className="flex items-center gap-1.5 cursor-pointer group text-[13px]">
        <span className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
          {following.toLocaleString()}
        </span>
        <span className="text-gray-500 group-hover:text-purple-600 transition-colors">Following</span>
      </Link>
      <div className="flex items-center gap-1.5 cursor-pointer group text-[13px]">
        <span className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
          {views.toLocaleString()}
        </span>
        <span className="text-gray-500">Profile Views</span>
      </div>
    </div>
  );
}
