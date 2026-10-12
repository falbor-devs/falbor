import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createScopedLogger } from '~/utils/logger';
import { withSecurity } from '~/lib/security';
import { requireChatAccess, handleAuthError } from '~/lib/auth/auth-helpers';
import dns from 'dns';
import { isIP } from 'net';

const logger = createScopedLogger('api.database.execute');

function isPrivateIP(ip: string): boolean {
  if (ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('169.254.') || ip === '0.0.0.0') {
    return true;
  }
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith('192.168.')) {
    return true;
  }
  if (ip === '::1' || ip === '::' || ip.toLowerCase().startsWith('fe80:') || ip.toLowerCase().startsWith('fc00:') || ip.toLowerCase().startsWith('fd00:')) {
    return true;
  }
  return false;
}

async function validateDatabaseUrl(dbUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(dbUrl);
    if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') return false;
    const hostname = parsed.hostname;
    if (isIP(hostname)) {
      return !isPrivateIP(hostname);
    }
    const ipAddresses = await new Promise<string[]>((resolve) => {
      dns.lookup(hostname, { all: true }, (err, addresses) => {
        if (err || !addresses) resolve([]);
        else resolve(addresses.map((a) => a.address));
      });
    });
    if (ipAddresses.length === 0) return false;
    return ipAddresses.every((ip) => !isPrivateIP(ip));
  } catch {
    return false;
  }
}

const executePost = withSecurity(async ({ request }) => {
  try {
    const { chatId, databaseUrl, sql } = await request.json();

    if (!chatId || !databaseUrl || !sql) {
      return NextResponse.json({ error: 'chatId, databaseUrl, and sql are required' }, { status: 400 });
    }

    // 1. Enforce chat ownership
    await requireChatAccess(chatId);

    // 2. Validate databaseUrl (SSRF mitigation)
    const isValidDbUrl = await validateDatabaseUrl(databaseUrl);
    if (!isValidDbUrl) {
      return NextResponse.json({ error: 'Invalid or forbidden databaseUrl' }, { status: 400 });
    }

    const sqlClient = neon(databaseUrl);
    try {
      const rows = await sqlClient([sql] as any);
      return NextResponse.json({ success: true, result: rows });
    } catch (dbError: any) {
      logger.error('DB Error inside execute:', dbError);
      throw dbError;
    }
  } catch (error: any) {
    logger.error('Failed to execute SQL:', error);
    if (error.status) {
      return handleAuthError(error);
    }
    return NextResponse.json({ error: error.message || 'Failed to execute SQL' }, { status: 500 });
  }
});

export async function POST(request: Request) {
  return executePost({ request, context: { env: process.env as any } });
}

