import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { googleOAuthTokens } from '~/lib/db/schema';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';

function getOAuthClient() {
    const { OAuth2Client } = require('google-auth-library');
    return new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/contacts/google/callback`,
    );
}

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    let returnPath = '/workspace';
    try {
        if (state) returnPath = JSON.parse(Buffer.from(state, 'base64').toString()).returnPath || returnPath;
    } catch {}

    if (error || !code) {
        return NextResponse.redirect(new URL(`${returnPath}?google_error=1`, req.url));
    }

    try {
        const user = await getAuthUserDetails();
        if (!user) return NextResponse.redirect(new URL('/login', req.url));

        const client = getOAuthClient();
        const { tokens } = await client.getToken(code);

        await db
            .insert(googleOAuthTokens)
            .values({
                userId: user.id as any,
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token ?? null,
                expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                scope: tokens.scope ?? null,
            })
            .onConflictDoUpdate({
                target: googleOAuthTokens.userId,
                set: {
                    accessToken: tokens.access_token!,
                    refreshToken: tokens.refresh_token ?? undefined,
                    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                    scope: tokens.scope ?? null,
                    updatedAt: new Date(),
                },
            });

        return NextResponse.redirect(new URL(`${returnPath}?google_connected=1`, req.url));
    } catch (err) {
        console.error('Contacts Google OAuth callback error:', err);
        return NextResponse.redirect(new URL(`${returnPath}?google_error=1`, req.url));
    }
}
