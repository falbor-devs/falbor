import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const falbor = new URL('../../apps/falbor/', import.meta.url);
const extRoot = new URL('../../apps/browser-extension/', import.meta.url);
const readFalbor = (relative) => readFileSync(new URL(relative, falbor), 'utf8');
const readExt = (relative) => readFileSync(new URL(relative, extRoot), 'utf8');

const agentRoutes = [
  'app/api/automation/extension/agent/session/route.ts',
  'app/api/automation/extension/agent/control/route.ts',
  'app/api/automation/extension/agent/observe/route.ts',
  'app/api/automation/extension/agent/report/route.ts',
];

describe('Agent API routes', () => {
  test('all four routes ship CORS JSON responses; mutating routes accept POST and preflight', () => {
    for (const file of agentRoutes) {
      const source = readFalbor(file);
      assert.match(source, /extensionJson/, `${file} must respond through extensionJson`);
      assert.match(source, /export function OPTIONS\(\)/, `${file} must export an OPTIONS preflight`);
      assert.ok(!source.includes('NextResponse.json('), `${file} must not bypass CORS`);
    }
    assert.match(readFalbor(agentRoutes[0]), /export async function GET\(/);
    for (const file of agentRoutes.slice(1)) {
      assert.match(readFalbor(file), /export async function POST\(/, `${file} must export POST`);
    }
  });

  test('the extension API prefix is already whitelisted in middleware', () => {
    const middleware = readFalbor('middleware.ts');
    assert.ok(middleware.includes('path.startsWith("/api/automation/extension/")'));
  });

  test('server actions gate every control entry point behind workspace access', () => {
    const actions = readFalbor('app/lib/actions/automation/agent.ts');
    assert.match(actions, /assertWorkspaceAccess\(workspaceId\)/);
    for (const fn of ['startAgent', 'pauseAgent', 'resumeAgent', 'stopAgent']) {
      assert.ok(actions.includes(`export async function ${fn}`), `${fn} must be exported`);
    }
    const configActions = readFalbor('app/lib/actions/automation/agentConfig.ts');
    assert.match(configActions, /assertWorkspaceAccess\(workspaceId\)/);
    assert.ok(
      configActions.includes('export async function updateAgentConfig'),
      'updateAgentConfig must be exported',
    );
    assert.ok(
      !configActions.includes("from '~/lib/automation/agent'"),
      'config actions must not import the heavy agent orchestrator',
    );
    assert.ok(
      !actions.includes('export async function updateAgentConfig'),
      'config actions must live in the lightweight agentConfig module',
    );
  });
});

describe('Extension agent wiring', () => {
  const background = readExt('src/background.js');
  const agentSource = readExt('src/agent.js');
  const build = readExt('build.mjs');

  test('the background bundle includes the agent engine before background.js', () => {
    const match = build.match(/bundle\(\[([^\]]+)\],\s*true\)/);
    assert.ok(match, 'build.mjs must contain a wrapped bundle definition');
    const files = match[1]
      .split(',')
      .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    const agentIndex = files.indexOf('agent.js');
    const backgroundIndex = files.indexOf('background.js');
    assert.ok(agentIndex !== -1, 'agent.js must be part of the background bundle');
    assert.ok(backgroundIndex !== -1, 'background.js must be part of the background bundle');
    assert.ok(agentIndex < backgroundIndex, 'agent.js must be concatenated before background.js');
  });

  test('the content bundle includes the Reddit DOM adapter', () => {
    assert.match(build, /'lib\/reddit\.js'/);
  });

  test('background registers the agent alarm, message bridge and state exposure', () => {
    assert.match(background, /AGENT_ALARM/);
    assert.match(background, /falbor:agent-control/);
    assert.match(background, /agentTick\(\)/);
    assert.match(background, /agent = await getAgentRunState\(\)/);
    assert.match(agentSource, /const AGENT_ALARM = 'falbor-agent'/);
  });

  test('content script answers the read-only agent probes', () => {
    const content = readExt('src/content.js');
    assert.match(content, /falbor:agent-feed/);
    assert.match(content, /falbor:agent-thread/);
    assert.ok(!content.includes('falbor:agent-submit'), 'there must be no agent submit message');
  });

  test('the agent engine never clicks submit or posts to Reddit directly', () => {
    assert.ok(!/\.click\(/.test(agentSource), 'agent.js must not click page elements');
    assert.ok(!/method:\s*'POST'[^}]*reddit\.com/i.test(agentSource), 'agent.js must not POST to Reddit');
    assert.ok(!agentSource.includes('dispatchEvent'), 'agent.js must not synthesize events');
    assert.ok(!/document\./.test(agentSource), 'agent.js must not touch the DOM directly');
  });

  test('manifests keep the same scoped permissions — no new broad access', () => {
    for (const name of ['chrome', 'firefox']) {
      const manifest = JSON.parse(readExt(`src/manifest.${name}.json`));
      assert.deepEqual(manifest.permissions, ['storage', 'alarms', 'tabs', 'scripting']);
      assert.deepEqual(manifest.host_permissions, [
        '*://*.reddit.com/*',
        'http://localhost:3000/*',
        'http://127.0.0.1:3000/*',
      ]);
      assert.match(manifest.description, /manually/i);
    }
  });

  test('popup exposes start/pause/resume/stop controls and reads the agent state', () => {
    const html = readExt('src/popup.html');
    const popup = readExt('src/popup.js');
    for (const id of ['agent-start-btn', 'agent-pause-btn', 'agent-resume-btn', 'agent-stop-btn']) {
      assert.ok(html.includes(id), `${id} must exist in popup.html`);
    }
    assert.match(popup, /falbor:agent-control/);
    assert.match(popup, /falbor_agent_state/);
  });

  test('extension inspector only reads listings and threads', () => {
    const reddit = readExt('src/lib/reddit.js');
    assert.match(reddit, /extractFeedCandidates/);
    assert.match(reddit, /extractThreadObservation/);
    assert.ok(!reddit.includes('.submit('), 'reddit.js must not submit forms');
    assert.ok(!reddit.includes('.click('), 'reddit.js must not click elements');
  });
});

describe('Agent database contract', () => {
  test('schema defines agent sessions, actions and AI usage with an idempotency guard', () => {
    const schema = readFalbor('app/lib/db/schema.ts');
    assert.match(schema, /automationAgentSessions/);
    assert.match(schema, /automationAgentActions/);
    assert.match(schema, /automationAgentAiUsage/);
    assert.match(schema, /idempotencyKey/);
    assert.match(schema, /agentConfig/);
  });

  test('status summary exposes the agent snapshot and stored agent config', () => {
    const status = readFalbor('app/lib/automation/status.ts');
    assert.match(status, /agent_session/);
    assert.match(status, /agentConfig: normalizeAgentConfig\(settingsRow\?\.agentConfig\)/);
    const types = readFalbor('app/lib/automation/types.ts');
    assert.match(types, /AutomationAgentStatusSummary/);
    assert.match(types, /agent: AutomationAgentStatusSummary \| null/);
    assert.match(types, /agentConfig: AgentConfig/);
  });
});
