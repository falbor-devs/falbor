# Falbor Automation browser extension

A dependency-free WebExtension (Chrome + Firefox, Manifest V3) that connects a
browser to your Falbor workspace and assists with posting **approved** Reddit
comments.

The extension never submits a comment for you. It fills Reddit's comment editor
with the exact approved text, you review it and click Reddit's **Comment**
button yourself, and the extension observes the page to report what actually
happened back to Falbor. It never bypasses CAPTCHAs, rate limits or moderation.

## Status

Not published to any store. This is a developer build: load it unpacked (Chrome)
or as a temporary add-on (Firefox). Store submission requires developer accounts
and review, and is not part of this app.

## Architecture

- `src/background.js` — service worker (Chrome) / event page (Firefox). Owns
  polling, the pairing token, task claiming, the Reddit tab lifecycle and
  result reporting. All listeners are registered at the top level so they
  re-register whenever the worker wakes up.
- `src/content.js` — runs only on `reddit.com`. Waits for a `falbor:fill`
  message, validates the thread, finds the comment editor, prefills the exact
  approved text, shows a small Falbor banner, then observes the DOM for the
  submitted comment or a Reddit error and reports the result. It never clicks
  submit.
- `src/popup.html|css|js` — pairing UI and live status. Every value shown comes
  from extension storage / the background worker; nothing is fabricated.
- `src/lib/browser.js` — promise wrappers that work on both `chrome.*`
  (callback) and `browser.*` (promise) APIs.
- `src/lib/api.js` — Falbor HTTP client (`fetch` + 15s timeout; never throws,
  always returns `{ ok, status, data }`).
- `src/lib/text.js` — text normalization shared by the content script.
- `build.mjs` — concatenates the sources into classic scripts (MV3 content
  scripts cannot use ES modules; Firefox `background.scripts` does not support
  modules reliably), generates icons with a small built-in PNG encoder, copies
  assets and writes the per-browser manifest.

## Pairing flow

1. In Falbor, open your workspace → **Automation** → **Connect extension**.
   Falbor shows a one-time pairing code (valid for 15 minutes).
2. Open the extension popup, paste the code, press **Connect**.
3. The extension calls `POST /api/automation/extension/claim` and stores the
   returned token in `chrome.storage.local` (`falbor_token`).
4. The token is scoped to that one workspace and can be revoked from Falbor at
   any time. The popup shows "Token rejected" if Falbor rejects it; re-pair.

## Task flow

1. The background worker polls every minute: `heartbeat` then `GET .../tasks`.
2. If Falbor hands out a `publish_comment` task, the extension finds (or opens)
   the Reddit thread tab, waits for the content script and sends the approved
   text.
3. The content script prefills the editor, then observes the comments area for
   up to 10 minutes.
4. The user clicks Reddit's **Comment** button manually.
5. The content script reports one of:
   - `submitted_observed` — the comment was seen on the page (with permalink /
     `t1_...` id when extractable),
   - `failed` — a real failure was detected (Reddit error banner, locked
     thread, missing editor, not signed in),
   - `outcome_unknown` — the outcome could not be determined (page navigated
     away, timed out). Falbor will not retry automatically,
   - `cancelled_by_user` — the user pressed Cancel in the Falbor banner or
     popup.
6. The result is posted to `POST .../tasks/{id}/result`.

## Build

Requires Node.js only (no dependencies).

```bash
cd apps/browser-extension
node build.mjs            # builds dist/chrome and dist/firefox
node build.mjs chrome     # builds only dist/chrome
node build.mjs firefox    # builds only dist/firefox
node build.mjs package    # zips existing dist/* into falbor-automation-<browser>-v<version>.zip
```

`package` requires the `zip` CLI; if it is missing, the script prints the exact
command to run manually.

## Install (development)

### Chrome / Chromium

1. Run `node build.mjs chrome`.
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select `apps/browser-extension/dist/chrome`.

### Firefox

1. Run `node build.mjs firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. **Load Temporary Add-on...** → select `apps/browser-extension/dist/firefox/manifest.json`.

Temporary add-ons are removed when Firefox closes. If Reddit pages do not get
the content script, check `about:addons` → Falbor Automation → Permissions and
grant access to reddit.com and your backend host.

## Backend requirements

- Falbor must be running and reachable at the configured backend URL
  (default `http://localhost:3000`).
- A pairing code must be generated on the Falbor Automation page.
- The extension only operates on `reddit.com` tabs, and the user must be signed
  in to Reddit in the same browser profile.
- Non-localhost backends must be `https://` so the extension can request host
  permission (`optional_host_permissions: ["https://*/*"]`).

## Troubleshooting

- **Token rejected** — the pairing token was revoked or is invalid. Disconnect
  and pair again from the Falbor Automation page.
- **Editor not found** — Reddit changed its page markup, the thread is locked /
  archived, or you are signed out. The extension shows the specific reason in
  the banner; open an issue if Reddit's DOM changed.
- **Outcome unknown** — the extension could not confirm what happened (page
  navigated away, DOM unreadable, timeout). Falbor does not retry
  automatically; the publication is reconciled on the backend side.
- **Extension offline in the popup** — no recent heartbeat. Check that Falbor
  is running and that the backend URL in the popup is correct, then press
  **Check now**.
- **"Could not fill the Reddit editor reliably"** — the editor content did not
  match the approved text after two attempts; nothing was submitted.

## Security notes

- The pairing token is stored only in extension storage, scoped to a single
  Falbor workspace, and is revocable from Falbor at any time.
- The extension never reads passwords, cookies or Reddit credentials, and never
  uses Reddit's API with user credentials.
- Network access is limited to `reddit.com` and the configured backend host
  (plus optional `https://` permission you explicitly grant).
- No automatic clicking of Reddit's Comment button, ever; no CAPTCHA, rate
  limit or moderation bypass.
