import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { getAgentModel } from '~/lib/agent/core';

export const growthCategories = ['search', 'free_tool', 'competitor_gap'] as const;
export type GrowthCategory = (typeof growthCategories)[number];

const opportunitySchema = z.object({
  opportunities: z.array(z.object({
    title: z.string(),
    category: z.enum(growthCategories),
    query: z.string(),
    description: z.string(),
    targetAudience: z.string(),
    acquisitionMechanism: z.string(),
    recommendedAction: z.string(),
    difficulty: z.enum(['low', 'medium', 'high']),
    confidence: z.number().min(0).max(100),
    productRelevance: z.number().min(0).max(100),
    intent: z.enum(['informational', 'commercial', 'transactional', 'navigational', 'unknown']),
    sourceUrls: z.array(z.string()).min(1),
  })).max(12),
});

export async function discoverGrowthOpportunities(productContext: string, research: Array<{ title: string; url: string; snippet: string; category: GrowthCategory }>) {
  if (!research.length) return [];
  const { object } = await generateObject({
    model: getAgentModel(),
    schema: opportunitySchema,
    prompt: `You are Falbor's growth intelligence agent. Discover only concrete customer-acquisition opportunities for the specific product described below. Do not return generic business advice, article summaries, feature requests, or vague SEO suggestions. Every opportunity must explain a real acquisition mechanism and a concrete next action. Search opportunities must use a plausible query and must not claim Search Console metrics unless the evidence contains them. Free-tool opportunities must be based on a real problem and explain why the tool could attract the product's target audience. Competitor-gap opportunities must be supported by evidence of a weakness, underserved use case, or comparison demand. Use only supplied evidence. Do not invent traffic, volume, revenue, conversion, customer, or competitor metrics. Return fewer opportunities rather than weak ones. Every sourceUrls entry must exactly match a supplied URL.\n\nProduct context:\n${productContext}\n\nResearch evidence:\n${research.map((item) => `[${item.category}] ${item.title}\n${item.url}\n${item.snippet}`).join('\n\n')}`,
  });
  return object.opportunities;
}

export async function generateOpportunityExecution(opportunity: { title: string; category: string; description: string | null; targetAudience: string | null; acquisitionMechanism: string | null; recommendedAction: string | null; query: string }, productContext: string) {
  const type = opportunity.category === 'search' ? 'seo_fix' : opportunity.category === 'free_tool' ? 'build_prompt' : 'growth_plan';
  const { text } = await generateText({
    model: getAgentModel(),
    prompt: `Create a specific, implementation-ready ${type} for this growth opportunity. Use the product context and opportunity details. Do not use generic templates or invent metrics. Do not modify or publish any external site.\n\nProduct context:\n${productContext}\n\nOpportunity:\n${JSON.stringify(opportunity)}`,
  });
  return { type, text };
}
