import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const extRoot = new URL('../../apps/browser-extension/', import.meta.url);
const read = (relative) => readFileSync(new URL(relative, extRoot), 'utf8');

const chromeManifest = JSON.parse(read('src/manifest.chrome.json'));
const firefoxManifest = JSON.parse(read('src/manifest.firefox.json'));

describe('Chrome extension manifest', () => {
  test('is a Manifest V3 extension with a service worker background', () => {
    assert.equal(chromeManifest.manifest_version, 3);
    assert.equal(chromeManifest.background.service_worker, 'background.js');
  });

  test('content scripts are limited to Reddit', () => {
    assert.deepEqual(chromeManifest.content_scripts[0].matches, ['*://*.reddit.com/*']);
    assert.equal(chromeManifest.content_scripts[0].js[0], 'content.js');
  });

  test('host permissions are scoped — no all_urls, no blocking webRequest', () => {
    assert.ok(!chromeManifest.host_permissions.includes('<all_urls>'));
    assert.ok(!(chromeManifest.permissions || []).includes('webRequestBlocking'));
    assert.ok(chromeManifest.permissions.includes('storage'));
  });

  test('description states the user submits every comment manually', () => {
    assert.match(chromeManifest.description, /manually/i);
  });
});

describe('Firefox extension manifest', () => {
  test('uses background scripts with the stable gecko id and MV3', () => {
    assert.equal(firefoxManifest.manifest_version, 3);
    assert.deepEqual(firefoxManifest.background.scripts, ['background.js']);
    assert.equal(firefoxManifest.browser_specific_settings.gecko.id, 'automation@falbor.app');
    assert.equal(firefoxManifest.browser_specific_settings.gecko.strict_min_version, '115.0');
  });

  test('content scripts are limited to Reddit', () => {
    assert.deepEqual(firefoxManifest.content_scripts[0].matches, ['*://*.reddit.com/*']);
  });
});

describe('Extension safety guarantees (no auto-submit)', () => {
  const contentScript = read('src/content.js');
  const backgroundScript = read('src/background.js');

  test('content script never programmatically clicks submit controls', () => {
    assert.ok(!contentScript.includes('.click('), 'content script must never click anything for the user');
    assert.ok(!backgroundScript.includes('.click('), 'background script must never click anything for the user');
  });

  test('content script reports honest task results including unknown outcomes', () => {
    for (const status of ['submitted_observed', 'outcome_unknown', 'cancelled_by_user', 'failed']) {
      const source = read('src/content.js');
      assert.ok(source.includes(status), `content script must support status ${status}`);
    }
  });

  test('content script asks the user to submit manually', () => {
    assert.match(contentScript, /(submit|comment).{0,80}(yourself|manually)/is);
  });

  test('popup assets and build script exist', () => {
    assert.ok(existsSync(new URL('src/popup.html', extRoot)));
    assert.ok(existsSync(new URL('src/popup.js', extRoot)));
    assert.ok(existsSync(new URL('build.mjs', extRoot)));
    assert.match(read('src/popup.html'), /popup\.js/);
  });
});
