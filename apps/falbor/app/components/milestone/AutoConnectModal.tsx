'use client';

import React, { useState } from 'react';
import { DialogRoot, Dialog } from '~/components/ui/Dialog';
import { Slider } from '~/components/ui/Slider';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';

interface AutoConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

type TechLanguage = 'nextjs-ts' | 'node-js' | 'plain-js' | 'html';

const LANGUAGE_LABELS: Record<TechLanguage, string> = {
  'nextjs-ts': 'TypeScript (Next.js)',
  'node-js': 'JavaScript (Node.js / Express)',
  'plain-js': 'Plain JavaScript (Browser)',
  'html': 'HTML Script Tag',
};

export function AutoConnectModal({ isOpen, onClose, workspaceId }: AutoConnectModalProps) {
  const [connectMode, setConnectMode] = useState<'manual' | 'agent'>('agent');
  const [selectedLang, setSelectedLang] = useState<TechLanguage>('nextjs-ts');
  const [copied, setCopied] = useState(false);

  const getComprehensiveAgentPrompt = () => {
    switch (selectedLang) {
      case 'nextjs-ts':
        return `================================================================================
FALBOR PLATFORM WORKSPACE MILESTONE INTEGRATION SPECIFICATION (NEXT.JS & TYPESCRIPT)
================================================================================

Target Workspace ID: ${workspaceId}
API Webhook Target: POST https://falbor.com/api/v1/events/user-signup
Required Authentication Header: X-Workspace-ID: ${workspaceId}

--------------------------------------------------------------------------------
1. EXECUTIVE OVERVIEW & PLATFORM ARCHITECTURE
--------------------------------------------------------------------------------
Falbor is an advanced AI development and workspace intelligence platform. In order
to verify real end-user signups and grant milestone rewards (bonus AI credits and
tier perks), your project must transmit a lightweight event ping to Falbor every time
a new user successfully registers an account on your website or web app.

This event integration must be completely non-blocking. If the request to Falbor times out
or fails due to network degradation, your user's registration flow MUST NOT fail or experience
any perceptible latency.

--------------------------------------------------------------------------------
2. EXACT STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS FOR AI AGENT
--------------------------------------------------------------------------------
Please inspect the codebase, create the required helper file, and wire up the registration event handler:

STEP 2.1: CREATE THE TRACKER HELPER MODULE
Create a dedicated file at path: \`lib/falborTracker.ts\` (or \`src/lib/falborTracker.ts\` depending on your project root).

File Content for \`lib/falborTracker.ts\`:

import type { NextRequest } from 'next/server';

interface FalborSignupPayload {
  userEmail?: string;
  metadata?: Record<string, any>;
}

/**
 * Sends a background tracking ping to Falbor Workspace API upon user signup.
 * Safely fails silently to prevent disrupting main registration control flow.
 */
export async function trackFalborSignup(userEmail?: string, metadata?: Record<string, any>): Promise<void> {
  const FALBOR_ENDPOINT = 'https://falbor.com/api/v1/events/user-signup';
  const WORKSPACE_ID = '${workspaceId}';

  const payload: FalborSignupPayload = {
    userEmail: userEmail || 'anonymous@user.com',
    metadata: {
      source: 'web_registration',
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };

  try {
    // Execute asynchronous fetch call without awaiting response body
    fetch(FALBOR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-ID': WORKSPACE_ID,
      },
      body: JSON.stringify(payload),
      // Set short keepalive timeout for serverless functions
      keepalive: true,
    }).catch((error) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Falbor Milestone API] Async ping failed silently:', error);
      }
    });
  } catch (err) {
    // Swallow top-level errors to ensure main user sign-up succeeds regardless
  }
}

STEP 2.2: LOCATE REGISTRATION API HANDLER / CONTROLLER
Scan the repository to locate the primary user registration route:
- Next.js App Router: \`app/api/auth/register/route.ts\` or \`app/api/signup/route.ts\`
- Next.js Pages Router: \`pages/api/auth/signup.ts\`
- Auth Frameworks: NextAuth.js / Auth.js \`pages/api/auth/[...nextauth].ts\` or Clerk / Supabase webhooks.

STEP 2.3: INJECT TRACKING CALL UPON DB SUCCESS
Inside your registration route handler, import \`trackFalborSignup\` and trigger it immediately after saving the new user record into the database.

Example Integration in Next.js App Router (\`app/api/auth/register/route.ts\`):

import { NextResponse } from 'next/server';
import { trackFalborSignup } from '~/lib/falborTracker';
// import { db } from '~/lib/db';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1. Validate inputs and hash password...
    // 2. Insert new user into database...
    // const newUser = await db.insert(users).values({ email, passwordHash }).returning();

    // 3. TRIGGER FALBOR MILESTONE TRACKING PING (Non-blocking):
    trackFalborSignup(email);

    // 4. Return success response to user
    return NextResponse.json({ success: true, message: 'User created' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

--------------------------------------------------------------------------------
3. VERIFICATION & AUDIT CHECKLIST
--------------------------------------------------------------------------------
- Verify file \`lib/falborTracker.ts\` is created with correct header \`X-Workspace-ID: ${workspaceId}\`.
- Ensure \`trackFalborSignup\` is invoked upon new user registration.
- Verify user signup flow functions smoothly without errors.`;

      case 'node-js':
        return `================================================================================
FALBOR PLATFORM WORKSPACE MILESTONE INTEGRATION SPECIFICATION (NODE.JS / EXPRESS)
================================================================================

Target Workspace ID: ${workspaceId}
API Webhook Target: POST https://falbor.com/api/v1/events/user-signup
Required Authentication Header: X-Workspace-ID: ${workspaceId}

--------------------------------------------------------------------------------
1. EXECUTIVE OVERVIEW & PLATFORM ARCHITECTURE
--------------------------------------------------------------------------------
Falbor is an advanced AI development and workspace intelligence platform. In order
to verify real end-user signups and grant milestone rewards (bonus AI credits and
tier perks), your Node.js backend must transmit a lightweight event ping to Falbor
every time a new user successfully registers an account on your service.

--------------------------------------------------------------------------------
2. EXACT STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS FOR AI AGENT
--------------------------------------------------------------------------------

STEP 2.1: CREATE THE TRACKER SERVICE MODULE
Create a dedicated file at path: \`services/falborTracker.js\`

File Content for \`services/falborTracker.js\`:

const FALBOR_ENDPOINT = 'https://falbor.com/api/v1/events/user-signup';
const WORKSPACE_ID = '${workspaceId}';

/**
 * Transmits a non-blocking background HTTP POST ping to Falbor Workspace API.
 * Ensures server registration flow is never delayed or interrupted.
 */
async function trackFalborSignup(userEmail) {
  try {
    fetch(FALBOR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-ID': WORKSPACE_ID,
      },
      body: JSON.stringify({
        userEmail: userEmail || 'anonymous@user.com',
        timestamp: new Date().toISOString(),
      }),
    }).catch((err) => {
      console.warn('[Falbor API Tracker] Non-fatal background ping failure:', err.message);
    });
  } catch (err) {
    // Silently ignore network failures to protect main app flow
  }
}

module.exports = { trackFalborSignup };

STEP 2.2: LOCATE EXPRESS CONTROLLER OR AUTH ROUTE
Scan the codebase for auth controllers (e.g. \`controllers/authController.js\`, \`routes/user.js\`, or \`routes/auth.js\`).

STEP 2.3: INJECT TRACKING CALL
Import \`trackFalborSignup\` and invoke it when a user record is saved:

const { trackFalborSignup } = require('../services/falborTracker');

exports.registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    // ... DB save user logic ...

    // Trigger Falbor milestone verification:
    trackFalborSignup(email);

    return res.status(201).json({ status: 'success' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

--------------------------------------------------------------------------------
3. VERIFICATION & TESTING
--------------------------------------------------------------------------------
- Test creating a user account and ensure event header \`X-Workspace-ID: ${workspaceId}\` is sent.`;

      case 'plain-js':
        return `================================================================================
FALBOR PLATFORM WORKSPACE MILESTONE INTEGRATION SPECIFICATION (PLAIN JAVASCRIPT)
================================================================================

Target Workspace ID: ${workspaceId}
API Webhook Target: POST https://falbor.com/api/v1/events/user-signup
Required Authentication Header: X-Workspace-ID: ${workspaceId}

--------------------------------------------------------------------------------
1. EXECUTIVE OVERVIEW & PLATFORM ARCHITECTURE
--------------------------------------------------------------------------------
Falbor is an advanced AI development and workspace intelligence platform. This script
enables client-side browser apps to transmit a signup event directly to Falbor.

--------------------------------------------------------------------------------
2. IMPLEMENTATION INSTRUCTIONS
--------------------------------------------------------------------------------

STEP 2.1: CREATE BROWSER MODULE \`js/falbor-tracker.js\`

(function() {
  window.trackFalborSignup = function(userEmail) {
    try {
      fetch('https://falbor.com/api/v1/events/user-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Workspace-ID': '${workspaceId}',
        },
        body: JSON.stringify({ userEmail: userEmail || '' }),
      }).catch(function(e) {});
    } catch (err) {}
  };
})();

STEP 2.2: CALL ON FORM SUBMIT
Inside your registration form handler:

document.getElementById('signup-form').addEventListener('submit', function(e) {
  // After successful registration:
  window.trackFalborSignup(document.getElementById('email').value);
});`;

      case 'html':
        return `================================================================================
FALBOR PLATFORM WORKSPACE MILESTONE INTEGRATION SPECIFICATION (HTML SCRIPT TAG)
================================================================================

Target Workspace ID: ${workspaceId}
API Webhook Target: POST https://falbor.com/api/v1/events/user-signup
Required Authentication Header: X-Workspace-ID: ${workspaceId}

--------------------------------------------------------------------------------
1. EMBED CODE SNIPPET
--------------------------------------------------------------------------------
Paste this script snippet before the closing </body> tag:

<script>
  function triggerFalborSignup(userEmail) {
    try {
      fetch('https://falbor.com/api/v1/events/user-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Workspace-ID': '${workspaceId}'
        },
        body: JSON.stringify({ userEmail: userEmail || '' })
      }).catch(function() {});
    } catch(e) {}
  }
</script>`;
    }
  };

  const getManualInstructions = () => {
    switch (selectedLang) {
      case 'nextjs-ts':
        return (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-900 dark:text-white">File 1: Create `lib/falborTracker.ts`</span>
              <pre className="text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111114] p-3 rounded-lg border border-gray-200 dark:border-gray-800 font-mono overflow-x-auto">
{`export async function trackFalborSignup(userEmail?: string) {
  try {
    fetch('https://falbor.com/api/v1/events/user-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-ID': '${workspaceId}',
      },
      body: JSON.stringify({ userEmail }),
    }).catch(() => {});
  } catch (e) {}
}`}
              </pre>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white">File 2: Call inside `app/api/auth/register/route.ts`</span>
              <pre className="text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111114] p-3 rounded-lg border border-gray-200 dark:border-gray-800 font-mono overflow-x-auto">
{`import { trackFalborSignup } from '~/lib/falborTracker';

// Inside POST handler after saving user:
await trackFalborSignup(newUser.email);`}
              </pre>
            </div>
          </>
        );

      case 'node-js':
        return (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-900 dark:text-white">File 1: Create `services/falborTracker.js`</span>
              <pre className="text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111114] p-3 rounded-lg border border-gray-200 dark:border-gray-800 font-mono overflow-x-auto">
{`async function trackFalborSignup(email) {
  try {
    fetch('https://falbor.com/api/v1/events/user-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-ID': '${workspaceId}'
      },
      body: JSON.stringify({ userEmail: email })
    }).catch(() => {});
  } catch (e) {}
}

module.exports = { trackFalborSignup };`}
              </pre>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white">File 2: Add to `controllers/authController.js`</span>
              <pre className="text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111114] p-3 rounded-lg border border-gray-200 dark:border-gray-800 font-mono overflow-x-auto">
{`const { trackFalborSignup } = require('../services/falborTracker');

// On registration success:
trackFalborSignup(req.body.email);`}
              </pre>
            </div>
          </>
        );

      case 'plain-js':
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-900 dark:text-white">Create `js/falbor-tracker.js`</span>
            <pre className="text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111114] p-3 rounded-lg border border-gray-200 dark:border-gray-800 font-mono overflow-x-auto">
{`window.trackFalborSignup = function(userEmail) {
  fetch('https://falbor.com/api/v1/events/user-signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Workspace-ID': '${workspaceId}'
    },
    body: JSON.stringify({ userEmail: userEmail })
  }).catch(function() {});
};`}
            </pre>
          </div>
        );

      case 'html':
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-900 dark:text-white">Embed Script Tag on Registration / Thank You Page</span>
            <pre className="text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111114] p-3 rounded-lg border border-gray-200 dark:border-gray-800 font-mono overflow-x-auto">
{`<script>
  fetch('https://falbor.com/api/v1/events/user-signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Workspace-ID': '${workspaceId}'
    },
    body: JSON.stringify({ event: 'signup' })
  });
</script>`}
            </pre>
          </div>
        );
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getComprehensiveAgentPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog showCloseButton={true} onClose={onClose} className="!w-[90vw] !max-w-[700px] p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Auto Connect API Integration</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Select your framework language to generate comprehensive setup instructions or AI Agent prompts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-1">
            <Slider<'manual' | 'agent'>
              selected={connectMode}
              setSelected={setConnectMode}
              options={{
                left: { value: 'agent', text: 'Agent', icon: 'i-ph:robot' },
                right: { value: 'manual', text: 'Manual Setup', icon: 'i-ph:code' },
              }}
            />

            <Dropdown
              trigger={
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#18191D] text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className="i-ph:code-bold w-4 h-4 text-blue-500" />
                  <span>{LANGUAGE_LABELS[selectedLang]}</span>
                  <div className="i-ph:caret-down w-3.5 h-3.5 text-gray-400 ml-1" />
                </button>
              }
            >
              {(Object.keys(LANGUAGE_LABELS) as TechLanguage[]).map((langKey) => (
                <DropdownItem
                  key={langKey}
                  active={selectedLang === langKey}
                  onSelect={() => setSelectedLang(langKey)}
                >
                  <span className="text-xs font-medium">{LANGUAGE_LABELS[langKey]}</span>
                </DropdownItem>
              ))}
            </Dropdown>
          </div>

          {connectMode === 'agent' ? (
            <div className="flex flex-col gap-3 bg-gray-50 dark:bg-[#18191D] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  Detailed AI Agent Instruction Specification
                </span>
                <button
                  onClick={handleCopy}
                  className="text-xs text-[#0099ff] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                >
                  <div className={copied ? 'i-ph:check text-green-500' : 'i-ph:copy'} />
                  {copied ? 'Copied Specification' : 'Copy Specification'}
                </button>
              </div>
              <pre className="text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111114] p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 font-mono whitespace-pre-wrap overflow-y-auto max-h-[260px] leading-relaxed">
                {getComprehensiveAgentPrompt()}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col gap-3 bg-gray-50 dark:bg-[#18191D] p-4 rounded-xl border border-gray-200 dark:border-gray-800 max-h-[320px] overflow-y-auto">
              {getManualInstructions()}
            </div>
          )}

          <div className="flex justify-end mt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
