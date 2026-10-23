// Browser-level integration tests for the agent interaction layer.
//
// These tests run the REAL built content script (dist/chrome/content.js) in a
// real Chromium page served by a local HTTP server that mimics Reddit markup,
// with a mocked background (runtime messages) and a scripted mock backend.
// They verify that scrolling, highlighting, navigation, post-navigation
// verification, overlay rendering and pause/stop controls touch actual DOM
// state instead of merely dispatching commands.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const requireFromHere = createRequire(import.meta.url);
let chromium = null;
for (const loader of [
  () => requireFromHere('playwright'),
  () => createRequire(new URL('../../apps/falbor/package.json', import.meta.url))('playwright'),
]) {
  try {
    ({ chromium } = loader());
    if (chromium) break;
  } catch (_) {
    chromium = null;
  }
}

const EXT_DIR = fileURLToPath(new URL('../../apps/browser-extension/', import.meta.url));
const CONTENT_SCRIPT = join(EXT_DIR, 'dist', 'chrome', 'content.js');
const CONTENT_CSS = join(EXT_DIR, 'dist', 'chrome', 'content.css');

const SESSION_ID = '00000000-0000-4000-8000-000000000001';
const THREAD_URL = 'http://reddit.com/r/testsub/comments/aaa1/post-aaa1/';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createMockBackend() {
  const backend = {
    session: {
      id: SESSION_ID,
      status: 'running',
      revision: 1,
      stopRequested: false,
      config: { maxDiscussions: 10, scopeSubreddits: ['testsub'], minRelevanceScore: 60 },
      counters: { inspected: 0, analyzed: 0, relevantFound: 0, draftsCreated: 0, skipped: 0, errors: 0 },
      currentActivity: 'Testing the agent runner',
      currentStep: 'feed_scanned',
    },
    // Each entry is consumed by one observe call: either a decision object or
    // { reject: { status, error, session } }. When empty, a pause decision is
    // returned so the loop stops on its own.
    observeScript: [],
    observeDelayMs: 0,
    calls: { session: [], observe: [], report: [], control: [] },
    async handle(message) {
      const type = message && message.type;
      if (type === 'falbor:agent-session') {
        backend.calls.session.push({ at: Date.now(), maxAgeMs: message.maxAgeMs });
        return { ok: true, session: clone(backend.session) };
      }
      if (type === 'falbor:agent-observe') {
        backend.calls.observe.push({ at: Date.now(), payload: clone(message.payload) });
        if (backend.observeDelayMs) {
          await new Promise((resolve) => setTimeout(resolve, backend.observeDelayMs));
        }
        const scripted = backend.observeScript.length ? backend.observeScript.shift() : null;
        if (scripted && scripted.reject) {
          if (scripted.reject.session) backend.session = clone(scripted.reject.session);
          return {
            ok: false,
            status: scripted.reject.status,
            error: scripted.reject.error || 'rejected',
            session: clone(backend.session),
          };
        }
        const decision = scripted || { action: 'pause', reason: 'Nothing else to do.' };
        if (decision.action === 'pause' || decision.action === 'stop') {
          backend.session = {
            ...backend.session,
            status: decision.action === 'pause' ? 'paused' : 'completed',
            currentActivity: decision.reason,
          };
        }
        return {
          ok: true,
          status: 200,
          decision: clone(decision),
          session: clone(backend.session),
          counters: clone(backend.session.counters),
        };
      }
      if (type === 'falbor:agent-action-report') {
        const body = clone(message.body) || {};
        backend.calls.report.push({ at: Date.now(), body });
        for (const action of body.actions || []) {
          if (action.status !== 'completed') continue;
          if (action.kind === 'open_discussion') backend.session.counters.inspected += 1;
          if (action.kind === 'scroll_feed') backend.session.counters.analyzed += 1;
          if (action.kind === 'pause') backend.session = { ...backend.session, status: 'paused' };
        }
        return { ok: true, status: 200, session: clone(backend.session), counters: clone(backend.session.counters) };
      }
      if (type === 'falbor:agent-control') {
        backend.calls.control.push({ at: Date.now(), action: message.action });
        if (message.action === 'pause') backend.session = { ...backend.session, status: 'paused' };
        if (message.action === 'stop') backend.session = { ...backend.session, status: 'stopped' };
        if (message.action === 'resume' || message.action === 'start') {
          backend.session = { ...backend.session, status: 'running' };
        }
        return { ok: true, session: clone(backend.session) };
      }
      return null;
    },
    reports(kind) {
      return backend.calls.report.filter((call) => (call.body.actions || []).some((a) => a.kind === kind));
    },
    reportOf(kind) {
      for (const call of backend.calls.report) {
        const action = (call.body.actions || []).find((a) => a.kind === kind);
        if (action) return action;
      }
      return null;
    },
  };
  return backend;
}

function listingPage(subreddit) {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>r/${subreddit}</title>
<style>
  body { margin: 0; font-family: sans-serif; }
  shreddit-post { display: block; height: 120px; border: 1px solid #ddd; margin: 8px; padding: 8px; }
</style>
</head>
<body>
<h1>r/${subreddit}</h1>
<div id="feed"></div>
<div id="spacer" style="height: 4000px"></div>
<script>
  var feed = document.getElementById('feed');
  function makePost(id) {
    var el = document.createElement('shreddit-post');
    el.setAttribute('id', 't3_' + id);
    el.setAttribute('permalink', '/r/${subreddit}/comments/' + id + '/post-' + id + '/');
    el.setAttribute('post-title', 'Post ' + id);
    el.setAttribute('subreddit-prefixed-name', 'r/${subreddit}');
    el.innerHTML = '<a href="/r/${subreddit}/comments/' + id + '/post-' + id + '/">open</a>';
    return el;
  }
  ['aaa1', 'bbb2', 'ccc3', 'ddd4', 'eee5'].forEach(function (id) { feed.appendChild(makePost(id)); });
  window.__moreLoaded = false;
  window.addEventListener('scroll', function () {
    if (window.__moreLoaded || window.scrollY < 50) return;
    window.__moreLoaded = true;
    setTimeout(function () {
      ['fff6', 'ggg7', 'hhh8', 'iii9'].forEach(function (id) { feed.appendChild(makePost(id)); });
    }, 250);
  });
</script>
</body>
</html>`;
}

function threadPage() {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Post aaa1 : r/testsub</title>
<style>shreddit-post, shreddit-comment { display: block; margin: 8px; }</style>
</head>
<body>
<h1>Post aaa1 discussion title</h1>
<shreddit-post id="t3_aaa1" permalink="/r/testsub/comments/aaa1/post-aaa1/" post-title="Post aaa1" subreddit-prefixed-name="r/testsub" author="user1" score="42" comment-count="2">
  <div slot="text-body">This is the body of post aaa1.</div>
</shreddit-post>
<shreddit-comment author="c1" score="7" thingid="t1_c1"><div slot="comment">First comment about the topic.</div></shreddit-comment>
<shreddit-comment author="c2" score="3" thingid="t1_c2"><div slot="comment">Second comment about the topic.</div></shreddit-comment>
<iframe src="/recaptcha/enterprise/anchor?k=test" style="width:256px;height:60px;visibility:hidden"></iframe>
</body>
</html>`;
}

function challengePage() {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Reddit - Please wait for verification</title></head>
<body>
<h1>Verify you are human</h1>
<iframe src="/hcaptcha/verify?sitekey=test" style="width:303px;height:78px"></iframe>
<p>Please complete the security check to continue.</p>
</body>
</html>`;
}

function homePage() {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>reddit</title></head>
<body>
<h1>reddit</h1>
<div id="home-feed"></div>
</body>
</html>`;
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://reddit.com');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (url.pathname === '/' || url.pathname === '') {
        res.end(homePage());
        return;
      }
      if (/^\/r\/([^/]+)\/comments\/aaa1(?:\/[^/]*)?\/?$/.test(url.pathname)) {
        res.end(threadPage());
        return;
      }
      if (/^\/r\/([^/]+)\/comments\/zzz9(?:\/[^/]*)?\/?$/.test(url.pathname)) {
        res.end(challengePage());
        return;
      }
      const listing = /^\/r\/([^/]+)\/(?:new|hot)\/?$/.exec(url.pathname);
      if (listing) {
        res.end(listingPage(listing[1]));
        return;
      }
      res.statusCode = 404;
      res.end('<h1>Not found</h1>');
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

let browser = null;
let server = null;
let baseHost = null;

before(async () => {
  if (!chromium) return;
  execSync('node build.mjs chrome', { cwd: EXT_DIR, stdio: 'ignore' });
  const started = await startServer();
  server = started.server;
  baseHost = 'reddit.com';
  browser = await chromium.launch({
    headless: true,
    args: ['--host-resolver-rules=MAP reddit.com 127.0.0.1:' + started.port + ',MAP www.reddit.com 127.0.0.1:' + started.port],
  });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

const CHROME_STUB = `
  window.__falborListeners = [];
  window.chrome = {
    runtime: {
      lastError: null,
      onMessage: {
        addListener(fn) { window.__falborListeners.push(fn); },
        removeListener(fn) { window.__falborListeners = window.__falborListeners.filter(function (f) { return f !== fn; }); },
      },
      sendMessage(message, callback) {
        const deliver = (response) => {
          if (typeof callback === 'function') {
            try { callback(response); } catch (_) {}
          }
        };
        let promise;
        try { promise = window.__falborBackground(message); } catch (_) { promise = Promise.resolve(null); }
        return promise.then(
          (response) => { deliver(response); return response; },
          () => { deliver(null); return null; },
        );
      },
    },
  };
  window.__falborTestNavigate = function (url) { window.__falborNavigatedTo = url; };
`;

async function openAgentPage(backend, path, options = {}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.exposeFunction('__falborBackground', (message) => backend.handle(message));
  await page.addInitScript(CHROME_STUB);
  if (options.realNavigate) {
    await page.addInitScript('window.__falborTestNavigate = function (url) { location.assign(url); };');
  }
  await page.goto('http://' + baseHost + path, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ path: CONTENT_CSS });
  await page.addScriptTag({ path: CONTENT_SCRIPT });
  return { context, page };
}

async function overlayField(page, field) {
  return page.textContent('#falbor-agent-overlay [data-field="' + field + '"]');
}

async function waitFor(predicate, timeoutMs = 8000, stepMs = 100) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  return false;
}

const skip = chromium ? false : 'playwright is not installed';

test('overlay renders live status and opening a discussion highlights, then navigates for real', { skip }, async () => {
  const backend = createMockBackend();
  backend.observeScript.push({
    action: 'inspect',
    reason: 'Opening “Post aaa1” in r/testsub to evaluate its relevance.',
    actionId: 'open:aaa1',
    target: { externalId: 'aaa1', url: THREAD_URL, subreddit: 'testsub', title: 'Post aaa1' },
  });
  const { context, page } = await openAgentPage(backend, '/r/testsub/new/');
  try {
    await page.waitForSelector('#falbor-agent-overlay', { timeout: 8000 });
    assert.equal(await overlayField(page, 'status'), 'running');
    assert.equal(await overlayField(page, 'connection'), 'connected');

    await page.waitForSelector('shreddit-post#t3_aaa1.falbor-agent-highlight', { timeout: 6000 });
    await page.waitForSelector('#falbor-agent-pointer.falbor-agent-pointer-visible', { timeout: 6000 });

    const navigated = await waitFor(async () => {
      const value = await page.evaluate(() => window.__falborNavigatedTo || null);
      return value === THREAD_URL;
    });
    assert.ok(navigated, 'the runner must navigate the real tab to the discussion URL');

    const pending = await page.evaluate(() => sessionStorage.getItem('falbor:agent.pending'));
    assert.ok(pending, 'a pending verification record must be stored before navigation');
    assert.equal(JSON.parse(pending).actionId, 'open:aaa1');
    assert.ok(
      backend.calls.observe.length >= 1 && backend.calls.observe[0].payload.kind === 'feed',
      'the listing must be observed before acting',
    );
    assert.equal(backend.reportOf('open_discussion'), null, 'opening may not be reported before it is verified');
  } finally {
    await context.close();
  }
});

test('scrolling executes in the page and reports a verified outcome', { skip }, async () => {
  const backend = createMockBackend();
  backend.observeScript.push({
    action: 'scroll_feed',
    reason: 'No new discussions are visible on screen; scrolling the listing.',
    actionId: 'feed:testsub:1:scroll:0',
  });
  const { context, page } = await openAgentPage(backend, '/r/testsub/new/');
  try {
    const scrolled = await waitFor(() => backend.reports('scroll_feed').length > 0, 10000);
    assert.ok(scrolled, 'the scroll action must be reported');
    const action = backend.reportOf('scroll_feed');
    assert.equal(action.status, 'completed');
    assert.equal(action.result.grew, true, 'growth must be verified from the real DOM');
    assert.ok(action.result.postsAfter > action.result.postsBefore, 'new posts must have rendered');

    const position = await page.evaluate(() => window.scrollY);
    assert.ok(position > 0, 'the real page must have scrolled');
    await page.waitForSelector('#falbor-agent-overlay', { timeout: 6000 });
    const lastAction = await overlayField(page, 'lastAction');
    assert.match(lastAction, /Scrolled/);
  } finally {
    await context.close();
  }
});

test('a freshly loaded discussion verifies the pending action before reporting completion', { skip }, async () => {
  const backend = createMockBackend();
  backend.observeScript.push({
    action: 'inspect',
    reason: 'Opening “Post aaa1”.',
    actionId: 'open:aaa1',
    target: { externalId: 'aaa1', url: THREAD_URL, subreddit: 'testsub', title: 'Post aaa1' },
  });
  backend.observeScript.push({ action: 'pause', reason: 'Never reached.' });
  const { context, page } = await openAgentPage(backend, '/r/testsub/new/', { realNavigate: true });
  try {
    await page.waitForURL('**/r/testsub/comments/aaa1/**', { timeout: 10000 });
    await page.addStyleTag({ path: CONTENT_CSS });
    await page.addScriptTag({ path: CONTENT_SCRIPT });

    const verified = await waitFor(() => {
      const action = backend.reportOf('open_discussion');
      return !!action && action.status === 'completed';
    }, 10000);
    assert.ok(verified, 'opening must be reported completed only after the page is verified');
    const action = backend.reportOf('open_discussion');
    assert.equal(action.idempotencyKey, 'open:aaa1');
    assert.ok(action.result && action.result.verifiedAt, 'the report must include verification evidence');

    const pending = await page.evaluate(() => sessionStorage.getItem('falbor:agent.pending'));
    assert.equal(pending, null, 'the pending record must be consumed after verification');
    const inspected = await waitFor(async () => (await overlayField(page, 'inspected')) === '1');
    assert.ok(inspected, 'the inspected counter must reflect the verified action');
    const observedThread = await waitFor(() => backend.calls.observe.some((call) => call.payload.kind === 'thread'));
    assert.ok(observedThread, 'the discussion must be observed after verification');
    const threadCall = backend.calls.observe.find((call) => call.payload.kind === 'thread');
    assert.equal(
      threadCall.payload.thread.flags.verificationRequired,
      false,
      "Reddit's invisible reCAPTCHA frame must not be treated as a human-verification challenge",
    );
  } finally {
    await context.close();
  }
});

test('a real human-verification challenge is flagged in the thread observation', { skip }, async () => {
  const backend = createMockBackend();
  backend.observeScript.push({ action: 'pause', reason: 'Verification required.' });
  const { context, page } = await openAgentPage(backend, '/r/testsub/comments/zzz9/post-zzz9/');
  try {
    const observed = await waitFor(
      () => backend.calls.observe.some((call) => call.payload.kind === 'thread'),
      8000,
    );
    assert.ok(observed, 'the discussion page must still be observed');
    const call = backend.calls.observe.find((call) => call.payload.kind === 'thread');
    assert.equal(
      call.payload.thread.flags.verificationRequired,
      true,
      'a visible challenge widget with challenge text must flag verification',
    );
  } finally {
    await context.close();
  }
});

test('starting on the reddit home feed opens the scoped listing and keeps running', { skip }, async () => {
  const backend = createMockBackend();
  const { context, page } = await openAgentPage(backend, '/', { realNavigate: true });
  try {
    await page.waitForURL('**/r/testsub/new/**', { timeout: 10000 });
    await page.addStyleTag({ path: CONTENT_CSS });
    await page.addScriptTag({ path: CONTENT_SCRIPT });
    const observed = await waitFor(
      () => backend.calls.observe.some((call) => call.payload.kind === 'feed'),
      10000,
    );
    assert.ok(observed, 'the scoped listing must be observed after the bootstrap navigation');
    assert.equal(
      backend.calls.control.filter((call) => call.action === 'pause').length,
      0,
      'the bootstrap navigation must not pause the session',
    );
  } finally {
    await context.close();
  }
});

test('pause and stop from the overlay control the same session and stop wins', { skip }, async () => {
  const backend = createMockBackend();
  backend.observeScript.push({ action: 'scroll_feed', reason: 'scrolling', actionId: 'feed:testsub:1:scroll:0' });
  const { context, page } = await openAgentPage(backend, '/r/testsub/new/');
  try {
    await page.waitForSelector('#falbor-agent-pause', { timeout: 8000 });
    await page.click('#falbor-agent-pause');
    assert.ok(await waitFor(() => backend.calls.control.some((c) => c.action === 'pause')), 'pause must reach the session');
    await waitFor(async () => (await overlayField(page, 'status')) === 'paused');
    assert.equal(await overlayField(page, 'status'), 'paused');

    backend.session = { ...backend.session, status: 'running' };
    await page.evaluate((session) => {
      for (const fn of window.__falborListeners || []) {
        try { fn({ type: 'falbor:agent-wake', payload: { session } }, {}, () => {}); } catch (_) {}
      }
    }, clone(backend.session));
    const observedAgain = await waitFor(() => backend.calls.observe.length >= 1, 8000);
    assert.ok(observedAgain, 'a wake must resume the loop in the page');

    await page.click('#falbor-agent-stop');
    assert.ok(await waitFor(() => backend.calls.control.some((c) => c.action === 'stop')), 'stop must reach the session');
    await waitFor(async () => (await overlayField(page, 'status')) === 'stopped');
    const before = backend.calls.observe.length;
    await new Promise((resolve) => setTimeout(resolve, 2500));
    assert.equal(backend.calls.observe.length, before, 'no further steps may run after stop');
  } finally {
    await context.close();
  }
});

test('a stale session response surfaces an error and refreshes the revision', { skip }, async () => {
  const backend = createMockBackend();
  backend.observeScript.push({
    reject: {
      status: 409,
      error: 'This observation is based on an outdated session state.',
      session: { ...backend.session, revision: 5 },
    },
  });
  backend.observeScript.push({ action: 'pause', reason: 'Done after refresh.' });
  const { context, page } = await openAgentPage(backend, '/r/testsub/new/');
  try {
    await page.waitForSelector('#falbor-agent-overlay', { timeout: 8000 });
    const sawError = await waitFor(async () => {
      const error = await overlayField(page, 'error');
      return /changed/i.test(error || '');
    }, 8000);
    assert.ok(sawError, 'a stale response must be visible on the overlay');
    const refreshed = await waitFor(() => backend.calls.observe.length >= 2, 10000);
    assert.ok(refreshed, 'the loop must retry with the refreshed session');
    assert.equal(backend.calls.observe[1].payload.revision, 5, 'the retry must use the new revision');
  } finally {
    await context.close();
  }
});

test('backend failures are visible and clear after recovery', { skip }, async () => {
  const backend = createMockBackend();
  backend.observeScript.push({ reject: { status: 0, error: 'The backend is unreachable.' } });
  backend.observeScript.push({ action: 'pause', reason: 'Recovered.' });
  const { context, page } = await openAgentPage(backend, '/r/testsub/new/');
  try {
    const sawError = await waitFor(async () => {
      const error = await overlayField(page, 'error');
      return /unreachable|rejected/i.test(error || '');
    }, 8000);
    assert.ok(sawError, 'a backend failure must be visible');
    const cleared = await waitFor(async () => {
      if (backend.calls.observe.length < 2) return false;
      const hidden = await page.evaluate(() => {
        const node = document.querySelector('#falbor-agent-overlay [data-field="error"]');
        return !node || node.hidden || node.textContent === '';
      });
      return hidden;
    }, 12000);
    assert.ok(cleared, 'the error must clear after a successful step');
  } finally {
    await context.close();
  }
});

test('duplicate prevention: only one observation is in flight per step', { skip }, async () => {
  const backend = createMockBackend();
  backend.observeDelayMs = 700;
  backend.observeScript.push({ action: 'scroll_feed', reason: 'scrolling', actionId: 'feed:testsub:1:scroll:0' });
  const { context, page } = await openAgentPage(backend, '/r/testsub/new/');
  try {
    await page.waitForSelector('#falbor-agent-overlay', { timeout: 8000 });
    const started = await waitFor(() => backend.calls.observe.length >= 1, 8000);
    assert.ok(started, 'the first observation must start');
    await new Promise((resolve) => setTimeout(resolve, 1600));
    assert.equal(backend.calls.observe.length, 1, 'no overlapping observations may start');
  } finally {
    await context.close();
  }
});
