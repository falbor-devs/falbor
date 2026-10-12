import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '~/lib/auth';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import { db } from '~/lib/db';
import { mcpConnections } from '~/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    const source = req.nextUrl.searchParams.get('source') || 'contacts';

    try {
        const userId = await getUserId(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const connectorId = source === 'contacts' ? 'google-contacts' : source === 'gmail' ? 'gmail' : 'google-calendar';

        const userConnections = await db
            .select()
            .from(mcpConnections)
            .where(eq(mcpConnections.userId, userId));

        const mcpConn = userConnections.find((c) => c.connectorId === connectorId) ||
                        userConnections.find((c) => c.connectorId === 'gmail') ||
                        userConnections.find((c) => c.connectorId === 'google-contacts') ||
                        userConnections.find((c) => c.connectorId === 'google-calendar');

        if (!mcpConn || !mcpConn.config) {
            return NextResponse.json({ needsAuth: true, connectorId });
        }

        let config: any = mcpConn.config;
        let token = config.access_token || config.token || config.tokens?.access_token;
        const refreshToken = config.refresh_token || config.tokens?.refresh_token;
        const userEmail = config.authed_user?.email || config.user?.email || mcpConn.name || 'Google Account';

        const refreshAccessToken = async (): Promise<string | null> => {
            if (!refreshToken) return null;
            const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
            if (!clientId || !clientSecret) return null;

            try {
                const res = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        refresh_token: refreshToken,
                        grant_type: 'refresh_token',
                    }),
                });
                if (!res.ok) return null;
                const data = await res.json();
                if (data.access_token) {
                    const newConfig = { ...config, access_token: data.access_token, updated_at: Date.now() };
                    await db.update(mcpConnections)
                        .set({ config: newConfig, updatedAt: new Date() })
                        .where(eq(mcpConnections.id, mcpConn.id));
                    return data.access_token;
                }
            } catch (err) {
                console.error('Failed to refresh Google access token:', err);
            }
            return null;
        };

        if (!token && refreshToken) {
            token = await refreshAccessToken();
        }

        if (!token) {
            return NextResponse.json({ needsAuth: true, connectorId, userEmail });
        }

        if (source === 'contacts') {
            let res = await fetch(
                'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations&pageSize=200',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.status === 401 && refreshToken) {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    token = newToken;
                    res = await fetch(
                        'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations&pageSize=200',
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
            }
            if (!res.ok) {
                if (res.status === 401) return NextResponse.json({ needsAuth: true, connectorId, userEmail });
                return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 502 });
            }
            const data = await res.json();
            const contacts = (data.connections || []).map((p: any) => ({
                externalId: p.resourceName,
                name: p.names?.[0]?.displayName || '',
                email: p.emailAddresses?.[0]?.value || null,
                phone: p.phoneNumbers?.[0]?.value || null,
                company: p.organizations?.[0]?.name || null,
                jobTitle: p.organizations?.[0]?.title || null,
                source: 'Google Contacts',
                sourceProvider: 'google',
            })).filter((c: any) => c.name);
            return NextResponse.json({ contacts, userEmail });
        }

        if (source === 'gmail') {
            let res = await fetch(
                'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=in:sent OR in:inbox',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.status === 401 && refreshToken) {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    token = newToken;
                    res = await fetch(
                        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=in:sent OR in:inbox',
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
            }
            if (!res.ok) {
                if (res.status === 401) return NextResponse.json({ needsAuth: true, connectorId, userEmail });
                return NextResponse.json({ error: 'Failed to fetch Gmail' }, { status: 502 });
            }
            const data = await res.json();
            const messageIds: string[] = (data.messages || []).map((m: any) => m.id).slice(0, 50);

            const emails = new Map<string, { name: string; email: string }>();
            await Promise.all(messageIds.map(async (id) => {
                try {
                    const msgRes = await fetch(
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (!msgRes.ok) return;
                    const msg = await msgRes.json();
                    const headers: Array<{ name: string; value: string }> = msg.payload?.headers || [];
                    for (const h of headers) {
                        if (h.name === 'From' || h.name === 'To') {
                            const matches = h.value.matchAll(/(?:"?([^"<,]+)"?\s*)?<([^>]+)>/g);
                            for (const m of matches) {
                                const name = (m[1] || '').trim();
                                const email = (m[2] || '').trim().toLowerCase();
                                if (email && !email.includes('noreply') && !email.includes('no-reply') && !emails.has(email)) {
                                    emails.set(email, { name: name || email, email });
                                }
                            }
                        }
                    }
                } catch {}
            }));

            const contacts = Array.from(emails.values()).map(c => ({
                externalId: c.email,
                name: c.name,
                email: c.email,
                phone: null,
                company: null,
                jobTitle: null,
                source: 'Gmail',
                sourceProvider: 'google',
            }));
            return NextResponse.json({ contacts, userEmail });
        }

        if (source === 'calendar') {
            const now = new Date().toISOString();
            const past = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
            let res = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&timeMin=${past}&timeMax=${now}&singleEvents=true`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.status === 401 && refreshToken) {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    token = newToken;
                    res = await fetch(
                        `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&timeMin=${past}&timeMax=${now}&singleEvents=true`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
            }
            if (!res.ok) {
                if (res.status === 401) return NextResponse.json({ needsAuth: true, connectorId, userEmail });
                return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 502 });
            }
            const data = await res.json();
            const people = new Map<string, { name: string; email: string }>();
            for (const event of data.items || []) {
                for (const attendee of event.attendees || []) {
                    if (attendee.email && !attendee.self && !people.has(attendee.email)) {
                        people.set(attendee.email, {
                            name: attendee.displayName || attendee.email,
                            email: attendee.email,
                        });
                    }
                }
            }
            const contacts = Array.from(people.values()).map(c => ({
                externalId: c.email,
                name: c.name,
                email: c.email,
                phone: null,
                company: null,
                jobTitle: null,
                source: 'Google Calendar',
                sourceProvider: 'google',
            }));
            return NextResponse.json({ contacts, userEmail });
        }

        return NextResponse.json({ error: 'Unknown source' }, { status: 400 });
    } catch (err) {
        console.error('Google import error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const returnPath = req.nextUrl.searchParams.get('returnPath') || '/workspace';
    try {
        const user = await getAuthUserDetails();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXT_PUBLIC_APP_URL}/api/contacts/google/callback`,
        );
        const scopes = [
            'https://www.googleapis.com/auth/contacts.readonly',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/calendar.events.readonly',
        ];
        const url = client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state: Buffer.from(JSON.stringify({ returnPath })).toString('base64'),
        });
        return NextResponse.json({ authUrl: url });
    } catch (err) {
        console.error('Google auth URL error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
