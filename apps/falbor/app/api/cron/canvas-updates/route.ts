import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { products, productUpdates, productIdeas } from '~/lib/db/schema';
import { eq, lte, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// This would be triggered by a Vercel Cron or similar service
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // In production, uncomment to secure the cron
      // return new NextResponse('Unauthorized', { status: 401 });
    }

    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 1. Pause products inactive for > 2 weeks
    const inactiveProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          lte(products.lastActiveAt, twoWeeksAgo)
        )
      );

    for (const p of inactiveProducts) {
      await db
        .update(products)
        .set({ isActive: false })
        .where(eq(products.id, p.id));
        
      await db.insert(productUpdates).values({
        productId: p.id,
        type: 'pause',
        content: { message: 'AI paused due to inactivity. Reactivate by visiting the Canvas.' },
      });
    }

    // 2. Generate new insights for active products
    const activeProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.isActive, true));

    for (const p of activeProducts) {
      // Simulate an AI brainstorm session
      await db.insert(productIdeas).values({
        productId: p.id,
        title: `Dynamic Idea ${Math.floor(Math.random() * 1000)}`,
        description: 'Periodic background check suggested this new feature.',
        reasoning: 'Market trends indicate a shift towards automated workflows.',
        status: 'new',
      });

      await db.insert(productUpdates).values({
        productId: p.id,
        type: 'insight',
        content: { message: 'Generated a new feature idea based on weekly analysis.' },
      });
    }

    return NextResponse.json({
      success: true,
      pausedCount: inactiveProducts.length,
      updatedCount: activeProducts.length,
    });
  } catch (error: any) {
    console.error('Canvas Update Cron Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
