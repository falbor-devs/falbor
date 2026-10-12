import { tool } from 'ai';
import { uiSchemas } from '~/lib/agent-ui/schema';

export const UI_PROMPT = `AGENT UI (web chat only)
You control what appears in the chat with these UI tools. They only affect the interface; they never do real work.
- ui_status: show what you are doing right now, in your own words. Call it with state "active" when you start something and again with the same id and state "completed" when it is done. Starting a new active status auto-completes the previous one.
- ui_button: offer a clickable next action (label is what the user sees, prompt is what gets sent back). Use this to give the user quick response buttons instead of typing.
- ui_cursor_click: perform a direct action/navigation on the current website UI (e.g., target: "Canvas", "Vibe", "Sources", "Settings", or input field). This moves the cursor and performs the click directly in the user's active workspace window WITHOUT opening an external browser microVM.
- ui_progress: show progress (0-100) for a long multi-part operation.
- ui_options: ask the user a decision question with 2-6 options. Always include the 'recommended' parameter with your top recommended option string.
- ui_links: show sources/links you want the user to open.
- ui_widget: generate a live visual HTML/CSS preview (e.g., flowcharts, step-by-step process pipelines, metric cards, funnel diagrams). Pass clean, self-contained HTML using Tailwind CSS classes.
- ui_browser_session: display a live, interactive microVM browser window inside the chat UI ONLY when explicitly requested to inspect external websites outside the Falbor workspace.
Normal text you write is streamed to the user as-is.
CRITICAL QUESTION & OPTIONS RULE:
- NEVER output bullet lists of questions or options as plain text in the chat window.
- Whenever you need to ask the user a question, clarify details, or offer choices, you MUST invoke \`ui_options\` (or \`ui_button\`) so interactive choice buttons appear right above the chat input box for the user to click.
CRITICAL NAVIGATION RULE:
- When the user asks to navigate the site, open settings, go to Canvas, Vibe, or Sources, call \`ui_cursor_click\` with the target tab/button name. DO NOT call \`run_browser_task\` or open an external browser.
CRITICAL CANVAS RULE:
1. When asked to draw, map, sketch, or place elements on the Canvas, FIRST call \`ui_canvas_focus\` to pan the camera (e.g., x: 500, y: 500).
2. THEN call \`ui_canvas_draw\` to place the element (e.g., id: "1", type: "flowchart", x: 500, y: 500, label: "Competitor Analysis", content: "### Competitors\\n- Copilot...").
3. DO NOT output the flowchart as regular text in the chat! Use the tools!`;

const ok = async (args: any, options?: any) => {
    console.log(`\n🤖 AI IS INVOKING SERVER TOOL with args:`, args, '\n');
    return { ok: true };
};

export const uiTools = {
    ui_status: tool({
        description: 'Show or update a status line in the chat UI (label is written by you).',
        parameters: uiSchemas.ui_status,
        execute: ok,
    }),
    ui_button: tool({
        description: 'Show a clickable action button in the chat UI.',
        parameters: uiSchemas.ui_button,
        execute: ok,
    }),
    ui_cursor_click: tool({
        description: 'Perform a direct cursor click or navigation action on the current workspace UI.',
        parameters: uiSchemas.ui_cursor_click,
        execute: ok,
    }),
    ui_progress: tool({
        description: 'Show or update a progress bar in the chat UI.',
        parameters: uiSchemas.ui_progress,
        execute: ok,
    }),
    ui_options: tool({
        description: 'Ask the user a multiple-choice question in the chat UI.',
        parameters: uiSchemas.ui_options,
        execute: ok,
    }),
    ui_links: tool({
        description: 'Show a list of source links in the chat UI.',
        parameters: uiSchemas.ui_links,
        execute: ok,
    }),
    ui_widget: tool({
        description: 'Generate an inline visual HTML/CSS preview inside the chat sidebar (metric cards, progress blocks). DO NOT use this for Canvas tasks! Use ui_canvas_draw for canvas tasks.',
        parameters: uiSchemas.ui_widget,
        execute: ok,
    }),
    ui_browser_session: tool({
        description: 'Display an interactive live microVM Browser Use Cloud session window inside the chat UI.',
        parameters: uiSchemas.ui_browser_session,
        execute: ok,
    }),
    ui_canvas_focus: tool({
        description: 'Shift the canvas camera to a specific x, y coordinate and show a loading animation there.',
        parameters: uiSchemas.ui_canvas_focus,
        execute: async (args) => ok(args, 'ui_canvas_focus'),
    }),
    ui_canvas_draw: tool({
        description: 'MANDATORY TOOL for drawing on the Canvas. Place a node element (text, flowchart, button) onto the canvas at x, y.',
        parameters: uiSchemas.ui_canvas_draw,
        execute: async (args) => ok(args, 'ui_canvas_draw'),
    }),
    ui_budget_update: tool({
        description: 'Update the user\'s budget plan on the server with the final calculated strategy. Use this after analyzing a budget.',
        parameters: uiSchemas.ui_budget_update,
        execute: async (args) => {
            // Update the DB on the server using the action
            const { updateBudgetPlanResults } = await import('~/lib/actions/budget');
            await updateBudgetPlanResults(args.id, args.results);
            return ok(args, 'ui_budget_update');
        },
    }),
    ui_google_ads_fill: tool({
        description: 'Autofill Google Ads campaign setup input fields with JSON details generated by AI.',
        parameters: uiSchemas.ui_google_ads_fill,
        execute: async (args) => ok(args, 'ui_google_ads_fill'),
    }),
};