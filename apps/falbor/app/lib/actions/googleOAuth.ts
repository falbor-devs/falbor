'use server';
import { db } from '~/lib/db';
import { googleOAuthTokens } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';

const SCOPES = [
    'https://www.googleapis.com/auth/contacts.readonly',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly',
].join(' ');

function getOAuthClient() {
    const { OAuth2Client } = require('google-auth-library');
    return new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
    );
}

export async function getGoogleAuthUrl(returnPath: string): Promise<string> {
    const client = getOAuthClient();
    return client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
        state: Buffer.from(JSON.stringify({ returnPath })).toString('base64'),
    });
}

export async function getStoredGoogleToken(userId: string) {
    const [token] = await db
        .select()
        .from(googleOAuthTokens)
        .where(eq(googleOAuthTokens.userId, userId as any))
        .limit(1);
    return token ?? null;
}

export async function getRefreshedAccessToken(userId: string): Promise<string | null> {
    const stored = await getStoredGoogleToken(userId);
    if (!stored) return null;

    const client = getOAuthClient();
    client.setCredentials({
        access_token: stored.accessToken,
        refresh_token: stored.refreshToken,
    });

    if (stored.expiresAt && stored.expiresAt < new Date(Date.now() + 60_000)) {
        try {
            const { credentials } = await client.refreshAccessToken();
            await db
                .update(googleOAuthTokens)
                .set({
                    accessToken: credentials.access_token!,
                    expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                    updatedAt: new Date(),
                })
                .where(eq(googleOAuthTokens.userId, userId as any));
            return credentials.access_token!;
        } catch {
            return null;
        }
    }
    return stored.accessToken;
}

export async function disconnectGoogle(): Promise<void> {
    const user = await getAuthUserDetails();
    if (!user) throw new Error('Unauthorized');
    await db.delete(googleOAuthTokens).where(eq(googleOAuthTokens.userId, user.id as any));
}

export async function isGoogleConnected(): Promise<boolean> {
    const user = await getAuthUserDetails();
    if (!user) return false;
    const token = await getStoredGoogleToken(user.id as string);
    return !!token;
}
