'use server'

import { db } from '~/lib/db';
import { workspaces, workspaceSources } from '~/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';

async function getUserId() {
  const authUser = await getAuthUserDetails();
  if (!authUser) return null;
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, authUser.email),
  });
  return user?.id || null;
}

export type SourceItem = {
  id?: string;
  title: string;
  platform: 'Reddit' | 'Facebook' | 'LinkedIn' | 'Twitter' | 'ProductHunt' | 'HackerNews' | 'Directory' | 'Contacts' | 'Other';
  url: string;
  relevanceScore: number;
  audienceSize: string;
  status: 'active' | 'pending' | 'saved' | 'archived';
  strategy: string;
};

export async function getWorkspaceSources(workspaceId: string): Promise<SourceItem[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const sources = await db.query.workspaceSources.findMany({
    where: (workspaceSources, { eq, and }) => and(eq(workspaceSources.workspaceId, workspaceId), eq(workspaceSources.userId, userId)),
    orderBy: [desc(workspaceSources.relevanceScore)],
  });

  return sources as SourceItem[];
}

export async function generateWorkspaceSources(workspaceId: string): Promise<SourceItem[]> {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  const workspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq, and }) => and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)),
  });

  if (!workspace) throw new Error('Workspace not found');

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const sourcesSchema = z.object({
    sources: z.array(
      z.object({
        title: z.string().describe('Name of the community, subreddit, group, directory, hashtag, or target person/contact'),
        platform: z.enum(['Reddit', 'Facebook', 'LinkedIn', 'Twitter', 'ProductHunt', 'HackerNews', 'Directory', 'Contacts', 'Other']),
        url: z.string().url().describe('Working URL'),
        relevanceScore: z.number().min(60).max(99).describe('Relevance percentage 60-99%'),
        audienceSize: z.string().describe('Estimated audience size e.g. 45k members or 1-on-1 DM'),
        strategy: z.string().describe('Actionable advice on how to engage without spamming'),
      })
    ).min(15).max(40)
  });

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      mode: 'json',
      schema: sourcesSchema,
      prompt: `You are an expert growth hacker specializing in early-stage user acquisition.
Analyze the workspace context below and dynamically discover all relevant, high-quality acquisition sources (ranging from 15 to 40 items based on how rich the market opportunity is). Do not restrict yourself to a fixed count of 20; determine the ideal count automatically from the data.

IMPORTANT FORMATTING RULES:
1. Include a balanced mix of platforms: Reddit, Facebook groups, Twitter, LinkedIn, ProductHunt, Directories, and direct Contacts (key influencers, founder profiles, potential advisors, or early adopters for direct outreach).
2. ALL URLs MUST BE VALID, ACCESSIBLE REAL-WORLD URLS:
   - Reddit: 'https://www.reddit.com/r/[subreddit_name]/'
   - Twitter Hashtags/Search: 'https://x.com/search?q=[query]' or profiles 'https://x.com/[username]'
   - LinkedIn Search/Groups: 'https://www.linkedin.com/search/results/all/?keywords=[query]' or profile 'https://www.linkedin.com/in/[username]'
   - Facebook Groups: 'https://www.facebook.com/search/groups/?q=[query]'
   - ProductHunt: 'https://www.producthunt.com/'
   - Directories: 'https://www.producthunt.com', 'https://betalist.com', 'https://news.ycombinator.com', etc.
3. For 'Contacts' items, provide specific roles/influencers in this niche with DM strategies on LinkedIn or Twitter/X.

WORKSPACE CONTEXT:
${workspace.contextPrompt || workspace.name || 'SaaS product targeting early adopters'}
`,
    });

    await db.delete(workspaceSources).where(and(eq(workspaceSources.workspaceId, workspaceId), eq(workspaceSources.userId, userId)));

    const insertedRows = await Promise.all(
      object.sources.map(src =>
        db.insert(workspaceSources).values({
          workspaceId,
          userId,
          title: src.title,
          platform: src.platform,
          url: src.url,
          relevanceScore: src.relevanceScore,
          audienceSize: src.audienceSize,
          status: 'active',
          strategy: src.strategy,
        }).returning()
      )
    );

    return insertedRows.flat() as SourceItem[];
  } catch (error) {
    console.error('Failed to generate acquisition sources:', error);
    throw new Error('Failed to generate acquisition sources');
  }
}
