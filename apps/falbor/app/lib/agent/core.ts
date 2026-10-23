import { generateText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { uiTools, UI_PROMPT } from './uiTools';
import { createBrowserUseTools } from './browserUseTool';
import { searchProspectsWithTomba } from '~/lib/agent/growthTools';
import { db } from '~/lib/db';
import { agentProspects, signalPosts, sourcePosts, workspaceSources } from '~/lib/db/schema';
import { getAgentRolePrompt } from '~/lib/common/prompts/agents-rule';
import { isLocalAgentModel, LOCAL_AGENT_BASE_URL, LOCAL_AGENT_MODEL } from '~/lib/agents/local-model';

export type AgentChannel = 'web' | 'telegram';
export type AgentHistoryMessage = { role: 'user' | 'assistant'; content: string };

const PLATFORM_DOMAINS: Record<string, string[]> = {
    reddit: ['reddit.com'],
    'hacker news': ['news.ycombinator.com'],
    hackernews: ['news.ycombinator.com'],
    hn: ['news.ycombinator.com'],
    twitter: ['twitter.com', 'x.com'],
    x: ['twitter.com', 'x.com'],
    linkedin: ['linkedin.com'],
    facebook: ['facebook.com'],
    producthunt: ['producthunt.com'],
    'product hunt': ['producthunt.com'],
    indiehackers: ['indiehackers.com'],
    dribbble: ['dribbble.com'],
    youtube: ['youtube.com', 'youtu.be'],
    tiktok: ['tiktok.com'],
    instagram: ['instagram.com'],
    pinterest: ['pinterest.com'],
    quora: ['quora.com'],
    medium: ['medium.com'],
    devto: ['dev.to'],
    'dev to': ['dev.to'],
    stackoverflow: ['stackoverflow.com'],
    threads: ['threads.net', 'threads.com'],
    bluesky: ['bsky.app'],
    mastodon: ['mastodon.social'],
};

const OPEN_PLATFORMS = new Set(['google', 'web', 'directory', 'directories', 'all', 'contacts']);

function normalizePlatformName(platform: string): string {
    return (platform || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();
}

function hostMatchesDomains(host: string, domains: string[]): boolean {
    return domains.some((d) => host === d || host.endsWith('.' + d));
}

export function postUrlIsAllowed(url: string, allowedPlatforms: string[]): { ok: boolean; matchedPlatform?: string } {
    let host: string;
    try {
        host = new URL(url).hostname.toLowerCase();
    } catch {
        return { ok: false };
    }
    for (const platform of allowedPlatforms) {
        const normalized = normalizePlatformName(platform);
        if (OPEN_PLATFORMS.has(normalized)) return { ok: true, matchedPlatform: platform };
        const domains = PLATFORM_DOMAINS[normalized];
        if (!domains) return { ok: true, matchedPlatform: platform };
        if (hostMatchesDomains(host, domains)) return { ok: true, matchedPlatform: platform };
    }
    return { ok: false };
}

export async function checkUrlExists(url: string): Promise<number> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: { 'user-agent': 'Mozilla/5.0 (compatible; FalborLinkCheck/1.0)' },
        });
        clearTimeout(timer);
        res.body?.cancel().catch(() => undefined);
        if (res.status >= 200 && res.status < 400) return res.status;
        if (res.status === 401 || res.status === 403 || res.status === 405 || res.status === 429 || res.status === 999) return res.status;
        return 0;
    } catch {
        return 0;
    }
}

export const getAgentModel = (modelId?: string | null) => {
    const model = modelId?.trim() || 'gpt-4o-mini';
    if (isLocalAgentModel(model)) {
        if (!LOCAL_AGENT_BASE_URL) throw new Error('The local Agent Model is not configured on this server.');
        return createOpenAI({ apiKey: process.env.FALBOR_LOCAL_AGENT_KEY || 'local-agent', baseURL: LOCAL_AGENT_BASE_URL })(LOCAL_AGENT_MODEL);
    }
    if (model.toLowerCase().startsWith('deepseek')) return createOpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' })(model);
    if (model.toLowerCase().startsWith('claude')) return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(model);
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(model);
};

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

        const humanPartnerPath = path.join(rootDir, 'docs/Skills/human-partner.md');
        if (fs.existsSync(humanPartnerPath)) {
            humanPartnerPrompt = fs.readFileSync(humanPartnerPath, 'utf-8');
        }

        const startupExpertPath = path.join(rootDir, 'docs/Skills/startup-expert.md');
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
        ? `${getAgentRolePrompt(agent.role)}\nYou are ${agent.name}. Role: ${agent.role}\nCustom Instructions:\n${agent.instructions || agent.rules || 'None'}\nAgent memory:\n${agent.memory || 'None'}\nKnowledge:\n${JSON.stringify(agent.knowledge || [])}\n`
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
- Market Category / Alternatives: ${intel.positioningDetails?.category || 'N/A'} — users currently rely on: ${intel.positioningDetails?.alternatives || 'N/A'}
- Known Competitors: ${(intel.marketSignals?.competitors || []).slice(0, 8).join(', ') || 'none recorded yet'}
- ICP Details: ${JSON.stringify(intel.targetAudienceDetails || {})}
- Context Prompt / Inputs: ${workspace.contextPrompt || 'No context provided.'}${mcpNotice}

<mcp_tools>
  You have access to Model Context Protocol (MCP) tools that the user has explicitly connected and authorized.
  These tools allow you to access external services, read personal data (like emails), and perform actions on the user's behalf.
  When the user asks you to perform a task that requires these tools (e.g., reading emails), you MUST use the available MCP tools directly to fulfill the request.
  Do NOT assume you lack access. Always check your available tools and execute them!
</mcp_tools>

RESPONSE STYLE (IMPORTANT):
- Be SHORT by default: 1-3 sentences, or at most ~5 tight bullets. Give the answer/result first, detail only if needed. The user must never scroll a wall of text.
- No filler openings ("Great question!", "Certainly!"), no restating what the user said, no generic closing advice, no action summaries of what you just executed unless it helps.
- Go longer ONLY when: the user explicitly asks for depth or a full breakdown, the answer contains non-obvious reasoning the user will act on, or you just completed a multi-step operation (scan, research, browser task, reach & risk scan) — then give a compact but complete report.
- Prefer concrete facts (names, numbers, links) over vague claims. If information is missing, say so in one sentence instead of padding.

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
14. CRITICAL PLATFORM SCAN TRUTH RULE (applies to every community scan): (a) The context message lists the platforms the user selected (e.g. "Reddit, Twitter, Hacker News") — scan ONLY those platforms. Map platform -> site: filter: Reddit -> site:reddit.com; Twitter/X -> (site:x.com OR site:twitter.com); LinkedIn -> site:linkedin.com/posts OR site:linkedin.com; Hacker News -> site:news.ycombinator.com; IndieHackers -> site:indiehackers.com; ProductHunt -> site:producthunt.com; Facebook -> site:facebook.com; "Google" -> no site: filter (web-wide). (b) NEVER include posts from platforms the user did not select, and NEVER include random websites, blogs, or aggregator pages — every result URL must belong to one of the selected platforms. (c) LINK VERIFICATION IS MANDATORY: before presenting or saving any posts, call \`verify_post_links\` with ALL candidate URLs and discard every post whose URL is not in the \`verified\` list (404s, deleted threads, unreachable pages). If too few posts survive, run more \`serp_search\` rounds and verify again — the user actually clicks these links. (d) NEVER fabricate anything: URLs, author handles, like/comment counts, dates, and excerpts must all come from the actual SERP results (counts only if visible, else 0). (e) Relevance must be honest: include a post only if it genuinely discusses the problem-space you are scanning for, not because it shares a keyword.
15. CRITICAL SIGNAL RADAR RULE: When [CONTEXT: SIGNAL_RADAR] is provided: (a) call \`read_workspace\` to understand the product's main problem and audience, using their own vocabulary for \`serp_search\` queries (2-4 queries per selected platform, e.g. \`site:reddit.com "I gave up trying to" ${'{feature}'}\`, \`site:news.ycombinator.com ${'{problem}'}\`). (b) Collect 8-12 candidate posts per platform from the organic results. (c) Apply the full PLATFORM SCAN TRUTH RULE: platform purity + mandatory verify_post_links + no fabrication. (d) Call \`ui_update_signal_posts\` EXACTLY ONCE with all surviving posts, passing \`allowedPlatforms\` = the selected platform list; set relevanceScore/relevanceReason honestly. Do NOT call \`tomba_search_prospects\` or any email/contact tool for this task. Do NOT ask for permission. If a platform yields nothing genuine, return 0 posts for it instead of forcing weak results in.
16. CRITICAL BRAND MENTIONS RULE: When [CONTEXT: BRAND_MENTIONS] is provided: (a) Identify the exact product/company name (e.g., "${productName}"). (b) Call \`serp_search\` ONLY on the user's selected platforms using the platform->site: mapping from rule 14, quoting the exact name in each query (e.g. \`site:reddit.com "${productName}"\`). (c) STRICT FILTERING: include ONLY posts where the title OR snippet explicitly contains the exact product or company name. If a search result is generic, unrelated, or from a non-selected platform, DISCARD IT even if it ranks well. (d) Run \`verify_post_links\` on all candidates and keep only verified URLs. (e) Call \`ui_update_brand_mention_posts\` EXACTLY ONCE with allowedPlatforms = the selected platforms, honest sentiment, and real engagement numbers only if visible. If nothing explicitly mentions the product on a platform, return 0 posts for it — never substitute lookalike content.
17. CRITICAL SOURCE POST RULE: When [CONTEXT: SOURCE_POST] is provided, you MUST write ONE authentic, human-sounding post tailored to the given [SOURCE_ID], [PLATFORM] and source details. First briefly analyze the source (its platform, the community/profile it represents, and the provided strategy notes) together with the product context from \`read_workspace\`, and respect the norms and tone of that platform. Then call \`ui_generate_source_post\` EXACTLY ONCE with sourceId, platform, title, hook, body, callToAction and hashtags. The post must not sound like an ad: it should read like a real person sharing something genuinely useful, with a scroll-stopping title, a strong hook, a well-structured Markdown body (short paragraphs, bullet points, concrete value), a clear call to action and relevant hashtags. Pass the body as clean Markdown WITHOUT code fences.

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
                    category: intel.positioningDetails?.category ?? null,
                    currentAlternatives: intel.positioningDetails?.alternatives ?? null,
                    competitors: intel.marketSignals?.competitors ?? null,
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
        verify_post_links: tool({
            description: 'HTTP-verify that post URLs exist before presenting them to the user. Call with ALL candidate URLs; only URLs returned in `verified` may be kept. Discard everything in `rejected` (404s, deleted posts, unreachable pages) and replace them via serp_search.',
            parameters: z.object({
                urls: z.array(z.string()).max(45).describe('Candidate post URLs to verify'),
            }),
            execute: async ({ urls }) => {
                const candidates = urls.filter((u) => /^https?:\/\//i.test(u)).slice(0, 45);
                const checks = await Promise.all(
                    candidates.map(async (url) => ({ url, status: await checkUrlExists(url) })),
                );
                const verified = checks.filter((c) => c.status > 0).map((c) => c.url);
                const rejected = checks.filter((c) => c.status === 0).map((c) => c.url);
                return {
                    verified,
                    rejected,
                    note: 'Discard posts whose URL is in `rejected`. If `verified` is short, run additional serp_search queries and verify again before saving.',
                };
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
            description: 'Update the Signal Radar dashboard with community posts found by the AI. Only call after serp_search + verify_post_links. Posts with URLs outside allowedPlatforms, dead links, or duplicate URLs are dropped automatically. Call this EXACTLY ONCE.',
            parameters: z.object({
                allowedPlatforms: z.array(z.string()).optional().describe('The exact platforms the user selected for this scan, e.g. ["Reddit", "Hacker News"]. Posts whose URL does not belong to one of these platforms are dropped.'),
                posts: z.array(z.object({
                    platform: z.string().describe('Platform name: Reddit, LinkedIn, Twitter, Google, IndieHackers, etc.'),
                    title: z.string().describe('Post title or headline'),
                    content: z.string().describe('Excerpt or summary of the post content'),
                    url: z.string().optional().default('#').describe('URL to the post MUST be a real verified http(s) URL from serp_search, never "#"'),
                    author: z.string().optional().default('Anonymous'),
                    likes: z.number().optional().default(0),
                    comments: z.number().optional().default(0),
                    relevanceScore: z.number().min(0).max(100).describe('How relevant is this post to the product problem (0-100)'),
                    relevanceReason: z.string().describe('Why this post is relevant to the product'),
                    painPoints: z.array(z.string()).optional().default([]).describe('Pain points mentioned in the post'),
                    postedAt: z.string().optional().default('Recently'),
                }))
            }),
            execute: async ({ posts, allowedPlatforms }) => {
                let droppedOffPlatform = 0;
                let droppedDeadLink = 0;
                let droppedDuplicates = 0;
                const seenUrls = new Set<string>();
                const keptPosts: typeof posts = [];
                const allowed = Array.isArray(allowedPlatforms) ? allowedPlatforms.filter((p) => typeof p === 'string' && p.trim()) : [];
                for (const post of posts) {
                    const url = (post.url || '').trim();
                    if (!/^https?:\/\//i.test(url)) {
                        droppedDeadLink++;
                        continue;
                    }
                    if (allowed.length > 0) {
                        const match = postUrlIsAllowed(url, allowed);
                        if (!match.ok) {
                            droppedOffPlatform++;
                            continue;
                        }
                    }
                    const dedupeKey = url.split(/[?#]/)[0].toLowerCase().replace(/\/$/, '');
                    if (seenUrls.has(dedupeKey)) {
                        droppedDuplicates++;
                        continue;
                    }
                    seenUrls.add(dedupeKey);
                    keptPosts.push(post);
                }
                try {
                    if (workspace?.id && keptPosts.length > 0) {
                        const crypto = require('crypto');
                        const normalizedPosts = keptPosts.map(p => ({
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
                let note = keptPosts.length > 0 ? 'Signal posts updated in the UI and database. Workflow complete. Do NOT call ui_update_signal_posts again.' : 'No posts passed validation. Search again with serp_search, verify URLs, then call this tool once more with corrected posts.';
                const droppedParts = [];
                if (droppedOffPlatform > 0) droppedParts.push(`${droppedOffPlatform} dropped (URL not on the selected platforms)`);
                if (droppedDeadLink > 0) droppedParts.push(`${droppedDeadLink} dropped (missing/dead URL)`);
                if (droppedDuplicates > 0) droppedParts.push(`${droppedDuplicates} dropped (duplicate URL)`);
                if (droppedParts.length > 0) {
                    note += ` Guard summary: ${droppedParts.join(', ')}. If too many posts were dropped, replace them via serp_search + verify_post_links, then call this tool ONCE more.`;
                }
                return JSON.stringify({ success: keptPosts.length > 0, count: keptPosts.length, dropped: droppedOffPlatform + droppedDeadLink + droppedDuplicates, message: note });
            }
        }),
        ui_update_brand_mention_posts: tool({
            description: 'Update the Mentions dashboard with posts explicitly mentioning the product or company name. Only call after serp_search + verify_post_links with the exact name filter applied. Posts with URLs outside allowedPlatforms, dead links, or duplicate URLs are dropped automatically. Call this EXACTLY ONCE.',
            parameters: z.object({
                allowedPlatforms: z.array(z.string()).optional().describe('The exact platforms the user selected for this scan. Posts whose URL does not belong to one of these platforms are dropped.'),
                posts: z.array(z.object({
                    platform: z.string().describe('Platform name: Reddit, LinkedIn, Twitter, Google, IndieHackers, etc.'),
                    title: z.string().describe('Post title or headline'),
                    content: z.string().describe('Excerpt or summary of the post content explicitly mentioning the company/product'),
                    url: z.string().optional().default('#').describe('URL to the post MUST be a real verified http(s) URL from serp_search, never "#"'),
                    author: z.string().optional().default('Anonymous'),
                    likes: z.number().optional().default(0),
                    comments: z.number().optional().default(0),
                    brandKeyword: z.string().optional().default(workspace?.name || 'Falbor').describe('The specific product or company name explicitly mentioned in the post'),
                    sentiment: z.enum(['positive', 'neutral', 'negative']).optional().default('neutral').describe('Sentiment of the mention'),
                    relevanceReason: z.string().optional().default('').describe('Why this post is relevant to the brand'),
                    postedAt: z.string().optional().default('Recently'),
                }))
            }),
            execute: async ({ posts, allowedPlatforms }) => {
                let droppedOffPlatform = 0;
                let droppedDeadLink = 0;
                let droppedDuplicates = 0;
                const seenUrls = new Set<string>();
                const keptPosts: typeof posts = [];
                const allowed = Array.isArray(allowedPlatforms) ? allowedPlatforms.filter((p) => typeof p === 'string' && p.trim()) : [];
                for (const post of posts) {
                    const url = (post.url || '').trim();
                    if (!/^https?:\/\//i.test(url)) {
                        droppedDeadLink++;
                        continue;
                    }
                    if (allowed.length > 0) {
                        const match = postUrlIsAllowed(url, allowed);
                        if (!match.ok) {
                            droppedOffPlatform++;
                            continue;
                        }
                    }
                    const dedupeKey = url.split(/[?#]/)[0].toLowerCase().replace(/\/$/, '');
                    if (seenUrls.has(dedupeKey)) {
                        droppedDuplicates++;
                        continue;
                    }
                    seenUrls.add(dedupeKey);
                    keptPosts.push(post);
                }
                try {
                    if (workspace?.id && keptPosts.length > 0) {
                        const crypto = require('crypto');
                        const { brandMentionPosts } = require('~/lib/db/schema');
                        const normalizedPosts = keptPosts.map(p => ({
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
                let note = keptPosts.length > 0 ? 'Brand mention posts updated in the UI and database. Workflow complete. Do NOT call ui_update_brand_mention_posts again.' : 'No posts passed validation. Search again with serp_search, verify URLs, then call this tool once more with corrected posts.';
                const droppedParts = [];
                if (droppedOffPlatform > 0) droppedParts.push(`${droppedOffPlatform} dropped (URL not on the selected platforms)`);
                if (droppedDeadLink > 0) droppedParts.push(`${droppedDeadLink} dropped (missing/dead URL)`);
                if (droppedDuplicates > 0) droppedParts.push(`${droppedDuplicates} dropped (duplicate URL)`);
                if (droppedParts.length > 0) {
                    note += ` Guard summary: ${droppedParts.join(', ')}. If too many posts were dropped, replace them via serp_search + verify_post_links, then call this tool ONCE more.`;
                }
                return JSON.stringify({ success: keptPosts.length > 0, count: keptPosts.length, dropped: droppedOffPlatform + droppedDeadLink + droppedDuplicates, message: note });
            }
        }),
        ui_generate_source_post: tool({
            description: 'Save a generated social post for a specific acquisition source (channel) to the database and show it in the UI. Call this EXACTLY ONCE after writing the post.',
            parameters: z.object({
                sourceId: z.string().describe('The SOURCE_ID from the [CONTEXT: SOURCE_POST] marker.'),
                platform: z.string().describe('Platform the post is written for, e.g. Reddit, LinkedIn, Twitter.'),
                title: z.string().describe('Scroll-stopping post title.'),
                hook: z.string().optional().describe('The opening hook line.'),
                body: z.string().describe('Full post body in clean Markdown, without code fences.'),
                callToAction: z.string().optional().describe('The call to action line.'),
                hashtags: z.array(z.string()).optional().default([]).describe('Relevant hashtags without the # symbol.'),
            }),
            execute: async (args) => {
                try {
                    if (!workspace?.id || !userId || !args.sourceId) {
                        return JSON.stringify({ success: false, error: 'Missing workspace, user or sourceId.' });
                    }
                    const { eq, and } = require('drizzle-orm');
                    const source = await db.query.workspaceSources.findFirst({
                        where: and(eq(workspaceSources.id, args.sourceId), eq(workspaceSources.workspaceId, workspace.id)),
                    });
                    if (!source) {
                        return JSON.stringify({ success: false, error: 'Unknown source for this workspace.' });
                    }
                    const crypto = require('crypto');
                    await db.insert(sourcePosts).values({
                        id: crypto.randomUUID(),
                        workspaceId: workspace.id,
                        userId,
                        sourceId: args.sourceId,
                        platform: args.platform,
                        title: args.title,
                        hook: args.hook || null,
                        body: args.body,
                        callToAction: args.callToAction || null,
                        hashtags: args.hashtags || [],
                        status: 'draft',
                    });
                } catch (err) {
                    console.error('Failed to persist source post to DB:', err);
                }
                return JSON.stringify({ success: true, message: 'Source post saved. Workflow complete. Do NOT call ui_generate_source_post again.' });
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
