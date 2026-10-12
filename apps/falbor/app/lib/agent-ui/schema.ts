import { z } from 'zod';

export const UI_TOOL_NAMES = ['ui_status', 'ui_button', 'ui_progress', 'ui_options', 'ui_links', 'ui_widget', 'ui_browser_session', 'ui_cursor_click', 'ui_canvas_focus', 'ui_canvas_draw', 'ui_budget_update', 'ui_google_ads_fill'] as const;
export type UiToolName = (typeof UI_TOOL_NAMES)[number];
export const isUiTool = (name: string): name is UiToolName =>
    (UI_TOOL_NAMES as readonly string[]).includes(name);

export const uiStatusSchema = z.object({
    id: z.string().min(1).max(64).optional()
        .describe('Stable id. Reuse the same id later to update/complete this exact status. Omit for a one-off status.'),
    label: z.string().min(1).max(90).optional()
        .describe('Short label you write yourself, e.g. "Inspecting the Telegram webhook". Optional when updating an existing id.'),
    state: z.enum(['active', 'completed', 'error']).optional()
        .describe('Defaults to "active". Use "completed" when that operation is finished, "error" if it failed.'),
    detail: z.string().max(400).optional().describe('Optional extra info shown when the user expands the status.'),
});

export const uiButtonSchema = z.object({
    label: z.string().min(1).max(60).describe('Button text you write yourself.'),
    prompt: z.string().max(500).optional()
        .describe('Message sent back to you when the user clicks. Defaults to the label.'),
});

export const uiProgressSchema = z.object({
    id: z.string().min(1).max(64).optional().describe('Reuse the same id to update this progress bar.'),
    label: z.string().min(1).max(90).describe('What is progressing.'),
    value: z.number().min(0).max(100).describe('0-100. 100 marks it completed.'),
});

export const uiOptionsSchema = z.object({
    question: z.string().min(1).max(160).describe('Short decision question for the user.'),
    options: z.array(z.string().min(1).max(80)).min(2).max(6),
    recommended: z.string().optional().describe('The recommended option string from the options array.'),
});

export const uiLinksSchema = z.object({
    links: z.array(z.object({ title: z.string().min(1).max(120), url: z.string().url() })).min(1).max(6),
});

export const uiWidgetSchema = z.object({
    id: z.string().min(1).max(64).optional().describe('Reuse id to stream/update this widget live as code generates.'),
    title: z.string().max(100).optional().describe('Optional title for the live preview widget block.'),
    html: z.string().min(1).describe('Self-contained HTML fragment with inline CSS/Tailwind or styling for live visualization (e.g. diagrams, charts, progress blocks, step cards).'),
});

export const uiBrowserSessionSchema = z.object({
    id: z.string().min(1).max(64).optional().describe('Session ID for tracking the browser session.'),
    title: z.string().max(100).optional().describe('Title of the browser action / task being performed.'),
    url: z.string().url().describe('The URL currently loaded in the microVM browser session.'),
    liveStreamUrl: z.string().optional().describe('Live stream / embed URL for the browser session.'),
    recordingUrl: z.string().optional().describe('Video recording URL of the completed browser session.'),
    statusText: z.string().optional().describe('Current status description of the browser navigation.'),
    actionText: z.string().optional().describe('Specific action being executed in the browser.'),
    isFinished: z.boolean().optional().describe('Set to true when browser automation task is completed.'),
});

export const uiCursorClickSchema = z.object({
    target: z.string().min(1).describe('CSS selector or element description to navigate/click (e.g. "a[href*=\'/canvas\']", "Settings", "Vibe", "Sources").'),
    action: z.enum(['click', 'navigate', 'type']).optional().describe('The action type to perform (defaults to click).'),
    text: z.string().optional().describe('Text to type if action is "type".'),
});

export const uiCanvasFocusSchema = z.object({
    x: z.number().describe('The X coordinate on the canvas to focus on.'),
    y: z.number().describe('The Y coordinate on the canvas to focus on.'),
});

export const uiCanvasDrawSchema = z.object({
    id: z.string().min(1).describe('A unique ID for this canvas node.'),
    type: z.enum(['text', 'flowchart', 'button']).describe('The type of element to draw.'),
    x: z.number().describe('The X coordinate on the canvas.'),
    y: z.number().describe('The Y coordinate on the canvas.'),
    label: z.string().optional().describe('A label or title for the node.'),
    content: z.string().optional().describe('The content of the node, such as Markdown or HTML.'),
});

export const uiBudgetUpdateSchema = z.object({
    id: z.string().describe('The ID of the budget plan to update.'),
    results: z.any().describe('The JSON results containing estReach, costPerClick, recommendedChannels, and comprehensiveBreakdown.'),
});

export const uiGoogleAdsFillSchema = z.object({
    marketId: z.string().describe('The budget market plan ID.'),
    campaignName: z.string().describe('Name of the Google Ads campaign.'),
    businessName: z.string().describe('Business name for Google Ads.'),
    phoneNumber: z.string().optional().describe('Contact phone number for campaign call extensions.'),
    sitePage: z.string().optional().describe('Landing page URL for Google Ads.'),
    adLanguage: z.string().optional().describe('Language for campaign.'),
    sitelinks: z.array(z.string()).describe('Sitelink extensions.'),
    headlines: z.array(z.string()).describe('Short headlines for search ads.'),
    descriptions: z.array(z.string()).describe('Descriptions for search ads.'),
    dailyBudget: z.string().optional().describe('Daily budget amount.'),
    targetLocations: z.string().optional().describe('Target locations for ads.'),
    biddingStrategy: z.string().optional().describe('Bidding strategy for ads.'),
});

export const uiSchemas = {
    ui_status: uiStatusSchema,
    ui_button: uiButtonSchema,
    ui_progress: uiProgressSchema,
    ui_options: uiOptionsSchema,
    ui_links: uiLinksSchema,
    ui_widget: uiWidgetSchema,
    ui_browser_session: uiBrowserSessionSchema,
    ui_cursor_click: uiCursorClickSchema,
    ui_canvas_focus: uiCanvasFocusSchema,
    ui_canvas_draw: uiCanvasDrawSchema,
    ui_budget_update: uiBudgetUpdateSchema,
    ui_google_ads_fill: uiGoogleAdsFillSchema,
} as const;