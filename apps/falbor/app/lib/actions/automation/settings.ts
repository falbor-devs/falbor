'use server';

import { eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { automationSettings } from '~/lib/db/schema';
import { assertWorkspaceAccess } from '~/lib/automation/auth';
import { formatSubreddit } from '~/lib/automation/queries';

export type AutomationSettingsView = {
  id: string | null;
  workspaceId: string;
  enabled: boolean;
  autoDiscovery: boolean;
  queriesPerRun: number;
  maxDraftsPerDay: number;
  maxPublicationsPerDay: number;
  keywords: string[];
  blockedSubreddits: string[];
  createdAt: string | null;
  updatedAt: string | null;
};

const DEFAULTS = {
  enabled: false,
  autoDiscovery: false,
  queriesPerRun: 5,
  maxDraftsPerDay: 10,
  maxPublicationsPerDay: 5,
};

type SettingsRow = typeof automationSettings.$inferSelect;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function serialize(row: SettingsRow): AutomationSettingsView {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    enabled: row.enabled,
    autoDiscovery: row.autoDiscovery,
    queriesPerRun: row.queriesPerRun,
    maxDraftsPerDay: row.maxDraftsPerDay,
    maxPublicationsPerDay: row.maxPublicationsPerDay,
    keywords: asStringArray(row.keywords),
    blockedSubreddits: asStringArray(row.blockedSubreddits),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function sanitizeKeywords(items: string[] | undefined, existing: string[]): string[] {
  if (!items) return existing.slice(0, 30);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const value = String(item).trim().slice(0, 80);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= 30) break;
  }
  return result;
}

function sanitizeSubreddits(items: string[] | undefined, existing: string[]): string[] {
  if (!items) return existing.slice(0, 30);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const value = formatSubreddit(String(item)).toLowerCase().slice(0, 60);
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= 30) break;
  }
  return result;
}

export async function getAutomationSettings(workspaceId: string): Promise<AutomationSettingsView> {
  await assertWorkspaceAccess(workspaceId);
  const row = await db.query.automationSettings.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
  });
  if (row) return serialize(row);

  return {
    id: null,
    workspaceId,
    ...DEFAULTS,
    keywords: [],
    blockedSubreddits: [],
    createdAt: null,
    updatedAt: null,
  };
}

export async function updateAutomationSettings(
  workspaceId: string,
  input: {
    enabled?: boolean;
    autoDiscovery?: boolean;
    queriesPerRun?: number;
    maxDraftsPerDay?: number;
    maxPublicationsPerDay?: number;
    keywords?: string[];
    blockedSubreddits?: string[];
  },
): Promise<AutomationSettingsView> {
  await assertWorkspaceAccess(workspaceId);
  const existing = await db.query.automationSettings.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
  });

  const values = {
    enabled: input.enabled ?? existing?.enabled ?? DEFAULTS.enabled,
    autoDiscovery: input.autoDiscovery ?? existing?.autoDiscovery ?? DEFAULTS.autoDiscovery,
    queriesPerRun: clamp(input.queriesPerRun, 1, 8, existing?.queriesPerRun ?? DEFAULTS.queriesPerRun),
    maxDraftsPerDay: clamp(input.maxDraftsPerDay, 1, 50, existing?.maxDraftsPerDay ?? DEFAULTS.maxDraftsPerDay),
    maxPublicationsPerDay: clamp(
      input.maxPublicationsPerDay,
      1,
      20,
      existing?.maxPublicationsPerDay ?? DEFAULTS.maxPublicationsPerDay,
    ),
    keywords: sanitizeKeywords(input.keywords, asStringArray(existing?.keywords)),
    blockedSubreddits: sanitizeSubreddits(input.blockedSubreddits, asStringArray(existing?.blockedSubreddits)),
  };

  const [row] = await db
    .insert(automationSettings)
    .values({ workspaceId, ...values })
    .onConflictDoUpdate({
      target: automationSettings.workspaceId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();

  return serialize(row);
}
