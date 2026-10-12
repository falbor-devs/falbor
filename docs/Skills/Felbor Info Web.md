# Falbor Product Knowledge & Site Map (Skill Knowledge Base)

Welcome to the definitive product operational manual and navigation guide for **Falbor**. This document contains exact step-by-step UI actions, exact navigation paths, button click locations, settings tabs, and page elements across the Falbor platform.

---

## 1. Overview & Core Architecture

**Falbor** is an AI-powered technical co-founder, full-stack website builder, and growth strategy workspace. It combines an autonomous AI Agent, an interactive visual code generator (WebContainer), a multi-card strategy Canvas, real-time web execution via Browser Use microVMs, and external integrations through Model Context Protocol (MCP) connectors.

---

## 2. Navigation & UI Controls (Step-by-Step Navigation Map)

### 2.1 Top Dashboard Navigation Bar
- **Workspace Switcher Dropdown**: Located at top-left (`[Logo / Workspace Name]`). Click to open the workspace picker menu, switch between active projects, or click **"+ New Workspace"**.
- **Canvas Tab**: Click **"Canvas"** on the top header navigation bar to open `/workspace/[id]/canvas`.
- **Vibe Tab**: Click **"Vibe"** on the top header navigation bar to open `/workspace/[id]/vibe`.
- **Sources Tab**: Click **"Sources"** on the top header navigation bar to open `/workspace/[id]/sources`.
- **Settings Gear Icon / Button**: Click **"Settings"** or the **Gear Icon (⚙)** on the top right header to open the 17-tab Settings Modal.
- **AI Agent Sidebar Toggle**: Click the **Sparkles Icon (✨) / "Agent"** button on the far top right to open/close the right-side Falbor AI Co-founder sidebar.

---

### 2.2 Navigation to The Canvas Page (`/workspace/[id]/canvas`)
**How to navigate here**: Click **"Canvas"** in the top navigation bar or navigate to `/workspace/[id]`.
- **Header Toolbar Buttons**:
  - **"+ Add Card" Button**: Click the top-left **"+ Add Card"** button to open the card type picker (Notes, Personas, Competitor Trackers).
  - **"Filter" Dropdown**: Click **"Filter"** on the toolbar to filter canvas cards by category (*Competitors*, *Buyer Persona*, *Value Proposition*, *First Users Acquisition*).
  - **"Auto Research" Button**: Click **"Auto Research"** to trigger automated web searches (Reddit, Twitter/X, GitHub Issues, Google).
- **Canvas Cards & Section Cubes**:
  - **Brutal Critique & Viability**: Displays viability score (`<falborSuccess>`). Click card to expand critique notes.
  - **Competitors & Market Landscape**: Displays market alternatives. Click external link icons to view competitors.
  - **Target Audience & Buyer Persona**: Click to edit ICP profile notes and user demographics.
  - **Value Proposition**: Click card header to inspect core positioning statements.
  - **Online Communities & Direct Links**: Click community tags (Subreddits, GitHub repos) to view target audience hubs.
  - **First Users Acquisition Strategy**: Click card options to view growth channels.

---

### 2.3 Navigation to The Vibe Page (`/workspace/[id]/vibe`)
**How to navigate here**: Click **"Vibe"** in the top navigation bar or navigate to `/workspace/[id]/vibe`.
- **Left Panel (Vibe Chat & Controls)**:
  - **Prompt Textarea**: Located bottom-left. Type website design prompts or changes here.
  - **Send Button (Up Arrow)**: Click **"Send"** or press `Enter` to send your site prompt to WebContainer builder.
  - **Model Selector Dropdown**: Click top-left dropdown in Vibe sidebar to switch models (GPT-4o, Claude 3.5 Sonnet, Gemini).
  - **History & Snapshots Button**: Click the **Clock Icon (🕒)** above chat to view code version history or revert snapshots.
  - **Slash Command (`/` or `@`)**: Type `/` in Vibe chat input to open the MCP connector attachment menu.
- **Center / Right Panel (Live Web Preview & Code Editor)**:
  - **Viewport Mode Buttons**: Located top header of preview panel. Click **Desktop Icon**, **Tablet Icon**, or **Mobile Icon** to test responsive views.
  - **"Visual Editor" Button**: Click **"Visual Editor"** top right to enable point-and-click element editing, Tailwind class modifications, and text editing directly on the page preview.
  - **"Code" Button / Toggle**: Click **"Code"** toggle top right to open the CodeMirror editor showing project files (`src/App.tsx`, `index.css`, `package.json`).
  - **"Publish" / "Deploy" Button**: Click **"Publish"** top right to deploy site live to Vercel or Netlify.

---

### 2.4 Navigation to The Sources Page (`/workspace/[id]/sources`)
**How to navigate here**: Click **"Sources"** in the top navigation bar or navigate to `/workspace/[id]/sources`.
- **"Add Source" Button**: Click **"+ Add Source"** top right.
  - **Web Scrape**: Select **"URL Scrape"**, enter target URL, and click **"Scrape Page"**.
  - **Upload File**: Select **"File Upload"**, drag-and-drop file (PDF, CSV, MD, JSON), and click **"Upload"**.
  - **Database Link**: Select **"Database"**, choose Supabase/Neon, input connection string, and click **"Connect"**.
- **Source Management Options**: Click **"Sync All"** to refresh knowledge embeddings or click the **Trash Icon (🗑)** to remove a source.

---

## 3. Settings Modal Navigation (`Settings` Gear Icon → 17 Tabs)

**How to navigate here**: Click **"Settings" (⚙)** in the top navigation bar. Left sidebar lists all 17 navigation tabs:

1. **Profile**: Click **"Profile"** tab → Edit user avatar, display name, email, and click **"Save Changes"**.
2. **Settings**: Click **"Settings"** tab → Toggle **Light/Dark Mode**, set default language, toggle notifications.
3. **Providers**: Click **"Providers"** tab → Input API keys (OpenAI, Anthropic, Gemini, Groq, Ollama) → Click **"Save Keys"**.
4. **MCP (Model Context Protocol)**:
   - Click **"MCP"** tab.
   - **OAuth Connectors**: Click **"Connect Gmail"**, **"Connect Slack"**, **"Connect Stripe"**, **"Connect GitHub"**, **"Connect Discord"**, **"Connect Telegram"**, or **"Connect Miro"** button to authenticate external accounts.
   - **Custom MCP Server**: Click **"+ Add Server"**, input server type (`stdio`, `sse`, `streamable-http`), enter URL/command, click **"Add"**.
   - **Check Availability**: Click **"Check Availability"** button to test connected MCP server endpoints.
5. **Features**: Click **"Features"** tab → Toggle **"Browser Use MicroVM"**, **"Auto Error Repair"**, or **"Canvas Sync"** switches.
6. **Vercel**: Click **"Vercel"** tab → Paste Vercel Access Token → Click **"Authenticate Vercel"**.
7. **Netlify**: Click **"Netlify"** tab → Paste Netlify Personal Access Token → Click **"Save Token"**.
8. **GitHub**: Click **"GitHub"** tab → Click **"Connect GitHub OAuth"** or paste Personal Access Token → Select export repository.
9. **GitLab**: Click **"GitLab"** tab → Input Personal Access Token & Host URL → Click **"Connect GitLab"**.
10. **Supabase**: Click **"Supabase"** tab → Enter Supabase URL & Anon Key → Click **"Link Supabase Project"**.
11. **Social**: Click **"Social"** tab → Input Twitter/X API keys & LinkedIn credentials → Click **"Save Social Accounts"**.
12. **Notifications**: Click **"Notifications"** tab → Check/uncheck email alerts, desktop push notifications, or Telegram triggers.
13. **Memories**: Click **"Memories"** tab → View stored long-term AI memory items → Click **"Delete"** or **"Clear All Memories"**.
14. **Billing**: Click **"Billing"** tab → View current plan (Free/Pro), API token usage → Click **"Upgrade to Pro"** (opens Stripe Checkout).
15. **Data**: Click **"Data"** tab → Click **"Export Workspace JSON"** to download backup or click **"Delete Workspace"** (requires confirmation).
16. **Event Logs**: Click **"Event Logs"** tab → View real-time system logs, stream recovery events, and API error tracebacks.
17. **Chat**: Click **"Chat"** tab → Adjust temperature slider, system prompt overrides, and max token limits.

---

## 4. Navigation to & Controls inside Falbor AI Agent (AI Sidebar Panel)

**How to open**: Click **"Agent"** button / **Sparkles Icon (✨)** on the top-right navigation bar.
- **Chat Input Field**: Located bottom of right sidebar.
  - **Slash Menu (`/` or `@`)**: Type `/` or `@` into input box → Popup menu opens above input showing all connected MCP connectors → Click `@Gmail`, `@Slack`, or `@Stripe` to attach connector badge.
  - **Send Button**: Click **Blue Up-Arrow** button or press `Enter` to submit prompt.
- **Tool Invocations Component (`ToolInvocations.tsx`)**:
  - When AI Agent calls an MCP tool or workspace action, inline approval card appears.
  - Click **"Run tool"** (`Ctrl+Enter` / `⌘↵`) to authorize execution.
  - Click **"Cancel"** (`Ctrl+Backspace` / `⌘⌫`) to deny execution.
- **Browser Use Session Component**:
  - Appears automatically when web browsing task is requested.
  - Click **"Download Video"** button on top header of live stream window to download MP4 screen recording of executed browser steps.
  - Click **Address Bar Link Icon** to open target URL in new tab.
- **Assistant Message Actions Toolbar**:
  - **Like Button (Thumbs Up)**: Click to rate response positively.
  - **Dislike Button (Thumbs Down)**: Click to open centered **Feedback Modal** → Enter feedback details → Click **"Submit Feedback"**.
  - **Copy Button (Clipboard)**: Click **"Copy"** to copy assistant message text to clipboard.

---

## 5. Comprehensive Navigation Matrix & Action Map

| Target Feature / Action | Navigation Path / Exact Click Sequence | Target Page URL |
| :--- | :--- | :--- |
| **Open Canvas Workspace** | Top Nav Bar → Click **"Canvas"** | `/workspace/[id]/canvas` |
| **Open Vibe Builder** | Top Nav Bar → Click **"Vibe"** | `/workspace/[id]/vibe` |
| **Open Sources Data Page** | Top Nav Bar → Click **"Sources"** | `/workspace/[id]/sources` |
| **Connect Gmail MCP** | Top Nav Bar → Click **"Settings" (⚙)** → Click **"MCP"** tab → Click **"Connect Gmail"** | Settings Modal (`@settings`) |
| **Connect Slack MCP** | Top Nav Bar → Click **"Settings" (⚙)** → Click **"MCP"** tab → Click **"Connect Slack"** | Settings Modal (`@settings`) |
| **Connect Stripe MCP** | Top Nav Bar → Click **"Settings" (⚙)** → Click **"MCP"** tab → Click **"Connect Stripe"** | Settings Modal (`@settings`) |
| **Upgrade Account Plan** | Top Nav Bar → Click **"Settings" (⚙)** → Click **"Billing"** tab → Click **"Upgrade to Pro"** | Settings Modal (`@settings`) |
| **Set LLM API Keys** | Top Nav Bar → Click **"Settings" (⚙)** → Click **"Providers"** tab → Input keys → Click **"Save"** | Settings Modal (`@settings`) |
| **Deploy Website to Vercel** | Top Nav Bar → Click **"Vibe"** → Top Right → Click **"Publish"** → Select **"Vercel"** | `/workspace/[id]/vibe` |
| **Attach MCP in AI Chat** | Top Nav Bar → Click **"Agent" (✨)** → Focus Input → Type `/` → Select connector | AI Sidebar Panel |
| **Approve AI Tool Run** | AI Sidebar Panel → Tool Invocation Card → Click **"Run tool"** | AI Sidebar Panel |
| **Download Browser Action Video** | AI Sidebar Panel → Browser MicroVM Card → Click **"Download Video"** | AI Sidebar Panel |

---
*Created for Falbor Skill System - Confidential Product Knowledge Base.*
