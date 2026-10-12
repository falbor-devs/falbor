import { generateText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { uiTools, UI_PROMPT } from './uiTools';
import { createBrowserUseTools } from './browserUseTool';
import { searchProspectsWithTomba } from '~/lib/agent/growthTools';
import { db } from '~/lib/db';
import { agentProspects, signalPosts } from '~/lib/db/schema';

export type AgentChannel = 'web' | 'telegram';
export type AgentHistoryMessage = { role: 'user' | 'assistant'; content: string };

export const getAgentModel = () => createOpenAI({ apiKey: process.env.OPENAI_API_KEY })('gpt-4o-mini');

export function sanitizeHistory(history: unknown): AgentHistoryMessage[] {
    if (!Array.isArray(history)) return [];
    return history
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
        .slice(-20)
        .map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

let humanPartnerPrompt = '';
let startupExpertPrompt = '';

if (typeof window === 'undefined') {
    try {
        const fs = require('fs');
        const path = require('path');
        const rootDir = process.cwd().includes('apps/falbor')
            ? path.join(process.cwd(), '../../')
            : process.cwd();

        const humanPartnerPath = path.join(rootDir, 'Docs/Skills/human-partner.md');
        if (fs.existsSync(humanPartnerPath)) {
            humanPartnerPrompt = fs.readFileSync(humanPartnerPath, 'utf-8');
        }

        const startupExpertPath = path.join(rootDir, 'Docs/Skills/startup-expert.md');
        if (fs.existsSync(startupExpertPath)) {
            startupExpertPrompt = fs.readFileSync(startupExpertPath, 'utf-8');
        }
    } catch (e) {
        console.warn('Could not read core prompt skills files for AI Sidebar Agent', e);
    }
}

export function buildAgentSystemPrompt(workspace: any, channel: AgentChannel = 'web', selectedMCPs: string[] = [], agent: any = null) {
    const intel = (workspace.intelligenceData as any) || {};
    const productName =
        workspace.name && workspace.name !== 'Untitled Workspace'
            ? workspace.name
            : intel.positioningDetails?.category || intel.positioning || intel.mainProblem || 'Falbor Product';

    const mcpNotice = Array.isArray(selectedMCPs) && selectedMCPs.length > 0
        ? `\nATTACHED MCP CONNECTORS FOR THIS REQUEST: ${selectedMCPs.join(', ')}. Use connector integrations to process data from these connected services when requested.`
        : '';

    const channelRules =
        channel === 'telegram'
            ? `CHANNEL: Telegram. Do your full reasoning and tool calls as usual, but the user only receives your FINAL text answer. Do not mention buttons, statuses or UI elements. Keep the answer self-contained.`
            : UI_PROMPT;

    const customAgentIdentity = agent 
        ? `You are ${agent.name}. Role: ${agent.role}\nCustom Instructions:\n${agent.rules}\n` 
        : `You are Falbor AI Agent, an elite technical co-founder & growth strategist for this product.`;

    const embeddedPrompts = `
<core_human_partner_persona>
${humanPartnerPrompt}
</core_human_partner_persona>

<core_startup_expert_knowledge>
${startupExpertPrompt}
</core_startup_expert_knowledge>
`;

    return `${customAgentIdentity}

${embeddedPrompts}

PRODUCT & WORKSPACE CONTEXT ALREADY KNOWN (DO NOT ASK FOR THESE):
- Workspace ID: ${workspace.id}
- Workspace Name: "${workspace.name || 'Untitled Workspace'}"
- Analyzed Product Name / Category: "${productName}"
- Current Stage: ${intel.stage || 'Validation'}
- Product Health Score: ${intel.healthScore || 'N/A'}/100
- Core Value/Problem: ${intel.mainProblem || 'N/A'}
- Known Target Audience / Demographics: ${intel.targetAudience || 'N/A'}
- ICP Details: ${JSON.stringify(intel.targetAudienceDetails || {})}
- Context Prompt / Inputs: ${workspace.contextPrompt || 'No context provided.'}${mcpNotice}

<mcp_tools>
  You have access to Model Context Protocol (MCP) tools that the user has explicitly connected and authorized.
  These tools allow you to access external services, read personal data (like emails), and perform actions on the user's behalf.
  When the user asks you to perform a task that requires these tools (e.g., reading emails), you MUST use the available MCP tools directly to fulfill the request.
  Do NOT assume you lack access. Always check your available tools and execute them!
</mcp_tools>

INSTRUCTIONS:
1. Write normal, clean, professional Markdown text.
2. CRITICAL DIRECT SITE NAVIGATION RULE: When the user asks to navigate the site, open settings, go to Canvas, Vibe, or Sources, call \`ui_cursor_click\` with the target button/page name (e.g. \`target: "Canvas"\`, \`target: "Settings"\`). DO NOT use external browser tools for site navigation.
3. CRITICAL MCP TOOL RULE: When an MCP tool or connector (e.g. Gmail, Stripe, GitHub) is attached or requested by the user, you MUST invoke the native MCP tool directly to fetch or process data.
4. DIRECT BROWSER CONTROL: You have direct access to control the user's active cloud browser session using \`browser_navigate\`, \`browser_click\`, \`browser_type\`, \`browser_new_tab\`, \`browser_read\`, and \`browser_get_elements\`. You CAN and SHOULD use these tools to directly interact with external websites. When typing into inputs, use \`pressEnter: true\` if you need to submit without finding a button. If you don't know the CSS selector for a button, use \`browser_get_elements\` first to find it. VERY IMPORTANT: \`browser_get_elements\` injects temporary \`data-ai-id\` attributes. If you click a link or a button that opens a modal, navigates, or re-renders the page, these IDs are destroyed or the DOM changes. Do NOT try to queue up or batch multiple clicks in a single turn. Complete ONE interaction (e.g. click "Message"), then ALWAYS stop and re-run \`browser_get_elements\` to see the new UI state (e.g. the chat box) before typing or clicking again. DO NOT refuse to interact with the browser.
5. When the user asks you to draw flowcharts, diagrams, or text ON THE CANVAS, you must strictly follow the CRITICAL CANVAS RULE and use \`ui_canvas_focus\` and \`ui_canvas_draw\`. DO NOT use \`ui_widget\` for canvas tasks.
6. NEVER output raw HTML/CSS code or code blocks in your regular text response.
7. Use tools actively.
8. Always finish with a clear final answer for the user.
9. CRITICAL GOOGLE ADS AUTOFILL RULE: When asked to fill out or populate Google Ads or campaign details, call \`ui_google_ads_fill\` tool with all generated JSON fields (campaignName, businessName, sitelinks, headlines, descriptions, etc.) to automatically populate the user's interface inputs live.
10. CRITICAL QUESTION & CHOICES RULE: Do NOT print out numbered lists or bullet points of questions in plain text. Whenever you have questions, options, or choices to ask the user, you MUST call the \`ui_options\` tool (or \`ui_button\` tool) so that interactive clickable option buttons appear in the UI above the chat input box.
11. CRITICAL AUTONOMOUS OUTREACH RULE: When prospecting, NEVER ask the user for permission to send emails. You have full authorization. If Gmail MCP is connected, autonomously generate the email and call the 'gmail_send_email' tool to send it immediately to EACH prospect. Then, call ui_update_agent_contact_table EXACTLY ONCE to finish.
12. CRITICAL BLOG CONTENT IMPROVEMENT RULE: When requested to improve or generate blog content or when [CONTEXT: BLOG_CONTENT_IMPROVEMENT_MCP] is provided, use \`blog_content_get\` to retrieve the current post, refine/expand it in HTML format, and call \`blog_content_update\` to save the updated post directly.
13. CRITICAL PRODUCT DECK IMPROVEMENT RULE: When requested to improve or generate presentation deck content or when [CONTEXT: PRODUCT_DECK_IMPROVEMENT_MCP] is provided, use \`presentation_get\` to retrieve the current pitch deck slides, refine or edit specific slide content in clean HTML format, and call \`presentation_update\` to save the updated deck directly.
14. CRITICAL SIGNAL RADAR RULE: When [CONTEXT: SIGNAL_RADAR] is provided, you MUST: (a) call \`read_workspace\` to understand the product's main problem and target audience, (b) call \`serp_search\` multiple times — once per platform — using queries like "site:reddit.com {problem}" or "{problem} discussion site:linkedin.com" to find REAL posts where people complain about the exact problem the product solves, (c) collect 5-10 real, unique posts per platform (aim for 15-25 total), each with a real URL, real author handle, real engagement numbers if visible, and a short excerpt of the actual content, (d) call \`ui_update_signal_posts\` EXACTLY ONCE with all found posts. CRITICAL: Do NOT call \`tomba_search_prospects\` or any email/contact tool for this task. Do NOT fabricate URLs — only use URLs returned by \`serp_search\`. Do NOT ask for permission.
15. CRITICAL BRAND MENTIONS RULE: When [CONTEXT: BRAND_MENTIONS] is provided, you MUST: (a) Identify the exact product/company name (e.g., "${productName}"). (b) Call \`serp_search\` ONLY for the user's selected platforms (e.g., "site:reddit.com ${productName}" or "site:twitter.com ${productName}"). (c) STRICT FILTERING: You MUST ONLY include posts where the title or snippet explicitly contains the exact product or company name. If search results do not explicitly mention and discuss the product/company by name, DISCARD THEM. Do NOT output generic search hits or unrelated site results. (d) Call \`ui_update_brand_mention_posts\` EXACTLY ONCE with only verified explicit mentions. If no posts explicitly mention the company name on the selected platforms, return 0 posts.

${channelRules}`;
}

export async function buildAgentTools(workspace: any, selectedMCPs: string[] = [], userId?: string, browserSessionId?: string, browserActiveTabId?: number) {
    const hasMCPs = Array.isArray(selectedMCPs) && selectedMCPs.length > 0;

    let mcpTools: Record<string, any> = {};
    if (hasMCPs) {
        const { MCPService } = require('~/lib/services/mcpService');
        mcpTools = { ...MCPService.getInstance().getToolsForServers(selectedMCPs) };
        if (userId) {
            const { NativeToolsService } = require('~/lib/services/nativeToolsService');
            const nativeTools = await NativeToolsService.getToolsForConnectors(selectedMCPs, userId);
            Object.assign(mcpTools, nativeTools);
        }
    }

    const browserTools = createBrowserUseTools(browserSessionId, browserActiveTabId);

    return {
        ...mcpTools,
        ...uiTools,
        ...browserTools,
        read_workspace: tool({
            description: 'Read the stored product intelligence and context for this workspace.',
            parameters: z.object({ focus: z.string().optional().describe('What you are looking for, e.g. "pricing"') }),
            execute: async () => {
                const intel = (workspace.intelligenceData as any) || {};
                return {
                    name: workspace.name,
                    contextPrompt: workspace.contextPrompt || null,
                    stage: intel.stage ?? null,
                    healthScore: intel.healthScore ?? null,
                    mainProblem: intel.mainProblem ?? null,
                    targetAudience: intel.targetAudience ?? null,
                    positioning: intel.positioning ?? null,
                    marketSignals: intel.marketSignals ?? null,
                    missingInformation: intel.missingInformation ?? [],
                    nextBestAction: intel.nextBestAction ?? null,
                };
            },
        }),
        serp_search: tool({
            description: 'Search the web using SerpApi to find real community posts, discussions, and pages. Use this for Signal Radar to find real posts from Reddit, Twitter, LinkedIn, etc.',
            parameters: z.object({
                query: z.string().describe('The search query, e.g. "site:reddit.com struggling with project setup boilerplate"'),
                num: z.number().optional().default(10).describe('Number of results to return (max 10)'),
            }),
            execute: async ({ query, num = 10 }) => {
                try {
                    const apiKey = process.env.SERPAPI_KEY;
                    if (!apiKey) return { error: 'SERPAPI_KEY not configured', results: [] };
                    const url = new URL('https://serpapi.com/search');
                    url.searchParams.set('q', query);
                    url.searchParams.set('api_key', apiKey);
                    url.searchParams.set('num', String(Math.min(num, 10)));
                    url.searchParams.set('hl', 'en');
                    const res = await fetch(url.toString());
                    if (!res.ok) return { error: `SerpApi error: ${res.status}`, results: [] };
                    const data = await res.json();
                    const results = (data.organic_results || []).slice(0, num).map((r: any) => ({
                        title: r.title || '',
                        url: r.link || '',
                        snippet: r.snippet || '',
                        displayed_link: r.displayed_link || '',
                    }));
                    return { results };
                } catch (e: any) {
                    return { error: e.message, results: [] };
                }
            },
        }),
        tomba_search_prospects: tool({
            description: 'Search the Tomba API for real prospects. Since Tomba requires a domain to search, you MUST autonomously identify a target company domain (e.g. "stripe.com") based on the user\'s ICP and provide it here.',
            parameters: z.object({
                jobTitles: z.array(z.string()).optional().describe('Job titles to target, e.g. ["Sales Manager", "VP"]'),
                companyDomain: z.string().describe('REQUIRED: The specific company domain to search, e.g. "acme.com"'),
                perPage: z.number().optional().describe('Number of results per page (limit to 5 for testing)')
            }),
            execute: async (filters) => {
                try {
                    const prospects = await searchProspectsWithTomba(filters);
                    return { success: true, prospects };
                } catch (e: any) {
                    return { success: false, error: e.message };
                }
            }
        }),
        blog_content_get: tool({
            description: 'Fetch the blog post title and content for a workspace.',
            parameters: z.object({
                workspaceId: z.string().describe('The workspace ID'),
            }),
            execute: async ({ workspaceId }) => {
                const { getWorkspaceBlog } = require('~/lib/actions/blogContent');
                const blog = await getWorkspaceBlog(workspaceId);
                return {
                    id: blog?.id || null,
                    title: blog?.title || 'Untitled Blog Post',
                    content: blog?.content || '',
                    isPublished: blog?.isPublished || false,
                };
            },
        }),
        blog_content_update: tool({
            description: 'Update and save the blog post title and content for a workspace.',
            parameters: z.object({
                workspaceId: z.string().describe('The workspace ID'),
                title: z.string().describe('The updated blog post title'),
                content: z.string().describe('The updated blog post HTML or text content'),
            }),
            execute: async ({ workspaceId, title, content }) => {
                const { saveWorkspaceBlog } = require('~/lib/actions/blogContent');
                const cleanContent = content
                    .replace(/^```html\s*/i, '')
                    .replace(/```$/i, '')
                    .replace(/<title[\s\S]*?<\/title>/gi, '')
                    .trim();
                const updated = await saveWorkspaceBlog(workspaceId, title, cleanContent);
                return {
                    success: true,
                    blog: updated,
                };
            },
        }),
        presentation_get: tool({
            description: 'Get the product pitch deck slides and title for a workspace.',
            parameters: z.object({
                workspaceId: z.string().describe('The workspace ID'),
            }),
            execute: async ({ workspaceId }) => {
                const { getWorkspaceProductDeck } = require('~/lib/actions/productDeck');
                const deck = await getWorkspaceProductDeck(workspaceId);
                return deck || { error: 'Product deck not found' };
            },
        }),
        presentation_update: tool({
            description: 'Update and save the product pitch deck title and slides array for a workspace.',
            parameters: z.object({
                workspaceId: z.string().describe('The workspace ID'),
                title: z.string().describe('The updated presentation deck title'),
                slides: z.array(z.object({
                    id: z.number(),
                    type: z.string(),
                    title: z.string(),
                    subtitle: z.string().optional(),
                    content: z.string(),
                })).describe('Array of 12 updated slide objects'),
            }),
            execute: async ({ workspaceId, title, slides }) => {
                const { saveWorkspaceProductDeck } = require('~/lib/actions/productDeck');
                const updated = await saveWorkspaceProductDeck(workspaceId, title, slides);
                return {
                    success: true,
                    deck: updated,
                };
            },
        }),
        ui_update_signal_posts: tool({
            description: 'Update the Signal Radar dashboard with community posts found by the AI. Call this EXACTLY ONCE after discovering all posts.',
            parameters: z.object({
                posts: z.array(z.object({
                    platform: z.string().describe('Platform name: Reddit, LinkedIn, Twitter, Google, IndieHackers, etc.'),
                    title: z.string().describe('Post title or headline'),
                    content: z.string().describe('Excerpt or summary of the post content'),
                    url: z.string().optional().default('#').describe('URL to the post'),
                    author: z.string().optional().default('Anonymous'),
                    likes: z.number().optional().default(0),
                    comments: z.number().optional().default(0),
                    relevanceScore: z.number().min(0).max(100).describe('How relevant is this post to the product problem (0-100)'),
                    relevanceReason: z.string().describe('Why this post is relevant to the product'),
                    painPoints: z.array(z.string()).optional().default([]).describe('Pain points mentioned in the post'),
                    postedAt: z.string().optional().default('Recently'),
                }))
            }),
            execute: async ({ posts }) => {
                try {
                    if (workspace?.id && posts.length > 0) {
                        const crypto = require('crypto');
                        const normalizedPosts = posts.map(p => ({
                            id: crypto.randomUUID(),
                            workspaceId: workspace.id,
                            platform: p.platform,
                            title: p.title,
                            content: p.content,
                            url: p.url || '#',
                            author: p.author || 'Anonymous',
                            likes: p.likes || 0,
                            comments: p.comments || 0,
                            relevanceScore: p.relevanceScore || 0,
                            relevanceReason: p.relevanceReason || '',
                            painPoints: p.painPoints || [],
                            postedAt: p.postedAt || 'Recently',
                        }));
                        await db.insert(signalPosts).values(normalizedPosts);
                    }
                } catch (err) {
                    console.error('Failed to persist signal posts to DB:', err);
                }
                return JSON.stringify({ success: true, count: posts.length, message: 'Signal posts updated in the UI and database. Workflow complete. Do NOT call ui_update_signal_posts again.' });
            }
        }),
        ui_update_brand_mention_posts: tool({
            description: 'Update the Mentions dashboard with posts explicitly mentioning the product or company name. Call this EXACTLY ONCE after discovering all posts.',
            parameters: z.object({
                posts: z.array(z.object({
                    platform: z.string().describe('Platform name: Reddit, LinkedIn, Twitter, Google, IndieHackers, etc.'),
                    title: z.string().describe('Post title or headline'),
                    content: z.string().describe('Excerpt or summary of the post content explicitly mentioning the company/product'),
                    url: z.string().optional().default('#').describe('URL to the post'),
                    author: z.string().optional().default('Anonymous'),
                    likes: z.number().optional().default(0),
                    comments: z.number().optional().default(0),
                    brandKeyword: z.string().optional().default(workspace?.name || 'Falbor').describe('The specific product or company name explicitly mentioned in the post'),
                    sentiment: z.enum(['positive', 'neutral', 'negative']).optional().default('neutral').describe('Sentiment of the mention'),
                    relevanceReason: z.string().optional().default('').describe('Why this post is relevant to the brand'),
                    postedAt: z.string().optional().default('Recently'),
                }))
            }),
            execute: async ({ posts }) => {
                try {
                    if (workspace?.id && posts.length > 0) {
                        const crypto = require('crypto');
                        const { brandMentionPosts } = require('~/lib/db/schema');
                        const normalizedPosts = posts.map(p => ({
                            id: crypto.randomUUID(),
                            workspaceId: workspace.id,
                            platform: p.platform,
                            title: p.title,
                            content: p.content,
                            url: p.url || '#',
                            author: p.author || 'Anonymous',
                            likes: p.likes || 0,
                            comments: p.comments || 0,
                            brandKeyword: p.brandKeyword || workspace.name || 'Brand',
                            sentiment: p.sentiment || 'neutral',
                            relevanceReason: p.relevanceReason || '',
                            postedAt: p.postedAt || 'Recently',
                        }));
                        await db.insert(brandMentionPosts).values(normalizedPosts);
                    }
                } catch (err) {
                    console.error('Failed to persist brand mention posts to DB:', err);
                }
                return JSON.stringify({ success: true, count: posts.length, message: 'Brand mention posts updated in the UI and database. Workflow complete. Do NOT call ui_update_brand_mention_posts again.' });
            }
        }),
        ui_update_agent_contact_table: tool({
            description: 'Update the dashboard contacts table with the final processed prospects list.',
            parameters: z.object({
                prospects: z.array(z.object({
                    prospect: z.string().optional().default("Unknown"),
                    email: z.string().describe("The EXACT email address returned by the Tomba API. DO NOT omit or replace."),
                    company: z.string().optional().default("-"),
                    matchReason: z.string().optional().default("-"),
                    status: z.string().optional().default("Found via Tomba"),
                    messagePreview: z.string().optional().default("-"),
                    sentAt: z.string().optional().default("-"),
                    lastActivity: z.string().optional().default("-")
                }))
            }),
            execute: async ({ prospects }) => {
                try {
                    if (workspace?.id && prospects.length > 0) {
                        const { eq, and, inArray } = require('drizzle-orm');
                        const crypto = require('crypto');
                        
                        const normalizedProspects = prospects.map(p => ({
                            prospect: p.prospect || "Unknown",
                            email: p.email,
                            company: p.company || "-",
                            matchReason: p.matchReason || "-",
                            status: p.status || "Found via Tomba",
                            messagePreview: p.messagePreview || "-",
                            sentAt: p.sentAt || "-",
                            lastActivity: p.lastActivity || "-"
                        }));

                        const existing = await db.select({ email: agentProspects.email })
                          .from(agentProspects)
                          .where(
                            and(
                              eq(agentProspects.workspaceId, workspace.id),
                              inArray(agentProspects.email, normalizedProspects.map(p => p.email))
                            )
                          );
                        
                        const existingEmails = new Set(existing.map(e => e.email));
                        
                        const toInsert = normalizedProspects.filter(p => !existingEmails.has(p.email));
                        if (toInsert.length > 0) {
                            await db.insert(agentProspects).values(
                                toInsert.map(p => ({
                                    id: crypto.randomUUID(),
                                    workspaceId: workspace.id,
                                    name: p.prospect,
                                    email: p.email,
                                    company: p.company,
                                    matchReason: p.matchReason,
                                    status: p.status,
                                    messagePreview: p.messagePreview,
                                    sentAt: p.sentAt,
                                    lastActivity: p.lastActivity,
                                }))
                            );
                        }
                        
                        const toUpdate = normalizedProspects.filter(p => existingEmails.has(p.email));
                        for (const p of toUpdate) {
                            await db.update(agentProspects)
                              .set({
                                status: p.status,
                                messagePreview: p.messagePreview,
                                sentAt: p.sentAt,
                                lastActivity: p.lastActivity,
                              })
                              .where(
                                and(
                                  eq(agentProspects.workspaceId, workspace.id),
                                  eq(agentProspects.email, p.email)
                                )
                              );
                        }
                    }
                } catch (err) {
                    console.error("Failed to persist prospects to DB:", err);
                }
                return JSON.stringify({ success: true, count: prospects.length, message: "Contact table updated successfully in the UI and database. Workflow for contacts is complete. Do NOT call ui_update_agent_contact_table again." });
            }
        }),
    };
}

/**
 * Telegram (or any non-web channel): same reasoning + tools, but returns ONLY the final answer text.
 * UI tool calls are executed as no-ops and never leave the server.
 */
export async function runAgentText(opts: {
    workspace: any;
    message: string;
    history?: AgentHistoryMessage[];
    channel?: AgentChannel;
}): Promise<string> {
    const { workspace, message, history = [], channel = 'telegram' } = opts;
    const agentTools = await buildAgentTools(workspace);
    const result = await generateText({
        model: getAgentModel(),
        system: buildAgentSystemPrompt(workspace, channel),
        messages: [...sanitizeHistory(history), { role: 'user' as const, content: message }],
        tools: agentTools,
        maxSteps: 20,
        maxTokens: 3000,
    });
    const text = (result.text || result.steps.map((s) => s.text).filter(Boolean).join('\n\n')).trim();
    return text || 'Sorry, I could not produce an answer.';
}   