import { NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { products, competitors, productIdeas } from '~/lib/db/schema';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.name) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }

    // 1. Create Product
    const [product] = await db.insert(products).values({
      userId,
      name: body.name,
      description: body.description || '',
    }).returning();

    // 2. Generate Initial Competitors (Simulated AI)
    await db.insert(competitors).values([
      {
        productId: product.id,
        name: 'LegacyCorp Solutions',
        websiteUrl: 'https://legacycorp.example.com',
        strengths: 'Established brand, large enterprise client base.',
        weaknesses: 'Slow to innovate, clunky UI, expensive.',
        featureDifferences: 'They lack real-time AI capabilities.',
      },
      {
        productId: product.id,
        name: 'StartupAI Tools',
        websiteUrl: 'https://startupai.example.com',
        strengths: 'Fast iteration, modern UI.',
        weaknesses: 'Unproven security, small team.',
        featureDifferences: 'They rely too much on manual user input.',
      }
    ]);

    // 3. Generate Initial Ideas (Simulated AI)
    await db.insert(productIdeas).values([
      {
        productId: product.id,
        title: 'Real-time Canvas Collaboration',
        description: 'Allow multiple team members to edit the product canvas at the same time.',
        reasoning: 'Competitors lack seamless multiplayer functionality. This drives growth.',
        status: 'new',
      },
      {
        productId: product.id,
        title: 'Automated Competitor Tracking Alerts',
        description: 'Send Slack/Email alerts when a competitor updates their pricing or features.',
        reasoning: 'LegacyCorp requires manual checking. Automation saves users 5 hours/week.',
        status: 'new',
      }
    ]);

    return Response.json({ success: true, product });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
