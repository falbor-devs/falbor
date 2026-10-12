import { cookies } from 'next/headers';
import { verifyToken } from '~/lib/auth';
import { redirect } from 'next/navigation';
import { WelcomeHeader } from '~/components/ui/setup/WelcomeHeader';
import { MarketerProfileForm } from '~/components/marketer/MarketerProfileForm';

export default async function MarketerProfileSetupPage() {
  const token = cookies().get('session')?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload?.userId) {
    redirect('/login?role=marketer');
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white dark:bg-[#09090b] font-sans text-gray-900 dark:text-gray-100 overflow-hidden">
      <WelcomeHeader />
      <div className="flex flex-1 w-full max-w-4xl mx-auto items-start pt-28 pb-16 px-6">
        <MarketerProfileForm userId={payload.userId} />
      </div>
    </div>
  );
}
