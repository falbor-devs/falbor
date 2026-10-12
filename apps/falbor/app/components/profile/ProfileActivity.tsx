import { db } from '~/lib/db';
import { chats, users } from '~/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { subWeeks, startOfDay, differenceInDays, format } from 'date-fns';

interface ProfileActivityProps {
  username: string;
}

export async function ProfileActivity({ username }: ProfileActivityProps) {
  
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);

  const heatmapData: { count: number, dateStr: string }[][] = [];
  const WEEKS = 24;

  if (!user) return null;

  const startDate = startOfDay(subWeeks(new Date(), WEEKS));

  
  const userChats = await db
    .select({ createdAt: chats.createdAt })
    .from(chats)
    .where(and(eq(chats.userId, user.id), gte(chats.createdAt, startDate)));

  
  const activityMap = new Map<string, number>();
  userChats.forEach(chat => {
    const dateStr = format(chat.createdAt, 'yyyy-MM-dd');
    activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
  });

  
  let currentDate = startDate;
  for (let w = 0; w < WEEKS; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      week.push({ count: activityMap.get(dateStr) || 0, dateStr });
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }
    heatmapData.push(week);
  }

  const getIntensityColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-[#202020]';
    if (count <= 2) return 'bg-green-200 dark:bg-green-900/40';
    if (count <= 5) return 'bg-green-400 dark:bg-green-700/60';
    if (count <= 10) return 'bg-green-500 dark:bg-green-500/80';
    return 'bg-green-600 dark:bg-green-400';
  };

  return (
    <div className="">
      <h3 className="mb-4 text-sm font-semibold text-falbor-elements-textPrimary">
        Recent Activity
      </h3>
      <div className="p-4 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {heatmapData.map((week, wIndex) => (
            <div key={wIndex} className="flex flex-col gap-1">
              {week.map((day, dIndex) => (
                <div
                  key={`${wIndex}-${dIndex}`}
                  className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityColor(day.count)} transition-colors hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-500 cursor-help`}
                  title={`${day.count} chat${day.count === 1 ? '' : 's'} on ${day.dateStr}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-3 justify-end">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityColor(0)}`} />
            <div className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityColor(2)}`} />
            <div className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityColor(5)}`} />
            <div className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityColor(10)}`} />
            <div className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityColor(20)}`} />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
