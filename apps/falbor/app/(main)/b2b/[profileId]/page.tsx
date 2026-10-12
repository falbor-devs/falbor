import { db } from '~/lib/db';
import { marketerProfiles } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { MarketerDashboardClient } from '~/components/marketer/MarketerDashboardClient';

interface Props {
  params: { profileId: string };
}

export default async function MarketerDashboardPage({ params }: Props) {
  const [profile] = await db
    .select({
      id: marketerProfiles.id,
      fullName: marketerProfiles.fullName,
      photoUrl: marketerProfiles.photoUrl,
    })
    .from(marketerProfiles)
    .where(eq(marketerProfiles.id, params.profileId))
    .limit(1);

  if (!profile) notFound();

  return <MarketerDashboardClient profile={profile} />;
}
