import { NextResponse, NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { workspaceSignups, claimedMilestones, users } from '~/lib/db/schema';
import { eq, count, sql, and } from 'drizzle-orm';

const QUEST_DEFINITIONS = [
  { id: 1, usersRequired: 10, rewardCents: 5 },
  { id: 2, usersRequired: 20, rewardCents: 8 },
  { id: 3, usersRequired: 50, rewardCents: 20 },
  { id: 4, usersRequired: 100, rewardCents: 30 },
  { id: 5, usersRequired: 200, rewardCents: 80 },
];

export async function GET(req: Request) {
  try {
    const userId = await getUserId(req as unknown as NextRequest);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const signupCountRes = await db
      .select({ count: count() })
      .from(workspaceSignups)
      .where(eq(workspaceSignups.workspaceId, workspaceId));

    const totalSignups = signupCountRes[0]?.count || 0;

    const claimedRes = await db
      .select()
      .from(claimedMilestones)
      .where(eq(claimedMilestones.workspaceId, workspaceId));

    const claimedMap = new Set(claimedRes.map((c) => c.questId));

    let previousCompleted = true;
    const quests = QUEST_DEFINITIONS.map((def) => {
      const reachedTarget = totalSignups >= def.usersRequired;
      const isCompleted = claimedMap.has(def.id);
      const unlocked = previousCompleted;

      if (!isCompleted) {
        previousCompleted = false;
      }

      return {
        ...def,
        unlocked,
        completed: isCompleted,
        canClaim: unlocked && reachedTarget && !isCompleted,
        progress: totalSignups,
      };
    });

    return NextResponse.json({
      totalSignups,
      hasConnectedAPI: totalSignups > 0,
      quests,
    });
  } catch (err: any) {
    console.error('Error fetching milestones status:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId(req as unknown as NextRequest);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, questId } = body;

    if (!workspaceId || !questId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const quest = QUEST_DEFINITIONS.find((q) => q.id === questId);
    if (!quest) {
      return NextResponse.json({ error: 'Invalid quest ID' }, { status: 400 });
    }

    const signupCountRes = await db
      .select({ count: count() })
      .from(workspaceSignups)
      .where(eq(workspaceSignups.workspaceId, workspaceId));

    const totalSignups = signupCountRes[0]?.count || 0;
    if (totalSignups < quest.usersRequired) {
      return NextResponse.json(
        { error: `You need at least ${quest.usersRequired} registered users to claim this reward.` },
        { status: 400 }
      );
    }

    const existingClaim = await db
      .select()
      .from(claimedMilestones)
      .where(and(eq(claimedMilestones.workspaceId, workspaceId), eq(claimedMilestones.questId, questId)))
      .limit(1);

    if (existingClaim.length > 0) {
      return NextResponse.json({ error: 'Quest reward already claimed.' }, { status: 400 });
    }

    await db.insert(claimedMilestones).values({
      workspaceId,
      questId,
      rewardCents: quest.rewardCents,
    });

    await db
      .update(users)
      .set({
        balance: sql`${users.balance} + ${quest.rewardCents}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true, rewardCents: quest.rewardCents });
  } catch (err: any) {
    console.error('Error claiming quest reward:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
