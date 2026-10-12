import { NextResponse, NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { users, payments } from '~/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { BILLING_CONFIG, PlanId } from '~/lib/billing/config';

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  return getUserId(req as unknown as NextRequest);
}

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRows = await db
      .select({
        balance: users.balance,
        subscriptionTier: users.subscriptionTier,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
        stats: users.stats,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userRows[0];
    let currentTier = (user.subscriptionTier || 'free').toLowerCase() as PlanId;
    const userStats = (user.stats as Record<string, any>) || {};
    let isCancelled = Boolean(userStats.subscriptionCancelled);

    // Check if subscription has expired
    if (currentTier !== 'free' && user.subscriptionExpiresAt) {
      if (new Date() > new Date(user.subscriptionExpiresAt)) {
        await db
          .update(users)
          .set({
            subscriptionTier: 'free',
            subscriptionExpiresAt: null,
            balance: 10,
            stats: { ...userStats, subscriptionCancelled: false },
          })
          .where(eq(users.id, userId));
        currentTier = 'free';
        isCancelled = false;
      }
    }

    const planConfig = BILLING_CONFIG.plans[currentTier] || BILLING_CONFIG.plans.free;

    // Fetch payment history
    const userPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(50);

    return NextResponse.json({
      balance: Number(user.balance ?? 10),
      subscriptionTier: currentTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionCancelled: isCancelled,
      planConfig,
      payments: userPayments,
    });
  } catch (error) {
    console.error('Error fetching credits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, amount, tier } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized — please log in and try again.' }, { status: 401 });
    }

    const selectedTier = (tier?.toLowerCase() || 'pro') as PlanId;
    const plan = BILLING_CONFIG.plans[selectedTier] || BILLING_CONFIG.plans.pro;

    const addedCredits = plan.monthlyCredits;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const userRows = await db
      .select({ stats: users.stats })
      .from(users)
      .where(eq(users.id, userId));
    const currentStats = (userRows[0]?.stats as Record<string, any>) || {};

    const updateData: any = {
      balance: addedCredits, // Reset credits to exact monthly plan allowance (no rollover)
      subscriptionTier: selectedTier,
      subscriptionExpiresAt: expiresAt,
      stats: { ...currentStats, subscriptionCancelled: false },
      updatedAt: new Date(),
    };

    // Update user balance and tier
    await db.update(users).set(updateData).where(eq(users.id, userId));

    // Record payment
    await db.insert(payments).values({
      userId,
      orderId,
      amount: Number(amount || plan.price),
      tier: selectedTier,
    });

    return NextResponse.json({
      success: true,
      subscriptionTier: selectedTier,
      addedCredits,
      plan,
    });
  } catch (error: unknown) {
    console.error('Error updating subscription/credits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRows = await db
      .select({ stats: users.stats })
      .from(users)
      .where(eq(users.id, userId));

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentStats = (userRows[0]?.stats as Record<string, any>) || {};

    await db
      .update(users)
      .set({
        stats: { ...currentStats, subscriptionCancelled: true },
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true, cancelled: true });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
