import { db } from '~/lib/db';
import { marketerProfiles, users } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { MarketerPublicProfile } from '~/components/marketer/MarketerPublicProfile';
import Link from 'next/link';

interface Props {
  params: { profileId: string };
}

export default async function PublicMarketerProfilePage({ params }: Props) {
  const [profile] = await db
    .select()
    .from(marketerProfiles)
    .where(eq(marketerProfiles.id, params.profileId))
    .limit(1);

  if (!profile || !profile.isPublic) notFound();

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, profile.userId))
    .limit(1);

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white">
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <Link href="/">
            <img src="/logo-light-styled.png" width={90} alt="Logo" className="inline-block dark:hidden" />
            <img src="/logo-dark-styled.png" width={90} alt="Logo" className="hidden dark:block" />
          </Link>
        </div>

        <div className="p-6 md:p-10 max-w-4xl mx-auto">
          <MarketerPublicProfile profile={profile} email={profile.showEmail ? user?.email : undefined} />
        </div>
      </main>
    </div>
  );
}
