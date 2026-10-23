'use server';

import { desc, eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { automationExtensionInstallations, automationExtensionPairings } from '~/lib/db/schema';
import { assertWorkspaceAccess, revokeExtensionForWorkspace } from '~/lib/automation/auth';
import { PAIRING_CODE_TTL_MINUTES } from '~/lib/automation/constants';
import { recordAutomationEvent } from '~/lib/automation/events';
import { generatePairingCode, hashToken, normalizePairingCode } from '~/lib/automation/tokens';

export type ExtensionInstallationItem = {
  id: string;
  installationId: string;
  browser: string | null;
  version: string | null;
  label: string | null;
  status: string;
  lastSeenAt: string | null;
  createdAt: string;
};

export async function createExtensionPairing(
  workspaceId: string,
  label?: string,
): Promise<{ code: string; expiresAt: string }> {
  const userId = await assertWorkspaceAccess(workspaceId);
  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MINUTES * 60_000);

  await db.insert(automationExtensionPairings).values({
    workspaceId,
    userId,
    codeHash: hashToken(normalizePairingCode(code)),
    status: 'pending',
    expiresAt,
  });

  await recordAutomationEvent({
    workspaceId,
    userId,
    type: 'extension_pairing_created',
    message: 'Browser extension pairing code created.',
    meta: label?.trim() ? { label: label.trim() } : undefined,
  });

  return { code, expiresAt: expiresAt.toISOString() };
}

export async function listExtensionInstallations(workspaceId: string): Promise<ExtensionInstallationItem[]> {
  await assertWorkspaceAccess(workspaceId);
  const rows = await db.query.automationExtensionInstallations.findMany({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
    orderBy: [desc(automationExtensionInstallations.createdAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    installationId: row.installationId,
    browser: row.browser,
    version: row.version,
    label: row.label,
    status: row.status,
    lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function revokeExtensionInstallation(
  workspaceId: string,
  installationId: string,
): Promise<{ success: true }> {
  const userId = await assertWorkspaceAccess(workspaceId);
  const revoked = await revokeExtensionForWorkspace(workspaceId, installationId, userId);

  await recordAutomationEvent({
    workspaceId,
    userId,
    type: 'extension_disconnected',
    message: `Browser extension ${installationId} disconnected.`,
    meta: { installationId: revoked.installationId },
  });

  return { success: true };
}
