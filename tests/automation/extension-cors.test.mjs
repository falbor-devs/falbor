import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const falbor = new URL('../../apps/falbor/', import.meta.url);
const readFalbor = (relative) => readFileSync(new URL(relative, falbor), 'utf8');

const routeFiles = [
  'app/api/automation/extension/claim/route.ts',
  'app/api/automation/extension/heartbeat/route.ts',
  'app/api/automation/extension/tasks/route.ts',
  'app/api/automation/extension/tasks/[id]/result/route.ts',
];

describe('Extension API CORS and middleware reachability', () => {
  test('every extension route ships CORS JSON responses and an OPTIONS preflight', () => {
    for (const file of routeFiles) {
      const source = readFalbor(file);
      assert.match(source, /extensionJson/, `${file} must respond through extensionJson`);
      assert.match(source, /export function OPTIONS\(\)/, `${file} must export an OPTIONS preflight handler`);
      assert.ok(!source.includes('NextResponse.json('), `${file} must not bypass CORS via raw NextResponse.json`);
    }
  });

  test('middleware lets the extension API and cron automation through without a session cookie', () => {
    const middleware = readFalbor('middleware.ts');
    assert.ok(
      middleware.includes('path.startsWith("/api/automation/extension/")'),
      'middleware must whitelist the extension API prefix',
    );
    assert.ok(middleware.includes('"/api/cron/automation"'), 'middleware must whitelist the CRON_SECRET-gated cron route');
    assert.ok(
      !middleware.includes('path.startsWith("/api/automation/")'),
      'session-protected automation routes (e.g. /api/automation/status) must stay gated',
    );
  });

  test('CORS helper allows exactly what the extension sends and nothing credentialed', () => {
    const helper = readFalbor('app/lib/automation/http.ts');
    assert.ok(helper.includes("'Access-Control-Allow-Origin': '*'"));
    assert.ok(helper.includes('Content-Type, Authorization'));
    assert.ok(!helper.includes('Access-Control-Allow-Credentials'));
  });
});
