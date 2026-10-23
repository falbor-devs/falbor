import { generateObject } from 'ai';
import { z } from 'zod';
import { getAgentModel } from '~/lib/agent/core';

const researchSchema = z.object({ opportunities: z.array(z.object({ query: z.string(), intent: z.enum(['informational', 'commercial', 'transactional', 'navigational', 'unknown']), explanation: z.string(), audience: z.string().nullable(), productRelevance: z.number().min(0).max(100), confidence: z.number().min(0).max(100), sourceUrls: z.array(z.string()).min(1) })).max(8) });

export async function analyzeResearchEvidence(productContext: string, evidence: Array<{ title: string; url: string; snippet: string }>) {
  if (!evidence.length) return [];
  const { object } = await generateObject({ model: getAgentModel(), schema: researchSchema, prompt: `You are researching Google search demand, not writing a business improvement plan. Analyze only the supplied evidence for this product. Return only plausible phrases a real person could type into Google as query. Never return recommendations such as "Improve documentation" or "Strengthen security". Do not invent search volume, traffic, user behavior, competitors, or product defects. External research is a candidate query and must not be described as verified Search Console performance. If evidence is insufficient, omit the opportunity. Every sourceUrls value must exactly match a supplied URL. Product context: ${productContext}\nEvidence:\n${evidence.map((item) => `${item.title}\n${item.url}\n${item.snippet}`).join('\n\n')}` });
  return object.opportunities;
}
