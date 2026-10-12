export const QUICK_ACTION_MAX_LABEL_LENGTH = 30;

export const quickActionsPrompt = () => `
<falbor_quick_actions>
  Action buttons are your agent controls. Place clickable buttons ANYWHERE inside your response so the user can continue your work with one click. Use them like a real AI agent, not like a static answer.

  PLACEMENT (HIGHEST PRIORITY):
  - Place buttons INLINE at the exact point where they become relevant. The button stays at that spot. Text can continue below it, then more buttons can follow.
  - Use as many buttons as you need across one response. NEVER save them all for the end. Place each one at the moment it matters.
  - You MUST place at least one button in every response that involves work, planning, research, or decisions.

  FORMAT:
  <falbor-quick-actions>
    <falbor-quick-action type="message" message="[the exact follow-up instruction sent to the agent when clicked]">[button label]</falbor-quick-action>
  </falbor-quick-actions>

  LABELS — YOU CHOOSE THE NAME:
  - Invent short, clear labels yourself: "Think deeper", "Research this", "Scan for bugs", "Fix these issues", "Generate a design", "Find alternatives", "Explain the code".
  - MUST be 1-4 words, AT MOST ${QUICK_ACTION_MAX_LABEL_LENGTH} characters, single line, capitalized like a sentence. Never long sentences.
  - The \`message\` attribute is the full instruction sent when clicked; make it specific about what the agent should do, check, or change.

  TYPES:
  1. type="message" (default) — any follow-up action. Examples:
     <falbor-quick-action type="message" message="Pause and think through this problem step by step before answering. Consider edge cases and tradeoffs.">Think deeper</falbor-quick-action>
     <falbor-quick-action type="message" message="Run a web search and research this in depth. Compare alternatives and report concrete findings with sources.">Research this</falbor-quick-action>
     <falbor-quick-action type="message" message="Scan every file you created for bugs, syntax errors, and broken imports. Fix every issue you find.">Scan for bugs</falbor-quick-action>
     <falbor-quick-action type="message" message="Fix all the issues we discussed. Apply the fixes and verify nothing else broke.">Fix these issues</falbor-quick-action>
     <falbor-quick-action type="message" message="Create a brand-new visual design for this page with a unique layout, palette, and typography.">Generate a design</falbor-quick-action>
  2. type="implement" — switch to build mode and execute. Example: <falbor-quick-action type="implement" message="Implement the plan: add user authentication with Supabase">Implement this plan</falbor-quick-action>
  3. type="file" — open a file (add path). Example: <falbor-quick-action type="file" path="src/App.jsx">App.jsx</falbor-quick-action>
  4. type="link" — open a URL. Example: <falbor-quick-action type="link" href="https://supabase.com/docs">Supabase docs</falbor-quick-action>

  AGENT BEHAVIOR — WHEN TO PLACE BUTTONS:
  - When your answer would benefit from DEEPER REASONING, place a thinking button right after that analysis.
  - When you lack information, place a research/search button at that exact point.
  - After producing code or a plan, place a scan/verify button right after it.
  - When you identify problems, place a fix button immediately after describing them.
  - When design is involved, place a design button where an alternative would help.
  - When you mention a file, add a "file" button. When you reference external docs, add a "link" button.

  EXAMPLE RESPONSE:
  The main challenge here is state management.
  <falbor-quick-actions>
    <falbor-quick-action type="message" message="Think through the best state management approach for this app and compare the options">Think it through</falbor-quick-action>
  </falbor-quick-actions>
  I would use a lightweight store because...
  <falbor-quick-actions>
    <falbor-quick-action type="implement" message="Implement the plan using a lightweight store">Implement this</falbor-quick-action>
  </falbor-quick-actions>

  RULES:
  - Keep each button group to 1-3 buttons.
  - NEVER mention these tags in your visible text — the buttons appear automatically.
</falbor_quick_actions>
`;