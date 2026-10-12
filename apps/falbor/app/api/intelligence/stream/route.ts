import { streamText, tool } from 'ai';
import { z } from 'zod';
import { intelligenceSchema } from '~/lib/db/schema';
import { db } from '~/lib/db';
import { workspaces } from '~/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import { getAgentModel } from '~/lib/agent/core';
import { uiTools, UI_PROMPT } from '~/lib/agent/uiTools';

export async function POST(req: Request) {
  const { workspaceId } = await req.json();

  const authUser = await getAuthUserDetails();
  if (!authUser) return new Response('Unauthorized', { status: 401 });
  const user = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.email, authUser.email) });
  if (!user) return new Response('Unauthorized', { status: 401 });

  const workspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq, and }) => and(eq(workspaces.id, workspaceId), eq(workspaces.userId, user.id)),
  });

  if (!workspace) return new Response('Workspace not found', { status: 404 });

  const context = workspace.contextPrompt || 'No initial context provided.';

  const result = streamText({
    model: getAgentModel(),
    prompt: `You are FalborAgent (ID: agent_db3e33c9b1aa480ab5324cd652a09dd27d837e1d697249039a), an elite product strategist, skeptical investor, growth operator, and technical co-founder.

    Context:
    ${context}

    TASK: Produce a full Product Intelligence report for this workspace.
    - Think out loud briefly about your plan and hypotheses as normal text.
    - Use 'read_knowledge' with diverse, specific focus areas (pain points, pricing model, technical stack, ICP traits).
    - Use 'search_competitors' with unique, specific queries targeting niche competitors, alternatives and market dynamics.
    - You MUST finish by calling 'submit_intelligence' exactly once with the complete structured output matching the schema. The task is not complete until you do.

    ${UI_PROMPT}`,
    tools: {
      ...uiTools,
      read_knowledge: tool({
        description: 'Read and extract key product positioning from the workspace knowledge.',
        parameters: z.object({
          focusAreas: z.array(z.string()).describe('The areas you want to extract, e.g. "Pain points", "Target audience"'),
        }),
        execute: async ({ focusAreas }) => {
          return { status: 'success', extracted: `Extracted data for: ${focusAreas.join(', ')}` };
        },
      }),
      search_competitors: tool({
        description: 'Search the web for competitors in the market based on the product description.',
        parameters: z.object({
          queries: z.array(z.string()).describe('List of search queries, e.g. "email marketing tools for creators"'),
        }),
        execute: async ({ queries }) => {
          const foundLinks = queries.map((q) => {
            const domain = q.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            return {
              title: `${q} - Market Analysis`,
              url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
              favicon: `https://www.google.com/s2/favicons?domain=${domain}.com&sz=64`,
            };
          });
          return { status: 'success', foundLinks };
        },
      }),
      submit_intelligence: tool({
        description: 'Submit the final structured product intelligence data.',
        parameters: intelligenceSchema,
        execute: async (data) => {
          await db
            .update(workspaces)
            .set({ intelligenceData: data })
            .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, user.id)));
          return { status: 'submitted', data };
        },
      }),
    },
    maxSteps: 20, // every UI tool call is its own step, so this must be generous
    maxTokens: 8000, // 4000 could truncate the big submit_intelligence payload
  });

  return result.toDataStreamResponse({
    getErrorMessage: (error) => (error instanceof Error ? error.message : String(error)),
  });
}