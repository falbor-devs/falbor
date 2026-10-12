'use server';
import { db } from '~/lib/db';
import { myProspects } from '~/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';

export type ProspectStatus = 'new' | 'contacted' | 'replied' | 'qualified' | 'customer';

export type MyProspect = {
    id: string;
    workspaceId: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    jobTitle: string | null;
    source: string | null;
    sourceProvider: string | null;
    externalId: string | null;
    status: string;
    notes: string | null;
    linkedAiProspectId: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt: Date;
};

export async function getMyProspects(workspaceId: string): Promise<MyProspect[]> {
    const user = await getAuthUserDetails();
    if (!user) throw new Error('Unauthorized');
    return db
        .select()
        .from(myProspects)
        .where(and(eq(myProspects.workspaceId, workspaceId), eq(myProspects.userId, user.id as any)))
        .orderBy(desc(myProspects.createdAt)) as Promise<MyProspect[]>;
}

export async function createMyProspect(workspaceId: string, data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    source?: string;
    sourceProvider?: string;
    externalId?: string;
    notes?: string;
    linkedAiProspectId?: string;
}): Promise<MyProspect> {
    const user = await getAuthUserDetails();
    if (!user) throw new Error('Unauthorized');

    if (data.email) {
        const existing = await db
            .select({ id: myProspects.id })
            .from(myProspects)
            .where(and(
                eq(myProspects.workspaceId, workspaceId),
                eq(myProspects.userId, user.id as any),
                eq(myProspects.email, data.email),
            ))
            .limit(1);
        if (existing.length > 0) throw new Error('DUPLICATE');
    }

    const [created] = await db
        .insert(myProspects)
        .values({
            workspaceId,
            userId: user.id as any,
            name: data.name,
            email: data.email ?? null,
            phone: data.phone ?? null,
            company: data.company ?? null,
            jobTitle: data.jobTitle ?? null,
            source: data.source ?? 'manual',
            sourceProvider: data.sourceProvider ?? null,
            externalId: data.externalId ?? null,
            notes: data.notes ?? null,
            linkedAiProspectId: data.linkedAiProspectId ?? null,
            status: 'new',
        })
        .returning();
    return created as MyProspect;
}

export async function updateMyProspectStatus(id: string, status: ProspectStatus): Promise<void> {
    const user = await getAuthUserDetails();
    if (!user) throw new Error('Unauthorized');
    await db
        .update(myProspects)
        .set({ status, updatedAt: new Date(), lastActivityAt: new Date() })
        .where(and(eq(myProspects.id, id), eq(myProspects.userId, user.id as any)));
}

export async function deleteMyProspect(id: string): Promise<void> {
    const user = await getAuthUserDetails();
    if (!user) throw new Error('Unauthorized');
    await db
        .delete(myProspects)
        .where(and(eq(myProspects.id, id), eq(myProspects.userId, user.id as any)));
}

export async function bulkImportMyProspects(workspaceId: string, contacts: Array<{
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    source: string;
    sourceProvider: string;
    externalId?: string;
}>): Promise<{ imported: number; skipped: number }> {
    const user = await getAuthUserDetails();
    if (!user) throw new Error('Unauthorized');

    let imported = 0;
    let skipped = 0;

    for (const contact of contacts) {
        try {
            await createMyProspect(workspaceId, contact);
            imported++;
        } catch (e: any) {
            if (e.message === 'DUPLICATE') skipped++;
            else throw e;
        }
    }
    return { imported, skipped };
}

export async function sendMyProspectToAiProspects(workspaceId: string, prospect: {
    id: string;
    name: string;
    email?: string | null;
    company?: string | null;
    jobTitle?: string | null;
}): Promise<void> {
    const user = await getAuthUserDetails();
    if (!user) throw new Error('Unauthorized');

    const { agentProspects } = await import('~/lib/db/schema');

    const [created] = await db
        .insert(agentProspects)
        .values({
            workspaceId,
            name: prospect.name,
            email: prospect.email || `${prospect.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@prospect.com`,
            company: prospect.company || 'Unknown Company',
            matchReason: `Imported from My Prospects (${prospect.jobTitle || 'Prospect'})`,
            status: 'Ready to Contact',
            messagePreview: `Hi ${prospect.name.split(' ')[0]}, I reached out regarding opportunities at ${prospect.company || 'your team'}.`,
            sentAt: 'Not sent yet',
            lastActivity: 'Just now',
        })
        .returning();

    if (created?.id) {
        await db
            .delete(myProspects)
            .where(and(eq(myProspects.id, prospect.id), eq(myProspects.userId, user.id as any)));
    }
}
