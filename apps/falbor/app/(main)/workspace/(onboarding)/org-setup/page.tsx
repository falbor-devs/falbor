import { cookies } from 'next/headers';
import { verifyToken } from '~/lib/auth';
import { db } from '~/lib/db';
import { stayupProjects } from '~/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { OrganizationSetupForm } from '~/components/stayup/OrganizationSetupForm';
import { DashboardMetrics } from '~/components/stayup/DashboardMetrics';
import { ActivityChart } from '~/components/stayup/ActivityChart';
import { WelcomeHeader } from '~/components/ui/setup/WelcomeHeader';
import { ErrorPreview } from '~/components/stayup/ErrorPreview';

export default async function SetupPage() {
  const token = cookies().get('session')?.value;
  const payload = token ? await verifyToken(token) : null;
  const userId = payload?.userId;
  if (!userId) {
    return redirect('/login');
  }
  const userProjects = await db.query.stayupProjects.findMany({
    where: and(
      eq(stayupProjects.userId, userId),
      eq(stayupProjects.isActive, true)
    )
  });
  if (userProjects.length > 0) {
    redirect(`/${userProjects[0].id}`);
  }
  const mockEvents = [
    { timestamp: new Date(Date.now() - 86400000).toISOString() },
    { timestamp: new Date(Date.now() - 86400000).toISOString() },
    { timestamp: new Date(Date.now() - 172800000).toISOString() }
  ];
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white dark:bg-[#09090b] font-sans text-gray-900 dark:text-gray-100 overflow-hidden">
      <WelcomeHeader />
      <div className="flex flex-1 w-full max-w-7xl mx-auto items-center pt-20">
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 xl:px-32 relative z-10">
          <div className="max-w-md w-full">
            <div className="mb-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-6 shadow-inner">
                <div className="i-ph:buildings text-indigo-600 dark:text-indigo-400 w-6 h-6" />
              </div>
              <h1 className="text-[2.5rem] leading-tight font-semibold tracking-tight text-gray-900 dark:text-white mb-4">
                Welcome to StayUp
              </h1>
              <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-400 mt-2">
                Let's create your first Organization to start capturing real-time telemetry and monitoring your projects.
              </p>
            </div>

            <OrganizationSetupForm />
          </div>
        </div>
        <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center">
          <div className="absolute left-10 top-1/2 -translate-y-1/2 w-48 h-48 opacity-40">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="dotPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="2" fill="currentColor" className="text-gray-400" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dotPattern)" />
            </svg>
          </div>

          <div className="w-full max-w-lg relative z-10 animate-in fade-in slide-in-from-right-8 duration-1000">
            <div className="relative">
              <div className="absolute -top-4 -right-4 w-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/50 dark:border-gray-800/50 opacity-60 transform scale-95 origin-bottom">
                <div className="h-40"></div>
              </div>
              <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl p-6 rounded-2xl border border-gray-100/50 dark:border-gray-800/50">
                {}
                <ErrorPreview />
                <div className="mt-8">
                  <ActivityChart events={mockEvents} />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-[#09090b] pointer-events-none z-20"></div>
        </div>
      </div>
    </div>
  );
}
