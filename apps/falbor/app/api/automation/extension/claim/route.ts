import { extensionJson, extensionPreflight } from '~/lib/automation/http';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/lib/db';
import { automationExtensionInstallations, automationExtensionPairings } from '~/lib/db/schema';
import { findActivePairing } from '~/lib/automation/auth';
import { recordAutomationEvent } from '~/lib/automation/events';
import { generateExtensionToken, hashToken, normalizePairingCode } from '~/lib/automation/tokens';
import { checkRateLimit } from '~/lib/security';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return extensionPreflight();
}

const claimSchema = z.object({
  code: z.string().trim().min(1).max(20),
  installationId: z.string().trim().min(8).max(128),
  browser: z.string().trim().max(40).optional(),
  version: z.string().trim().max(40).optional(),
  label: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(request, '/api/automation/extension/claim');
    if (!rateLimit.allowed) {
      return extensionJson({ error: 'Too many pairing attempts. Try again shortly.' }, 429);
    }

    const parsed = claimSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return extensionJson({ error: 'Invalid pairing request.' }, 400);
    }

    const { code, installationId, browser, version, label } = parsed.data;
    const pairing = await findActivePairing(hashToken(normalizePairingCode(code)));
    if (!pairing) {
      return extensionJson({ error: 'Invalid or expired pairing code.' }, 400);
    }

    const token = generateExtensionToken();
    const tokenHash = hashToken(token);
    const now = new Date();

    const claimedPairing = await db
      .update(automationExtensionPairings)
      .set({
        status: 'claimed',
        claimedAt: now,
        installationId,
        browser: browser ?? null,
        version: version ?? null,
      })
      .where(and(eq(automationExtensionPairings.id, pairing.id), eq(automationExtensionPairings.status, 'pending')))
      .returning({ id: automationExtensionPairings.id });
    if (!claimedPairing.length) {
      return extensionJson({ error: 'Invalid or expired pairing code.' }, 400);
    }

    const existing = await db.query.automationExtensionInstallations.findFirst({
      where: (t, { eq, and }) => and(eq(t.workspaceId, pairing.workspaceId), eq(t.installationId, installationId)),
    });

    if (existing) {
      await db
        .update(automationExtensionInstallations)
        .set({
          tokenHash,
          browser: browser ?? existing.browser,
          version: version ?? existing.version,
          label: label ?? existing.label,
          status: 'connected',
          lastSeenAt: now,
          revokedAt: null,
          updatedAt: now,
        })
        .where(eq(automationExtensionInstallations.id, existing.id));
    } else {
      await db.insert(automationExtensionInstallations).values({
        workspaceId: pairing.workspaceId,
        userId: pairing.userId,
        installationId,
        tokenHash,
        browser: browser ?? null,
        version: version ?? null,
        label: label ?? null,
        status: 'connected',
        lastSeenAt: now,
      });
    }

    await recordAutomationEvent({
      workspaceId: pairing.workspaceId,
      userId: pairing.userId,
      type: 'extension_connected',
      message: label?.trim() ? `Browser extension connected (${label.trim()}).` : 'Browser extension connected.',
      meta: { installationId, browser: browser ?? null, version: version ?? null },
    });

    return extensionJson({ token, workspaceId: pairing.workspaceId });
  } catch (error) {
    console.error('Extension claim failed:', error);
    return extensionJson({ error: 'Internal error' }, 500);
  }
}
