import { db } from '~/lib/db';
import { marketerProfiles } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { B2BMessagesClient } from '~/components/marketer/B2BMessagesClient';

interface Props {
  params: { profileId: string };
}

export default async function B2BMessagesPage({ params }: Props) {
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

  return <B2BMessagesClient profile={profile} />;
}
