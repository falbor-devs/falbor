import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '~/lib/auth';

export async function getCurrentUserId() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifyToken(token);
    return payload?.userId || null;
  }
  return null;
}
