# Falbor Automation — Reddit Growth System

The Automation feature turns a workspace into a Reddit growth pipeline:

```
Product context → AI agent (your logged-in Reddit tab) → AI scoring & drafts
→ explicit approval → browser-extension prefill → manual Comment click
→ verification → metrics → recommendations
```

The default path is the **AI agent**: it runs entirely inside your own logged-in Reddit tab
through the browser extension — no Reddit API keys, no OAuth app, no server-side browsing.
The legacy API discovery path (section 2) still exists for workspaces that configure Reddit
API credentials.

## Safety model (non-negotiable)

- Nothing is posted to Reddit by servers, and the agent never submits comments.
  `AUTONOMOUS_SUBMISSION_AUTHORIZED` is hard-coded `false`; autonomous submission stays
  disabled until Reddit's policies authorize it.
- The agent only **reads** listings and threads and writes drafts for your review.
- Approved drafts are prefilled into Reddit's own editor by the extension and the user clicks
  **Comment** themselves — never the other way around.
- The extension never clicks submit controls programmatically (enforced by tests).
- Publishing requires a draft that was approved for the exact current content hash. Editing
  after approval resets the approval server-side.
- Unknown outcomes are reported as `outcome_unknown`, never as success. Score/comment totals
  that are unavailable render as "Unavailable", never as 0.
- All AI prompts embed an untrusted-content guard: Reddit content can never alter the task.
- Every server action enforces workspace ownership (`assertWorkspaceAccess`); extension
  requests are authenticated by hashed bearer tokens scoped to one workspace + user.
- On CAPTCHA / human verification or rate limiting the agent pauses and reports honestly —
  it never attempts to bypass them.

## 1. Database

Run (from the repo root):

```bash
pnpm --filter falbor db:push
```

This creates the automation tables: `reddit_connections`, `automation_settings`,
`automation_extension_installations`, `automation_extension_pairings`,
`automation_discovery_runs`, `automation_opportunities`, `automation_drafts`,
`automation_tasks`, `automation_publications`, `automation_events`,
`automation_metric_snapshots`, plus the agent tables `automation_agent_sessions`,
`automation_agent_actions`, `automation_agent_ai_usage` and the `agent_config` column on
`automation_settings`.

## 2. Reddit API credentials (optional, legacy discovery only)

The agent does **not** need these. Configure them only if you want server-side discovery:

1. Create an app at https://www.reddit.com/prefs/apps (type: **web app**).
2. Redirect URI: `http://localhost:3000/api/auth/reddit/callback` (or your deployed URL,
   then set `REDDIT_REDIRECT_URI` to the exact same value).
3. Add to `apps/falbor/.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `REDDIT_CLIENT_ID` | yes | OAuth client id |
| `REDDIT_CLIENT_SECRET` | yes | OAuth client secret |
| `REDDIT_REDIRECT_URI` | no | Overrides the redirect URI (must match the Reddit app exactly) |
| `REDDIT_USER_AGENT` | no | Default: `web:falbor-automation:1.0.0 (by /u/falbor)` |
| `REDDIT_SCOPES` | no | Default: `identity read` |

Placeholder values (`FALBOR_REDDIT_ID`) are treated as "not configured" and the UI says so.

> Reddit's Data API terms may require approval for commercial use. Without it, keep volumes
> low and respect the per-app rate limits (the client already handles 429s with backoff).

## 3. Browser extension (Chrome + Firefox)

```bash
cd apps/browser-extension
node build.mjs            # builds dist/chrome, dist/firefox and both zips
```

- Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → `dist/chrome`
- Firefox: `about:debugging` → **Load Temporary Add-on** → `dist/firefox/manifest.json`

Publishable zips (for Chrome Web Store / AMO submission) are written to
`apps/browser-extension/falbor-automation-chrome-v1.0.0.zip` and
`...-firefox-v1.0.0.zip`. Until the extension is published, leave
`NEXT_PUBLIC_CHROME_EXTENSION_URL` / `NEXT_PUBLIC_FIREFOX_EXTENSION_URL` empty — the
Automation UI then shows the local install instructions instead.

The extension talks only to the Falbor API (localhost by default) and `*.reddit.com`.

## 4. Pairing

1. Open the workspace → **Automation** → Overview.
2. Click **Connect extension** to generate a one-time code (`AAAAA-BBBBB`, valid 15 min).
3. Paste it into the extension popup and connect. The server stores only a SHA-256 hash of
   the issued token; revoke it anytime from the same card.

## 5. AI agent (default workflow)

1. Open the workspace → **Automation** → Overview → **AI agent** card.
2. Click **Configure** and pick the subreddits to monitor plus your limits (runtime, AI
   calls, estimated cost, consecutive errors/irrelevant, navigation, draft generation).
3. Click **Start agent**. The backend creates a session; the extension binds to your existing
   Reddit tab and the agent loop runs inside that tab (the background worker only coordinates:
   session lookup, message proxying and wake-ups via its 1-minute alarm and tab events).
4. The agent scans `r/<scope>/new/`, sees the real rendered feed (scrolling it when needed),
   opens discussions, verifies the page loaded, and submits every observation to Falbor.
   If the Reddit tab is on any other page (home feed, search, …) the agent opens the
   configured scope listing itself first (unless navigation is disabled in the config).
   Falbor decides on every step: `inspect`, `scroll_feed`, `open_listing`, `draft_created`,
   `skip`, `wait`, `pause`, `stop`. Each decision carries an `actionId` so the agent can
   report the outcome (completed/failed) exactly once. On the page itself a small overlay
   card shows status, current activity, counters and **Pause / Stop** buttons, and the agent
   highlights the post it is about to open. Drafts land in the Drafts tab as `awaiting_approval`.
5. Pause / Resume / Stop from the web UI, the extension popup or the on-page overlay (Stop has
   priority: the backend flips to `stopping`, the extension acknowledges and the session
   becomes `stopped`). If the agent pauses itself (cost/AI-call budget, consecutive errors,
   verification, exhausted feed), the reason is shown on the card and in the Activity tab.

Limits are enforced **server-side** (`agentCore.ts` + `agent.ts`): every observation carries
a session `revision`; stale revisions return `409` with the fresh session and idempotency
keys (`feed:*`, `inspect:*`) prevent duplicate work after retries. Bounds keep the agent
honest: a limited number of feed scrolls per listing, listing rotation at most twice the
configured scope, posts whose open already failed excluded from the feed, and a pause when
the listings are exhausted. Opening a discussion is only reported **completed after the
thread page is verified** (title/body of the expected post); stale pending verifications are
resolved without claiming success. A running session with no tab activity for 10 minutes is
reconciled to `paused`.

Agent events appear in the Activity feed (`agent_session_started`, `agent_draft_created`,
`agent_limit_reached`, `agent_policy_blocked`, …). AI usage is metered per session
(`automation_agent_ai_usage`) and counted against `maxAiCalls` / `maxEstimatedCostUsd`.

## 6. Automatic discovery (optional, legacy)

`GET/POST /api/cron/automation` (Bearer `CRON_SECRET`) reconciles stale tasks, processes
queued verification tasks and runs discovery for workspaces with `autoDiscovery` enabled.
Manual discovery always works without a scheduler. Wire it in `vercel.json` crons or any
external scheduler to run it every 6–24 hours.

## Extension API (Bearer token)

| Endpoint | Purpose |
| --- | --- |
| `POST /api/automation/extension/claim` | Exchange a pairing code for a token |
| `POST /api/automation/extension/heartbeat` | Presence + version report |
| `GET /api/automation/extension/tasks` | Atomically claim one queued task |
| `POST /api/automation/extension/tasks/{id}/result` | Report `submitted_observed`, `failed`, `outcome_unknown`, `cancelled_by_user` |
| `GET /api/automation/extension/agent/session` | Current agent session + policy |
| `POST /api/automation/extension/agent/control` | Start / pause / resume / stop (optional config + expected revision) |
| `POST /api/automation/extension/agent/observe` | Submit a feed or thread observation, receive the decision |
| `POST /api/automation/extension/agent/report` | Report action results, errors, stop acknowledgement, pause requests |

## Verification model

- With a Reddit connection (`read` scope): submission is confirmed through the API and
  metrics are refreshed into `automation_metric_snapshots`.
- Without it: the task result is stored as `submitted_observed` (unverified) and the UI
  labels it exactly that way. `outcome_unknown` requires **Reconcile**, never a blind repost.

## Tests

```bash
node --import tsx --test tests/automation/*.test.mjs
```

Covers the draft/task/publication state machines, discovery query construction, Reddit
normalizers, idempotency keys, token/pairing-code hashing, AI schema validation, prompt
injection guards, the extension manifests' no-auto-submit guarantee, and the agent engine
(session transitions, config clamping, revision staleness, cost limits, feed filtering,
decision limits, extension wiring, and the absence of any autonomous submit path).
`agent-interaction.test.mjs` additionally drives the built content bundle in a real
(Playwright) Reddit DOM with a mocked backend: overlay status, post highlight, real tab
navigation, post-navigation verification, scrolling with verified growth, pause/stop/wake,
stale-revision refresh, backend-error retry and duplicate-report prevention.
