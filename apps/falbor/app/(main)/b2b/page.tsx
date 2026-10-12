import { cookies } from 'next/headers';
import { verifyToken } from '~/lib/auth';
import { db } from '~/lib/db';
import { marketerProfiles } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export default async function B2BIndexPage() {
  const token = cookies().get('session')?.value;
  const payload = token ? await verifyToken(token) : null;
  
  if (!payload?.userId) {
    redirect('/login?role=marketer');
  }

  const [profile] = await db
    .select({ id: marketerProfiles.id })
    .from(marketerProfiles)
    .where(eq(marketerProfiles.userId, payload.userId))
    .limit(1);

  if (profile) {
    redirect(`/b2b/${profile.id}`);
  } else {
    redirect('/b2b/profile-setup');
  }
}
