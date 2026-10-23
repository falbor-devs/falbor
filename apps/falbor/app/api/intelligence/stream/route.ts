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
    - Use 'read_knowledge' FIRST with diverse focus areas (pain points, pricing model, technical stack, ICP traits) — it returns the ACTUAL workspace knowledge. Ground every conclusion in what it returns.
    - Use 'search_competitors' with 3-6 specific, non-generic queries scoped to this exact category and audience (e.g. "alternatives to X for Y", "best Z tools for {audience}", "{category} vs {category}"). The tool returns real search results; base competitor names ONLY on what appears in those results.
    - You MUST finish by calling 'submit_intelligence' exactly once with the complete structured output matching the schema. The task is not complete until you do.

    COMPETITOR DOCTRINE (critical):
    - A DIRECT competitor solves the SAME core problem for the SAME primary audience in the SAME way/category (same job-to-be-done). A FUNCTIONAL competitor solves the same core problem with a different approach. Everything else is NOT a competitor.
    - The fact that a product is "AI-powered" does NOT make it a competitor. Judge by job-to-be-done overlap and audience overlap, never by tech adjacency. A general-purpose AI chatbot, LLM, or a website that merely uses AI is NOT a competitor unless it performs this product's exact job.
    - Every competitor you submit MUST be supported by evidence you actually saw: a search result title/url/snippet or the workspace knowledge showing it offers this job for this audience. If nothing supports a competitor, do not list it. An empty or short list of true competitors beats a padded list.
    - Never invent competitor names, and never copy the user's own product as a competitor of itself.

    TRUTH RULES:
    - NEVER hallucinate traction, users, revenue, pricing, funding, or market data.
    - If something is not evidenced by workspace knowledge or search results, mark it clearly as an assumption or omit it.

    ${UI_PROMPT}`,
    tools: {
      ...uiTools,
      read_knowledge: tool({
        description: 'Read the real workspace knowledge (product context, positioning, prior intelligence). Returns the actual content to ground your analysis.',
        parameters: z.object({
          focusAreas: z.array(z.string()).describe('The areas you want to extract, e.g. "Pain points", "Target audience"'),
        }),
        execute: async ({ focusAreas }) => {
          return {
            status: 'success',
            extractionFocus: focusAreas,
            workspace: {
              name: workspace.name,
              contextPrompt: context,
              existingIntelligence: workspace.intelligenceData || null,
            },
            guidance: 'Ground every section of the report in this knowledge. Anything not supported by the knowledge or your search results must be marked as an assumption or omitted.',
          };
        },
      }),
      search_competitors: tool({
        description: 'Search the real web (SerpApi) for competitors, alternatives and market dynamics. Returns real search results per query.',
        parameters: z.object({
          queries: z.array(z.string()).describe('List of search queries, e.g. "email marketing tools for creators"'),
        }),
        execute: async ({ queries }) => {
          const apiKey = process.env.SERPAPI_KEY;
          if (!apiKey) {
            return { status: 'error', error: 'SERPAPI_KEY not configured', results: {}, foundLinks: [] };
          }
          const results: Record<string, Array<{ title: string; url: string; snippet: string; source: string }>> = {};
          for (const query of queries.slice(0, 6)) {
            try {
              const url = new URL('https://serpapi.com/search');
              url.searchParams.set('q', query);
              url.searchParams.set('api_key', apiKey);
              url.searchParams.set('num', '8');
              url.searchParams.set('hl', 'en');
              const res = await fetch(url.toString());
              if (!res.ok) continue;
              const data = await res.json();
              results[query] = (data.organic_results || []).slice(0, 8).map((r: any) => ({
                title: r.title || '',
                url: r.link || '',
                snippet: r.snippet || '',
                source: r.displayed_link || '',
              }));
            } catch {
              continue;
            }
          }
          const foundLinks = Object.values(results)
            .flat()
            .filter((r) => r.url)
            .slice(0, 12)
            .map((r) => {
              try {
                return {
                  title: r.title,
                  url: r.url,
                  favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=64`,
                };
              } catch {
                return { title: r.title, url: r.url, favicon: '' };
              }
            });
          return { status: 'success', results, foundLinks };
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