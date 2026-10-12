import { Suspense } from 'react';
import { db } from '~/lib/db';
import { marketerProfiles } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { MarketerEarningsClient } from '~/components/marketer/MarketerEarningsClient';

interface Props {
  params: { profileId: string };
}

export default async function MarketerEarningsPage({ params }: Props) {
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

  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-400">Loading earnings...</div>}>
      <MarketerEarningsClient profile={profile} />
    </Suspense>
  );
}
