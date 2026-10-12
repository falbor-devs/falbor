'use server'

import { db } from '~/lib/db';
import { users, workspaces, workspaceMembers, workspaceInvites } from '~/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';

async function getAuthUserRecord() {
  const authUser = await getAuthUserDetails();
  if (!authUser) return null;
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, authUser.email),
  });
  return user || null;
}

export async function getWorkspaceMembers(workspaceId: string) {
  const authUser = await getAuthUserDetails();
  if (!authUser) return [];

  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.id, workspaceId),
  });
  if (!workspace) return [];

  const dbMembers = await db.query.workspaceMembers.findMany({
    where: (m, { eq }) => eq(m.workspaceId, workspaceId),
  });

  const memberUserIds = new Set(dbMembers.map((m) => m.userId));
  memberUserIds.add(workspace.userId);

  const userList = await db.query.users.findMany({
    where: (u, { inArray }) => inArray(u.id, Array.from(memberUserIds)),
  });

  const memberMap = new Map(dbMembers.map((m) => [m.userId, m]));

  return userList.map((user) => {
    const mem = memberMap.get(user.id);
    const isOwner = user.id === workspace.userId;
    return {
      userId: user.id,
      name: user.displayName || user.username || user.email.split('@')[0],
      email: user.email,
      avatarUrl: user.avatarUrl || '',
      role: isOwner ? 'owner' : mem?.role || 'editor',
      isCurrentUser: user.id === authUser.id,
      balance: user.balance || 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  });
}

export async function inviteMemberByEmail({
  workspaceId,
  email,
  role,
}: {
  workspaceId: string;
  email: string;
  role: string;
}) {
  const currentUser = await getAuthUserRecord();
  if (!currentUser) throw new Error('Unauthorized');

  const userTier = (currentUser.subscriptionTier || 'free').toLowerCase();
  if (userTier !== 'power' && userTier !== 'business') {
    throw new Error('Inviting members requires a Power or Business plan subscription.');
  }

  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.id, workspaceId),
  });
  if (!workspace) throw new Error('Workspace not found');

  const code = uuidv4();

  const [invite] = await db
    .insert(workspaceInvites)
    .values({
      workspaceId,
      code,
      type: 'email',
      email,
      role,
      maxUses: 1,
    })
    .returning();

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${code}`;

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Falbor <onboarding@resend.dev>',
        to: email,
        subject: `You've been invited to join ${workspace.name || 'Workspace'} on Falbor`,
        html: `<div style="font-family: sans-serif; padding: 20px;">
          <h2>Workspace Invitation</h2>
          <p>You have been invited to join <strong>${workspace.name || 'Workspace'}</strong> as a <strong>${role}</strong>.</p>
          <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
        </div>`,
      });
    } catch (e) {
      console.error('Error sending invite email via Resend:', e);
    }
  }

  return { invite, inviteUrl };
}

export async function createInviteLink({
  workspaceId,
  role,
  maxUses,
  expiresInDays,
  nickname,
  allowedDomain,
}: {
  workspaceId: string;
  role: string;
  maxUses: number | null;
  expiresInDays?: number | null;
  nickname?: string;
  allowedDomain?: string;
}) {
  const currentUser = await getAuthUserRecord();
  if (!currentUser) throw new Error('Unauthorized');

  const code = uuidv4();
  let expiresAt: Date | undefined = undefined;
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  const [invite] = await db
    .insert(workspaceInvites)
    .values({
      workspaceId,
      code,
      type: 'link',
      role,
      maxUses,
      nickname,
      allowedDomain: allowedDomain ? allowedDomain.trim().toLowerCase() : null,
      expiresAt,
    })
    .returning();

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${code}`;
  return { invite, inviteUrl };
}

export async function updateMemberRole(workspaceId: string, targetUserId: string, newRole: string) {
  const currentUser = await getAuthUserRecord();
  if (!currentUser) throw new Error('Unauthorized');

  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.id, workspaceId),
  });
  if (!workspace) throw new Error('Workspace not found');

  const isOwner = currentUser.id === workspace.userId;
  let callerRole = isOwner ? 'owner' : 'viewer';

  if (!isOwner) {
    const callerMember = await db.query.workspaceMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, currentUser.id)),
    });
    if (callerMember) callerRole = callerMember.role;
  }

  if (callerRole !== 'owner' && callerRole !== 'admin') {
    throw new Error('Only the Workspace Owner or Admins can modify member roles.');
  }

  if (targetUserId === workspace.userId) {
    throw new Error('Cannot change the Owner role.');
  }

  const existing = await db.query.workspaceMembers.findFirst({
    where: (m, { eq, and }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, targetUserId)),
  });

  if (existing) {
    await db.update(workspaceMembers).set({ role: newRole, updatedAt: new Date() }).where(eq(workspaceMembers.id, existing.id));
  } else {
    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: targetUserId,
      role: newRole,
    });
  }

  return { success: true };
}

export async function removeMember(workspaceId: string, targetUserId: string) {
  const currentUser = await getAuthUserRecord();
  if (!currentUser) throw new Error('Unauthorized');

  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.id, workspaceId),
  });
  if (!workspace) throw new Error('Workspace not found');

  const isOwner = currentUser.id === workspace.userId;
  let callerRole = isOwner ? 'owner' : 'viewer';

  if (!isOwner) {
    const callerMember = await db.query.workspaceMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, currentUser.id)),
    });
    if (callerMember) callerRole = callerMember.role;
  }

  if (callerRole !== 'owner' && callerRole !== 'admin') {
    throw new Error('Only the Workspace Owner or Admins can remove members.');
  }

  if (targetUserId === workspace.userId) {
    throw new Error('Cannot remove the Owner from workspace.');
  }

  await db.delete(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUserId)));
  return { success: true };
}

export async function acceptWorkspaceInvite(code: string) {
  const currentUser = await getAuthUserRecord();
  if (!currentUser) throw new Error('Please log in to accept the invitation.');

  const invite = await db.query.workspaceInvites.findFirst({
    where: (inv, { eq }) => eq(inv.code, code),
  });

  if (!invite) throw new Error('Invalid or expired invitation link.');

  if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
    throw new Error('This invitation link has expired.');
  }

  if (invite.maxUses && invite.maxUses > 0 && invite.usedCount >= invite.maxUses) {
    throw new Error('This invitation link has reached its maximum user limit.');
  }

  if (invite.allowedDomain) {
    const userDomain = currentUser.email.split('@')[1]?.toLowerCase();
    const requiredDomain = invite.allowedDomain.replace('@', '').toLowerCase();
    if (userDomain !== requiredDomain) {
      throw new Error(`Access restricted. Only emails with domain @${requiredDomain} can join.`);
    }
  }

  const existingMember = await db.query.workspaceMembers.findFirst({
    where: (m, { eq, and }) => and(eq(m.workspaceId, invite.workspaceId), eq(m.userId, currentUser.id)),
  });

  if (!existingMember) {
    await db.insert(workspaceMembers).values({
      workspaceId: invite.workspaceId,
      userId: currentUser.id,
      role: invite.role,
    });
  }

  await db
    .update(workspaceInvites)
    .set({ usedCount: invite.usedCount + 1 })
    .where(eq(workspaceInvites.id, invite.id));

  return { workspaceId: invite.workspaceId };
}
