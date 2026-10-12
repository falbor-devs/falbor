'use server'

import { db } from '~/lib/db';
import { productDecks, workspaces, users } from '~/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import OpenAI from 'openai';

export interface SlideData {
  id: number;
  type: string;
  title: string;
  subtitle?: string;
  content: string;
  customHtml?: string;
}

export async function getWorkspaceProductDeck(workspaceId: string) {
  let deck = await db.query.productDecks.findFirst({
    where: (decks, { eq }) => eq(decks.workspaceId, workspaceId),
  });

  if (!deck) {
    deck = await autoGenerateWorkspaceProductDeck(workspaceId);
  }

  return deck;
}

export async function saveWorkspaceProductDeck(workspaceId: string, title: string, slides: SlideData[]) {
  const existing = await db.query.productDecks.findFirst({
    where: (decks, { eq }) => eq(decks.workspaceId, workspaceId),
  });

  if (existing) {
    const [updated] = await db
      .update(productDecks)
      .set({
        title,
        slides,
        updatedAt: new Date(),
      })
      .where(eq(productDecks.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(productDecks)
      .values({
        workspaceId,
        title,
        slides,
        isPublished: false,
      })
      .returning();
    return created;
  }
}

export async function publishWorkspaceProductDeck(workspaceId: string) {
  const existing = await db.query.productDecks.findFirst({
    where: (decks, { eq }) => eq(decks.workspaceId, workspaceId),
  });

  if (!existing) {
    throw new Error('No product deck found to publish.');
  }

  const [published] = await db
    .update(productDecks)
    .set({
      isPublished: true,
      publishedSlug: existing.id,
      updatedAt: new Date(),
    })
    .where(eq(productDecks.id, existing.id))
    .returning();

  return published;
}

export async function autoGenerateWorkspaceProductDeck(workspaceId: string) {
  const workspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq }) => eq(workspaces.id, workspaceId),
  });

  const authUser = await getAuthUserDetails();
  const userName = (authUser as any)?.name || authUser?.email?.split('@')[0] || 'Founder';
  const userEmail = authUser?.email || '';

  const productName = workspace?.name || 'My Product';
  const productContext = workspace?.contextPrompt || `A software product built by ${userName} (${userEmail}).`;

  let slides: SlideData[] = [];

  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert Silicon Valley pitch deck creator.
Generate an authentic, highly specific 12-slide investor presentation in JSON format tailored from scratch to the given product and founder. Do NOT use generic placeholder text.

Return JSON with a "slides" array containing 12 slide objects:
Slide types (in order):
1. Cover (Product Name, 1-sentence tagline, Founder Name & Email)
2. Problem (Specific pain points, affected users, inadequacy of current solutions)
3. Solution (What the product does, core value proposition)
4. Product (Workflow pipeline steps & visual components)
5. Why Now (Market shifts, cost reductions, tech evolution)
6. Market (Target audience, market size, distribution channels)
7. Traction (Key metrics, user numbers, MRR, retention)
8. Business Model (Pricing tiers, unit economics, value triggers)
9. Competition (Positioning matrix comparing current alternatives vs this product)
10. Go-to-Market (Growth plan 100 -> 1,000 -> 100,000 users)
11. Team (Founder background, technical execution capabilities)
12. Vision & Ask (Operational vision & pre-seed funding ask)

Each slide object must have:
- id: number (1 to 12)
- type: string
- title: string
- subtitle: string
- content: clean HTML string using modern Tailwind styling (p-6, rounded-2xl, flex, grid, border, text-gray-900 dark:text-gray-100, etc.) with CSS animations. CRITICAL: Ensure text is always clearly visible with strong contrast (never text-white on light backgrounds, always use text-gray-900 dark:text-gray-100 for primary text). Write authentic, project-specific copy with real numbers and details.`,
          },
          {
            role: 'user',
            content: `Product Name: ${productName}\nContext: ${productContext}\nFounder Name: ${userName}\nFounder Email: ${userEmail}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 3500,
      });

      const parsed = JSON.parse(res.choices[0].message.content || '{}');
      if (Array.isArray(parsed.slides) && parsed.slides.length >= 12) {
        slides = parsed.slides;
      }
    } catch (e) {
      console.error('Error generating AI pitch deck with OpenAI:', e);
    }
  }

  const [created] = await db
    .insert(productDecks)
    .values({
      workspaceId,
      title: `${productName} Investor Pitch Deck`,
      slides,
      isPublished: false,
    })
    .returning();

  return created;
}

export async function getPublicProductDeckById(id: string) {
  const deck = await db.query.productDecks.findFirst({
    where: (decks, { eq, and }) => and(eq(decks.id, id), eq(decks.isPublished, true)),
  });
  return deck;
}
