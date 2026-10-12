import { NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { products, competitors, productIdeas, workspaces } from '~/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  try {
    if (workspaceId) {
      let product = await db.query.products.findFirst({
        where: eq(products.workspaceId, workspaceId),
      });

      // Auto-provision if it doesn't exist
      if (!product) {
        // Find workspace name
        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, workspaceId)
        });

        const newProductId = uuidv4();
        await db.insert(products).values({
          id: newProductId,
          userId,
          workspaceId,
          name: workspace?.name || 'Workspace Product',
        });

        product = await db.query.products.findFirst({
          where: eq(products.id, newProductId),
        });
      }

      if (!product || product.userId !== userId) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }

      const productCompetitors = await db
        .select()
        .from(competitors)
        .where(eq(competitors.productId, product.id));

      const ideas = await db
        .select()
        .from(productIdeas)
        .where(eq(productIdeas.productId, product.id))
        .orderBy(desc(productIdeas.createdAt));

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId)
      });

      // Update lastActiveAt to prevent pausing
      await db
        .update(products)
        .set({ lastActiveAt: new Date() })
        .where(eq(products.id, product.id));

      return Response.json({ 
        product, 
        competitors: productCompetitors, 
        ideas, 
        intelligence: workspace?.intelligenceData,
        canvasCards: workspace?.canvasCards || []
      });
    } else {
      return Response.json({ error: 'Missing workspaceId' }, { status: 400 });
    }
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
