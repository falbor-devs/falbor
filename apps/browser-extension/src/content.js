// Falbor Automation content script for reddit.com.
//
// It never clicks any submit button. It only prefills the Reddit comment
// editor with the exact approved text and observes the page to report what
// actually happened. Concatenated with src/lib/text.js at build time.

(function () {
  if (window.__falborContentActive) return;
  window.__falborContentActive = true;

  const runtime =
    typeof browser !== 'undefined' && browser && browser.runtime ? browser : chrome;

  // Central selector list. Reddit changes markup often; keep everything here.
  const SELECTORS = {
    // Comment editors, in priority order (new shreddit composer first).
    editorShreddit: 'shreddit-composer textarea',
    editorPlaceholder: 'textarea[placeholder*="comment" i]',
    editorContenteditable: 'div[contenteditable="true"][role="textbox"]',
    editorLegacy: 'textarea[name="text"]',
    // Rendered comment nodes (new and legacy markup).
    commentNodes: 'shreddit-comment, div[data-testid="comment"]',
    // Timestamp links inside a comment point at the comment permalink.
    commentTimestampLink: 'a[data-testid="comment_timestamp"]',
    // Login / blocked-state detection.
    loginForm:
      'faceplate-form[action*="login"], form[action*="login"], input[name="username"][autocomplete="username"]',
    // Reddit error banners near the editor.
    errorAlerts: 'faceplate-banner[type="error"], shreddit-error-banner, [role="alert"]',
  };

  const EDITOR_TIMEOUT_MS = 15000;
  const EDITOR_RETRY_INTERVAL_MS = 500;
  const RESULT_TIMEOUT_MS = 10 * 60 * 1000;
  const RESULT_CHECK_INTERVAL_MS = 2000;
  // Containment matching is only safe for bodies this long; shorter comments
  // must match a whole comment's text exactly to avoid false positives.
  const MIN_CONTAINMENT_MATCH_LENGTH = 40;

  const REDDIT_ERROR_PATTERNS = [
    /you are doing that too much/i,
    /something went wrong/i,
    /try that again/i,
    /rate limit/i,
    /unable to comment/i,
    /error occurred/i,
    /comments? (are|is) locked/i,
    /this community does not allow/i,
  ];

  let activeTask = null;
  let cancelled = false;
  let observer = null;
  let checkTimer = null;
  let initialAlerts = new Set();

  let bannerEl = null;
  let bannerMetaEl = null;
  let bannerStatusEl = null;
  let bannerCancelBtn = null;
  let bannerDismissBtn = null;
  let bannerRemoveTimer = null;

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function safeMessage(err) {
    const text = err && err.message ? err.message : String(err);
    return text.slice(0, 300);
  }

  function sendToBackground(message) {
    try {
      const result = runtime.runtime.sendMessage(message);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (_) {
      // The background worker may be restarting; results are best-effort here
      // and the background reconciles from its persisted task state.
    }
  }

  function checkThread(payload) {
    const match = /\/r\/([^/]+)\/comments\/([a-z0-9]+)/i.exec(location.pathname);
    if (!match) {
      return { ok: false, reason: 'This Reddit tab does not show a discussion page.' };
    }
    const currentSub = match[1].toLowerCase();
    const currentId = match[2].toLowerCase();
    const expectedFromUrl = /\/r\/([^/]+)\/comments\/([a-z0-9]+)/i.exec(String(payload.threadUrl || ''));
    const expectedId = String(payload.threadExternalId || '')
      .replace(/^t3_/i, '')
      .toLowerCase();
    const urlId = expectedFromUrl ? expectedFromUrl[2].toLowerCase() : '';
    const idToCheck = expectedId || urlId;
    const expectedSub = String(payload.subreddit || (expectedFromUrl ? expectedFromUrl[1] : ''))
      .replace(/^r\//i, '')
      .toLowerCase();
    if (idToCheck && currentId !== idToCheck) {
      return { ok: false, reason: 'The open Reddit tab does not match the requested discussion.' };
    }
    if (expectedSub && currentSub !== expectedSub) {
      return { ok: false, reason: 'The open Reddit tab does not match the requested discussion.' };
    }
    return { ok: true };
  }

  function isUsableEditor(el) {
    if (!el || !el.isConnected) return false;
    if (el.disabled) return false;
    if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;
    try {
      if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) return false;
    } catch (_) {
      // Keep going; visibility check is best-effort.
    }
    return true;
  }

  function findEditor() {
    const selectors = [
      SELECTORS.editorShreddit,
      SELECTORS.editorPlaceholder,
      SELECTORS.editorContenteditable,
      SELECTORS.editorLegacy,
    ];
    for (const selector of selectors) {
      let nodes = [];
      try {
        nodes = Array.from(document.querySelectorAll(selector));
      } catch (_) {
        nodes = [];
      }
      for (const node of nodes) {
        if (isUsableEditor(node)) return node;
      }
    }
    return null;
  }

  function waitForEditor(timeoutMs) {
    return new Promise((resolve) => {
      const existing = findEditor();
      if (existing) {
        resolve(existing);
        return;
      }
      let finished = false;
      let mutationObserver = null;
      let intervalId = null;
      let timeoutId = null;
      const finish = (el) => {
        if (finished) return;
        finished = true;
        if (mutationObserver) mutationObserver.disconnect();
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
        resolve(el);
      };
      try {
        const root = document.documentElement || document.body;
        if (root && typeof MutationObserver === 'function') {
          mutationObserver = new MutationObserver(() => {
            if (cancelled) {
              finish(null);
              return;
            }
            const el = findEditor();
            if (el) finish(el);
          });
          mutationObserver.observe(root, { childList: true, subtree: true });
        }
      } catch (_) {
        mutationObserver = null;
      }
      intervalId = setInterval(() => {
        if (cancelled) {
          finish(null);
          return;
        }
        const el = findEditor();
        if (el) finish(el);
      }, EDITOR_RETRY_INTERVAL_MS);
      timeoutId = setTimeout(() => finish(null), timeoutMs);
    });
  }

  function dispatchInput(el, value) {
    let event = null;
    try {
      event = new InputEvent('input', {
        bubbles: true,
        cancelable: false,
        inputType: 'insertText',
        data: value,
      });
    } catch (_) {
      event = new Event('input', { bubbles: true });
    }
    el.dispatchEvent(event);
  }

  function setEditorText(editor, body) {
    const tag = editor.tagName ? editor.tagName.toUpperCase() : '';
    if (tag === 'TEXTAREA' || tag === 'INPUT') {
      // React/Reddit track the native value setter, so use it directly.
      const proto =
        tag === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      if (descriptor && descriptor.set) descriptor.set.call(editor, body);
      else editor.value = body;
      dispatchInput(editor, body);
      editor.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    if (editor.isContentEditable || editor.getAttribute('contenteditable') === 'true') {
      try {
        editor.focus();
      } catch (_) {
        // Focus may fail for offscreen elements; execCommand still usually works.
      }
      let selected = false;
      try {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          const range = document.createRange();
          range.selectNodeContents(editor);
          selection.addRange(range);
          selected = true;
        }
      } catch (_) {
        selected = false;
      }
      let inserted = false;
      if (selected && typeof document.execCommand === 'function') {
        try {
          inserted = document.execCommand('insertText', false, body);
        } catch (_) {
          inserted = false;
        }
      }
      if (!inserted || normalizeText(editor.innerText || editor.textContent) !== normalizeText(body)) {
        editor.textContent = body;
        dispatchInput(editor, body);
      }
      return;
    }
    throw new Error('Unsupported editor element: ' + tag);
  }

  function readEditorText(editor) {
    const tag = editor.tagName ? editor.tagName.toUpperCase() : '';
    if (tag === 'TEXTAREA' || tag === 'INPUT') return editor.value || '';
    return editor.innerText || editor.textContent || '';
  }

  async function fillEditor(editor, body) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        setEditorText(editor, body);
      } catch (_) {
        // Retry below; a second attempt may still succeed.
      }
      await delay(150);
      if (normalizeText(readEditorText(editor)) === normalizeText(body)) return true;
    }
    return false;
  }

  function detectBlockedReason() {
    try {
      if (document.querySelector(SELECTORS.loginForm)) {
        return 'You are not signed in to Reddit in this browser.';
      }
    } catch (_) {
      // Selector engine failure falls through to the generic reason.
    }
    const pageText = normalizeText(document.body ? document.body.innerText || '' : '');
    if (/comments are locked|commenting is locked/.test(pageText)) {
      return 'Comments are locked on this Reddit discussion.';
    }
    if (/comments are archived|post is archived|comments are closed/.test(pageText)) {
      return 'This Reddit discussion is archived and can no longer be commented on.';
    }
    if (/page not found|community not found|we couldn't find/.test(pageText)) {
      return 'The Reddit discussion could not be loaded (the page reports that it does not exist).';
    }
    if (/sorry, you need to log in|you need to log in to continue/.test(pageText)) {
      return 'You are not signed in to Reddit in this browser.';
    }
    return 'The Reddit comment editor was not found. Reddit may have changed its page layout, or the page did not load fully.';
  }

  function removeBanner() {
    if (bannerRemoveTimer) {
      clearTimeout(bannerRemoveTimer);
      bannerRemoveTimer = null;
    }
    if (bannerEl) {
      try {
        bannerEl.remove();
      } catch (_) {
        // Already detached.
      }
    }
    bannerEl = null;
    bannerMetaEl = null;
    bannerStatusEl = null;
    bannerCancelBtn = null;
    bannerDismissBtn = null;
  }

  function ensureBanner() {
    if (bannerEl && bannerEl.isConnected) return bannerEl;
    bannerEl = document.createElement('div');
    bannerEl.id = 'falbor-automation-banner';
    bannerEl.setAttribute('role', 'dialog');
    bannerEl.setAttribute('aria-label', 'Falbor Automation');

    const header = document.createElement('div');
    header.className = 'falbor-banner-header';
    const dot = document.createElement('span');
    dot.className = 'falbor-banner-dot';
    const title = document.createElement('span');
    title.className = 'falbor-banner-title';
    title.textContent = 'Falbor Automation';
    header.appendChild(dot);
    header.appendChild(title);

    bannerMetaEl = document.createElement('div');
    bannerMetaEl.className = 'falbor-banner-meta';

    const instructions = document.createElement('div');
    instructions.className = 'falbor-banner-instructions';
    instructions.textContent =
      "Review the comment, then click Reddit's Comment button yourself. Falbor will detect the result.";

    bannerStatusEl = document.createElement('div');
    bannerStatusEl.className = 'falbor-banner-status';

    const actions = document.createElement('div');
    actions.className = 'falbor-banner-actions';
    bannerCancelBtn = document.createElement('button');
    bannerCancelBtn.type = 'button';
    bannerCancelBtn.className = 'falbor-banner-button falbor-banner-danger';
    bannerCancelBtn.textContent = 'Cancel';
    bannerCancelBtn.addEventListener('click', () => {
      sendToBackground({ type: 'falbor:cancel-requested' });
      setBannerStatus('Cancelling...', 'info');
    });
    bannerDismissBtn = document.createElement('button');
    bannerDismissBtn.type = 'button';
    bannerDismissBtn.className = 'falbor-banner-button';
    bannerDismissBtn.textContent = 'Dismiss';
    bannerDismissBtn.addEventListener('click', () => removeBanner());
    actions.appendChild(bannerCancelBtn);
    actions.appendChild(bannerDismissBtn);

    bannerEl.appendChild(header);
    bannerEl.appendChild(bannerMetaEl);
    bannerEl.appendChild(instructions);
    bannerEl.appendChild(bannerStatusEl);
    bannerEl.appendChild(actions);
    const host = document.body || document.documentElement;
    if (host) host.appendChild(bannerEl);
    return bannerEl;
  }

  function setBannerStatus(text, kind) {
    if (!bannerStatusEl) return;
    bannerStatusEl.textContent = text || '';
    bannerStatusEl.className = 'falbor-banner-status falbor-status-' + (kind || 'info');
  }

  function showBanner(payload, kind, message) {
    ensureBanner();
    if (bannerMetaEl) {
      const parts = [];
      if (payload.subreddit) parts.push('r/' + String(payload.subreddit).replace(/^r\//i, ''));
      if (payload.title) parts.push(String(payload.title).slice(0, 120));
      bannerMetaEl.textContent = parts.join(' - ');
    }
    setBannerStatus(message, kind);
    const active = !!activeTask;
    bannerCancelBtn.style.display = active ? '' : 'none';
    bannerDismissBtn.style.display = active ? 'none' : '';
  }

  function stopObservation() {
    if (observer) {
      try {
        observer.disconnect();
      } catch (_) {
        // Already disconnected.
      }
      observer = null;
    }
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
  }

  function teardown() {
    cancelled = true;
    stopObservation();
    const hadTask = !!activeTask;
    activeTask = null;
    initialAlerts = new Set();
    if (hadTask && bannerEl) {
      setBannerStatus('Cancelled.', 'warning');
      if (bannerCancelBtn) bannerCancelBtn.style.display = 'none';
      if (bannerDismissBtn) bannerDismissBtn.style.display = '';
      bannerRemoveTimer = setTimeout(() => removeBanner(), 5000);
    }
  }

  function detectRedditError() {
    let nodes = [];
    try {
      nodes = Array.from(document.querySelectorAll(SELECTORS.errorAlerts));
    } catch (_) {
      nodes = [];
    }
    for (const node of nodes) {
      if (initialAlerts.has(node)) continue;
      const text = collapseWhitespace(node.innerText || node.textContent || '');
      if (!text) continue;
      let matched = false;
      for (const pattern of REDDIT_ERROR_PATTERNS) {
        if (pattern.test(text)) {
          matched = true;
          break;
        }
      }
      if (!matched) continue;
      return 'Reddit reported an error: ' + text.slice(0, 400);
    }
    return null;
  }

  function extractThingId(node) {
    try {
      const holder = node.closest ? node.closest('shreddit-comment') : null;
      const el = holder || node;
      const raw = String(
        (el.getAttribute && (el.getAttribute('thingid') || el.getAttribute('thingId'))) || el.id || '',
      );
      const match = /t1_[a-z0-9]+/i.exec(raw);
      if (match) return match[0];
    } catch (_) {
      // Malformed node; fall through.
    }
    return null;
  }

  function absolutize(href) {
    try {
      return new URL(href, location.origin).href;
    } catch (_) {
      return href;
    }
  }

  function extractPermalink(node) {
    try {
      const comment = node.closest ? node.closest('shreddit-comment') || node : node;
      const attr = comment.getAttribute ? comment.getAttribute('permalink') : null;
      if (attr) return absolutize(attr);
      if (comment.querySelector) {
        const link = comment.querySelector(
          SELECTORS.commentTimestampLink + ', a[href*="/comments/"][href*="/comment/"]',
        );
        if (link && link.href) return link.href;
      }
    } catch (_) {
      // Permalink extraction is optional; the backend verifies via Reddit later.
    }
    return null;
  }

  function findMatchingComment(needle) {
    let nodes = [];
    try {
      nodes = Array.from(document.querySelectorAll(SELECTORS.commentNodes));
    } catch (_) {
      return null;
    }
    const useContainment = needle.length >= MIN_CONTAINMENT_MATCH_LENGTH;
    for (const node of nodes) {
      const raw = node.innerText || node.textContent || '';
      const text = normalizeText(raw);
      if (!text) continue;
      const matches = useContainment ? text.indexOf(needle) !== -1 : text === needle;
      if (!matches) continue;
      return {
        text: collapseWhitespace(raw),
        externalId: extractThingId(node),
        url: extractPermalink(node),
      };
    }
    return null;
  }

  function settle(task, result) {
    if (cancelled || !activeTask || activeTask !== task) return;
    activeTask = null;
    cancelled = true;
    stopObservation();
    initialAlerts = new Set();
    if (bannerCancelBtn) bannerCancelBtn.style.display = 'none';
    if (bannerDismissBtn) bannerDismissBtn.style.display = '';
    if (result.status === 'submitted_observed') {
      setBannerStatus('Comment detected. Reporting the result to Falbor...', 'success');
      bannerRemoveTimer = setTimeout(() => {
        if (!activeTask) removeBanner();
      }, 60000);
    } else if (result.status === 'outcome_unknown') {
      setBannerStatus(
        'Could not confirm the outcome of this comment. Falbor will not retry automatically. ' +
          (result.error || ''),
        'warning',
      );
    } else {
      setBannerStatus('Failed: ' + (result.error || 'unknown error'), 'error');
    }
    sendToBackground({ type: 'falbor:result', taskId: task.taskId, result });
  }

  function startObservation(payload, body) {
    const needle = normalizeText(body);
    const startedAt = Date.now();
    try {
      initialAlerts = new Set(document.querySelectorAll(SELECTORS.errorAlerts));
    } catch (_) {
      initialAlerts = new Set();
    }
    const task = activeTask;

    const check = () => {
      if (cancelled || !activeTask || activeTask !== task) return;
      if (!checkThread(activeTask).ok) {
        settle(task, {
          status: 'outcome_unknown',
          error: 'The page navigated away from the requested discussion before an outcome could be confirmed.',
        });
        return;
      }
      const errorText = detectRedditError();
      if (errorText) {
        settle(task, { status: 'failed', error: errorText.slice(0, 500) });
        return;
      }
      const found = findMatchingComment(needle);
      if (found) {
        const result = {
          status: 'submitted_observed',
          observedText: found.text.slice(0, 2000),
        };
        if (found.externalId) result.externalId = found.externalId;
        if (found.url) result.url = found.url;
        settle(task, result);
        return;
      }
      if (Date.now() - startedAt > RESULT_TIMEOUT_MS) {
        settle(task, {
          status: 'outcome_unknown',
          error: 'Timed out after 10 minutes without detecting the submitted comment.',
        });
      }
    };

    try {
      if (typeof MutationObserver === 'function') {
        observer = new MutationObserver(check);
        const root = document.body || document.documentElement;
        if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
      }
    } catch (_) {
      observer = null;
    }
    checkTimer = setInterval(check, RESULT_CHECK_INTERVAL_MS);
    setTimeout(check, 500);
  }

  async function handleFill(payload) {
    teardown();
    cancelled = false;
    const body = typeof payload.body === 'string' ? payload.body : '';
    if (!body.trim()) {
      return { ok: false, result: { status: 'failed', error: 'The approved comment text is empty.' } };
    }

    const thread = checkThread(payload);
    if (!thread.ok) {
      return { ok: false, result: { status: 'failed', error: thread.reason } };
    }

    const editor = await waitForEditor(EDITOR_TIMEOUT_MS);
    if (cancelled) {
      return { ok: false, result: { status: 'cancelled_by_user' } };
    }
    if (!editor) {
      const reason = detectBlockedReason();
      showBanner(payload, 'error', reason);
      return { ok: false, result: { status: 'failed', error: reason } };
    }

    const filled = await fillEditor(editor, body);
    if (!filled) {
      const reason =
        'Could not fill the Reddit editor reliably. The editor content did not match the approved comment.';
      showBanner(payload, 'error', reason);
      return { ok: false, result: { status: 'failed', error: reason } };
    }

    activeTask = {
      taskId: payload.taskId || null,
      draftId: payload.draftId || null,
      body,
      threadUrl: payload.threadUrl,
      threadExternalId: payload.threadExternalId,
      subreddit: payload.subreddit,
    };
    showBanner(payload, 'waiting', 'Waiting for you to review and click Reddit\'s Comment button...');
    startObservation(payload, body);
    sendToBackground({
      type: 'falbor:progress',
      taskId: payload.taskId,
      message: "The approved comment is prefilled. Review it, then click Reddit's Comment button yourself.",
    });
    return { ok: true };
  }

  // --- Autonomous agent runner ---------------------------------------------
  //
  // The runner lives in the page (not the service worker) so it survives MV3
  // suspension and keeps the observe→decide→act→verify loop alive as long as
  // the Reddit tab exists. The backend owns decisions and limits; the
  // background coordinator owns tab binding and API access. Every action is
  // verified against the real page before it is reported, and requested
  // actions are only marked completed after the resulting page state is
  // observed.

  const AGENT_POLL_MS = 4000;
  const AGENT_ACTION_GAP_MS = 2200;
  const AGENT_HIGHLIGHT_MS = 900;
  const AGENT_BACKEND_RETRY_MS = 10000;
  const AGENT_BACKEND_RETRY_MAX_MS = 30000;
  const AGENT_SESSION_FRESHNESS_MS = 4000;
  const AGENT_PENDING_STALE_MS = 10000;
  const AGENT_OVERLAY_HIDE_MS = 15000;

  const AGENT_STORE_PENDING = 'falbor:agent.pending';
  const AGENT_STORE_LISTING = 'falbor:agent.listing';
  const AGENT_STORE_SCAN = 'falbor:agent.scan';
  const AGENT_STORE_NAV = 'falbor:agent.nav';

  const agentState = {
    active: false,
    inFlight: false,
    session: null,
    lastAction: null,
    currentDiscussion: null,
    statusMessage: null,
    error: null,
    backendDown: false,
    backoffMs: 0,
    overlayHideTimer: null,
  };

  function agentSessionStoreGet(key) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function agentSessionStoreSet(key, value) {
    try {
      if (value == null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      // Persistence is best-effort; the loop self-corrects.
    }
  }

  function agentAsk(message) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value || null);
      };
      const timer = setTimeout(() => finish(null), 60000);
      try {
        const result = runtime.runtime.sendMessage(message, (response) => {
          clearTimeout(timer);
          const lastError = runtime.runtime.lastError;
          finish(lastError ? null : response);
        });
        if (result && typeof result.then === 'function') {
          result.then(
            (response) => {
              clearTimeout(timer);
              finish(response);
            },
            () => {
              clearTimeout(timer);
              finish(null);
            },
          );
        }
      } catch (_) {
        clearTimeout(timer);
        finish(null);
      }
    });
  }

  function agentNextBackoff() {
    agentState.backoffMs = agentState.backoffMs
      ? Math.min(agentState.backoffMs * 2, AGENT_BACKEND_RETRY_MAX_MS)
      : AGENT_BACKEND_RETRY_MS;
    return agentState.backoffMs;
  }

  function agentScheduleOverlayHide() {
    if (agentState.overlayHideTimer) clearTimeout(agentState.overlayHideTimer);
    agentState.overlayHideTimer = setTimeout(() => {
      agentState.overlayHideTimer = null;
      if (!agentState.active) agentOverlayRemove();
    }, AGENT_OVERLAY_HIDE_MS);
  }

  function agentRenderOverlay() {
    const session = agentState.session;
    if (!session || !session.id) {
      agentOverlayRemove();
      return;
    }
    if (agentState.overlayHideTimer && agentState.active) {
      clearTimeout(agentState.overlayHideTimer);
      agentState.overlayHideTimer = null;
    }
    const counters = session.counters || {};
    agentOverlayRender({
      status: session.status || (agentState.active ? 'running' : 'idle'),
      connected: !agentState.backendDown,
      activity: agentState.statusMessage || session.currentActivity || 'Waiting for instructions',
      discussion: agentState.currentDiscussion || null,
      lastAction: agentState.lastAction || null,
      inspected: counters.inspected || 0,
      opportunities: counters.relevantFound || 0,
      error: agentState.error || session.lastError || null,
    });
  }

  function agentSetStatusMessage(message) {
    agentState.statusMessage = message || null;
    agentRenderOverlay();
  }

  function agentRunnerStop(reason) {
    agentState.active = false;
    if (reason) agentState.statusMessage = reason;
    if (!agentState.session || !agentState.session.id) {
      agentOverlayRemove();
      return;
    }
    const status = agentState.session.status;
    if (status === 'stopped' || status === 'completed' || status === 'error') {
      agentScheduleOverlayHide();
    }
    agentRenderOverlay();
  }

  function agentNavigateTo(url) {
    try {
      if (typeof window.__falborTestNavigate === 'function') {
        window.__falborTestNavigate(url);
        return true;
      }
      location.assign(url);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function agentReportActions(actions) {
    const session = agentState.session;
    if (!session || !session.id) return null;
    const response = await agentAsk({
      type: 'falbor:agent-action-report',
      body: {
        sessionId: session.id,
        revision: session.revision,
        tab: { url: location.href, title: document.title || undefined },
        actions,
      },
    });
    if (!response) {
      agentState.backendDown = true;
      agentState.error = 'The Falbor backend could not be reached while reporting an action.';
      agentRenderOverlay();
      return null;
    }
    agentState.backendDown = false;
    if (response.session) agentState.session = response.session;
    if (response.status === 409) {
      agentState.error = 'The session changed while reporting; refreshing.';
      agentRenderOverlay();
      return response;
    }
    if (response.ok !== true) {
      agentState.error = response.error || 'The action report was rejected.';
      agentRenderOverlay();
      return response;
    }
    agentState.error = null;
    agentRenderOverlay();
    return response;
  }

  async function agentRunnerControl(action) {
    agentSetStatusMessage(action === 'pause' ? 'Pausing\u2026' : 'Stopping\u2026');
    const response = await agentAsk({ type: 'falbor:agent-control', action });
    if (!response || response.ok !== true) {
      agentState.error = (response && response.error) || 'The control request failed.';
      agentRenderOverlay();
      return null;
    }
    if (response.session) agentState.session = response.session;
    agentState.error = null;
    agentState.active = false;
    agentState.statusMessage = null;
    if (agentState.session && agentState.session.status === 'running') {
      agentRunnerStart();
    } else if (agentState.session && (agentState.session.status === 'stopped' || agentState.session.status === 'completed')) {
      agentScheduleOverlayHide();
    }
    agentRenderOverlay();
    return response;
  }

  function agentBeginPending(pending) {
    pending.createdAt = Date.now();
    pending.fromUrl = location.href;
    agentSessionStoreSet(AGENT_STORE_PENDING, pending);
  }

  async function agentVerifyPending() {
    const pending = agentSessionStoreGet(AGENT_STORE_PENDING);
    if (!pending) return true;
    agentSessionStoreSet(AGENT_STORE_PENDING, null);

    if (pending.kind === 'thread') {
      const ready = await waitForThreadReady(15000);
      const match = REDDIT_THREAD_PATTERN.exec(location.pathname || '');
      const currentId = match ? match[2].toLowerCase() : null;
      const ok = ready && currentId === pending.targetId;
      agentState.lastAction = ok ? 'Opened the discussion (verified)' : 'Opening the discussion failed';
      if (pending.actionId) {
        await agentReportActions([
          {
            kind: 'open_discussion',
            status: ok ? 'completed' : 'failed',
            idempotencyKey: pending.actionId,
            error: ok ? undefined : 'The discussion page did not open (the tab shows a different page).',
            result: {
              verifiedAt: Date.now(),
              url: location.href,
              title: threadTitleFromPage() || undefined,
            },
          },
        ]);
      }
      if (!ok) agentState.error = 'Opening the discussion could not be verified.';
      agentRenderOverlay();
      return ok;
    }

    const waitMs = Math.max(0, 1200 - (Date.now() - (pending.createdAt || Date.now())));
    if (waitMs) await delay(waitMs);
    const context = redditListingContext();
    const expected = subredditFromValue(pending.subreddit || (/\/r\/([^/]+)/i.exec(String(pending.url || '')) || [])[1]);
    const ok = context.isListing && (!expected || context.subreddit === expected);
    agentState.lastAction = ok ? 'Back on the listing (verified)' : 'Returning to the listing failed';
    if (pending.actionId) {
      await agentReportActions([
        {
          kind: pending.actionKind || 'return_to_feed',
          status: ok ? 'completed' : 'failed',
          idempotencyKey: pending.actionId,
          error: ok ? undefined : 'The listing page did not load as expected.',
          result: { verifiedAt: Date.now(), url: location.href },
        },
      ]);
    }
    if (!ok) agentState.error = 'Returning to the listing could not be verified.';
    agentRenderOverlay();
    return ok;
  }

  async function agentResolveStalePending() {
    const pending = agentSessionStoreGet(AGENT_STORE_PENDING);
    if (!pending) return;
    if (Date.now() - (pending.createdAt || 0) < AGENT_PENDING_STALE_MS) return;
    await agentVerifyPending();
  }

  async function agentDoOpenDiscussion(decision) {
    const target = decision.target || {};
    const targetId = String(target.externalId || '').replace(/^t3_/i, '').toLowerCase();
    const url = String(target.url || '');
    const actionId = decision.actionId || (targetId ? 'open:' + targetId : null);
    if (!targetId || !url || !actionId) {
      await agentReportActions([
        {
          kind: 'open_discussion',
          status: 'failed',
          idempotencyKey: actionId || 'open:invalid:' + Date.now().toString(36),
          error: 'The requested discussion target was invalid.',
        },
      ]);
      return;
    }

    const node = findPostElementById(targetId);
    if (!node) {
      agentState.error = 'The target discussion is not on screen; re-reading the listing.';
      agentRenderOverlay();
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (_) {
        // Scrolling to the top is best-effort.
      }
      await delay(1000);
      return;
    }

    agentState.currentDiscussion = target.title || targetId;
    agentSetStatusMessage('Opening \u201c' + String(target.title || targetId).slice(0, 80) + '\u201d\u2026');
    agentHighlight(node);
    agentPointerTo(node);
    try {
      node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (_) {
      // Scrolling the element into view is best-effort.
    }
    agentState.lastAction = 'Opening a discussion';
    agentRenderOverlay();
    await delay(AGENT_HIGHLIGHT_MS);
    agentPointerHide();
    agentClearHighlights();

    const check = await agentAsk({ type: 'falbor:agent-session', maxAgeMs: AGENT_SESSION_FRESHNESS_MS });
    if (!check || check.ok !== true) {
      agentState.backendDown = true;
      agentState.error = 'The Falbor backend could not be reached before opening the discussion.';
      agentRenderOverlay();
      return;
    }
    agentState.backendDown = false;
    const latest = check.session || agentState.session;
    if (latest && (latest.status !== 'running' || latest.stopRequested)) {
      agentState.session = latest;
      agentRunnerStop('Stopped before opening the discussion.');
      return;
    }

    agentBeginPending({
      kind: 'thread',
      actionId,
      targetId,
      subreddit: target.subreddit || null,
      url,
      title: target.title || null,
    });
    agentSetStatusMessage('Navigating to the discussion\u2026');
    if (!agentNavigateTo(url)) {
      agentSessionStoreSet(AGENT_STORE_PENDING, null);
      await agentReportActions([
        {
          kind: 'open_discussion',
          status: 'failed',
          idempotencyKey: actionId,
          error: 'The browser refused to navigate to the discussion URL.',
        },
      ]);
    }
  }

  async function agentDoScrollFeed(decision) {
    agentSetStatusMessage('Scrolling the listing\u2026');
    agentState.lastAction = 'Scrolling the listing';
    agentShowScrollCue('Scrolling the listing\u2026');
    const result = await scrollFeedAndWaitForGrowth(6000);
    agentHideScrollCue();
    const listing = agentSessionStoreGet(AGENT_STORE_LISTING) || {};
    if (listing.url === location.href) {
      listing.scrollAttempts = (listing.scrollAttempts || 0) + 1;
      agentSessionStoreSet(AGENT_STORE_LISTING, listing);
    }
    agentState.lastAction = result.grew ? 'Scrolled the listing (new posts loaded)' : 'Scrolled the listing (no new posts yet)';
    agentSetStatusMessage(null);
    await agentReportActions([
      {
        kind: 'scroll_feed',
        status: 'completed',
        idempotencyKey: decision.actionId || 'scroll:' + Date.now().toString(36),
        result: {
          grew: result.grew,
          postsBefore: result.postsBefore,
          postsAfter: result.postsAfter,
          scrolledBy: result.scrolledBy,
        },
      },
    ]);
  }

  async function agentDoNavigateListing(decision, actionKind) {
    const url = String(decision.listingUrl || '');
    if (!url) {
      await agentReportActions([
        {
          kind: actionKind,
          status: 'failed',
          idempotencyKey: decision.actionId || actionKind + ':' + Date.now().toString(36),
          error: 'The requested listing URL was missing.',
        },
      ]);
      return;
    }
    agentBeginPending({
      kind: 'listing',
      actionKind,
      actionId: decision.actionId || null,
      subreddit: (/\/r\/([^/]+)/i.exec(url) || [])[1] || null,
      url,
    });
    agentSetStatusMessage(actionKind === 'return_to_feed' ? 'Returning to the listing\u2026' : 'Switching listings\u2026');
    agentState.lastAction = actionKind === 'return_to_feed' ? 'Returning to the listing' : 'Switching to another listing';
    agentRenderOverlay();
    await delay(600);
    if (!agentNavigateTo(url)) {
      agentSessionStoreSet(AGENT_STORE_PENDING, null);
      await agentReportActions([
        {
          kind: actionKind,
          status: 'failed',
          idempotencyKey: decision.actionId || actionKind + ':' + Date.now().toString(36),
          error: 'The browser refused to navigate to the listing URL.',
        },
      ]);
    }
  }

  async function agentExecuteDecision(decision) {
    switch (decision.action) {
      case 'inspect':
        await agentDoOpenDiscussion(decision);
        return;
      case 'scroll_feed':
        await agentDoScrollFeed(decision);
        return;
      case 'open_listing':
        await agentDoNavigateListing(decision, 'open_listing');
        return;
      case 'draft_created':
      case 'skip':
        agentSetStatusMessage('Returning to the listing\u2026');
        agentState.lastAction = decision.action === 'draft_created' ? 'Draft prepared for this discussion' : 'Discussion skipped';
        await agentDoNavigateListing(decision, 'return_to_feed');
        return;
      case 'wait':
        agentSetStatusMessage(decision.reason || 'Waiting\u2026');
        agentState.lastAction = 'Waiting';
        agentRenderOverlay();
        await delay(5000);
        return;
      case 'pause':
      case 'stop': {
        const terminal = decision.action === 'stop' ? 'completed' : 'paused';
        agentState.session = { ...(agentState.session || {}), status: terminal, currentActivity: decision.reason || null };
        agentState.statusMessage = decision.reason || null;
        agentRunnerStop(decision.reason || '');
        return;
      }
      default:
        agentState.error = 'Unknown agent action: ' + String(decision.action);
        agentRenderOverlay();
    }
  }

  async function agentHandleObservationResponse(response) {
    if (!response) {
      agentState.backendDown = true;
      agentState.error = 'The Falbor backend could not be reached.';
      agentRenderOverlay();
      return;
    }
    agentState.backendDown = false;
    if (response.session) agentState.session = response.session;
    if (response.status === 409) {
      agentState.error = 'The session changed; refreshing.';
      agentRenderOverlay();
      return;
    }
    if (response.ok !== true) {
      agentState.error = response.error || 'The observation was rejected.';
      agentRenderOverlay();
      return;
    }
    agentState.error = null;
    agentState.backoffMs = 0;
    const decision = response.decision;
    if (!decision) {
      agentRenderOverlay();
      return;
    }
    await agentExecuteDecision(decision);
  }

  async function agentObserveFeed(session) {
    const scan = agentSessionStoreGet(AGENT_STORE_SCAN) || { seq: 0 };
    scan.seq += 1;
    agentSessionStoreSet(AGENT_STORE_SCAN, scan);

    let listing = agentSessionStoreGet(AGENT_STORE_LISTING);
    if (!listing || listing.url !== location.href) {
      listing = { url: location.href, scrollAttempts: 0 };
      agentSessionStoreSet(AGENT_STORE_LISTING, listing);
    }

    const context = redditListingContext();
    const observation = extractFeedCandidates();
    if (!observation || observation.ok !== true) {
      agentState.error = (observation && observation.error) || 'The Reddit listing could not be read.';
      agentRenderOverlay();
      return;
    }
    const data = observation.data || {};
    const sourceSubreddit = data.sourceSubreddit || context.subreddit || null;
    agentState.lastAction = 'Read the listing (' + (data.candidates || []).length + ' posts)';
    agentRenderOverlay();

    const response = await agentAsk({
      type: 'falbor:agent-observe',
      payload: {
        sessionId: session.id,
        revision: session.revision,
        idempotencyKey: 'feed:' + (sourceSubreddit || 'unknown') + ':' + scan.seq,
        kind: 'feed',
        tab: { url: location.href, title: document.title || undefined },
        sourceSubreddit: sourceSubreddit || undefined,
        scrollAttempts: listing.scrollAttempts || 0,
        candidates: data.candidates || [],
      },
    });
    await agentHandleObservationResponse(response);
  }

  async function agentObserveThread(session) {
    const observation = extractThreadObservation();
    if (!observation || observation.ok !== true) {
      agentState.error = (observation && observation.error) || 'This discussion could not be read.';
      agentRenderOverlay();
      return;
    }
    const thread = observation.data && observation.data.thread;
    if (!thread || !thread.externalId) {
      agentState.error = 'The discussion data was empty.';
      agentRenderOverlay();
      return;
    }
    agentState.currentDiscussion = thread.title || thread.externalId;
    agentState.lastAction = 'Read the discussion';
    agentRenderOverlay();

    const response = await agentAsk({
      type: 'falbor:agent-observe',
      payload: {
        sessionId: session.id,
        revision: session.revision,
        idempotencyKey: 'inspect:' + thread.externalId,
        kind: 'thread',
        tab: { url: location.href, title: document.title || undefined },
        thread,
      },
    });
    await agentHandleObservationResponse(response);
  }

  function agentScopeSubreddits(session) {
    const scope =
      session && session.config && Array.isArray(session.config.scopeSubreddits)
        ? session.config.scopeSubreddits
        : [];
    return scope.map((value) => subredditFromValue(value)).filter(Boolean);
  }

  function agentBootstrapTarget(session) {
    const scope = agentScopeSubreddits(session);
    if (!scope.length) return null;
    const stored = agentSessionStoreGet(AGENT_STORE_LISTING) || {};
    const storedSub = (stored.url && (/\/r\/([^/]+)/i.exec(String(stored.url)) || [])[1]) || '';
    if (storedSub && scope.indexOf(String(storedSub).toLowerCase()) !== -1) return stored.url;
    return listingUrlForSubreddit(scope[0]);
  }

  // The agent can be started or resumed on any reddit page. When the tab is not
  // on a listing or a discussion, open a listing from the configured scope so
  // the loop has somewhere to work. Navigation attempts are bounded; repeated
  // failures pause the session with an honest reason instead of looping.
  async function agentDoBootstrapNavigation(session) {
    const target = agentBootstrapTarget(session);
    if (!target) {
      await agentRunnerControl('pause');
      agentRunnerStop('The agent has no subreddit scope to open. Set a scope and start the agent again.');
      return;
    }
    if (session && session.config && session.config.allowNavigation === false) {
      await agentRunnerControl('pause');
      agentRunnerStop('Navigation is disabled for this agent. Open ' + target + ' in this tab, then resume the agent.');
      return;
    }
    const marker = agentSessionStoreGet(AGENT_STORE_NAV) || {};
    const attempts = marker.target === target && marker.url === location.href ? (marker.attempts || 0) + 1 : 1;
    if (attempts > 2) {
      agentSessionStoreSet(AGENT_STORE_NAV, null);
      await agentRunnerControl('pause');
      agentRunnerStop('This tab could not open ' + target + '. Open it manually, then resume the agent.');
      return;
    }
    agentSessionStoreSet(AGENT_STORE_NAV, { url: location.href, target, attempts, at: Date.now() });
    const label = (/\/r\/([^/]+)/i.exec(target) || [])[1] || target;
    agentState.lastAction = 'Opening the scoped listing';
    agentSetStatusMessage('Opening r/' + label + '\u2026');
    agentRenderOverlay();
    await delay(600);
    if (!agentNavigateTo(target)) {
      agentSessionStoreSet(AGENT_STORE_NAV, null);
      await agentRunnerControl('pause');
      agentRunnerStop('The browser refused to open ' + target + '. Open it manually, then resume the agent.');
    }
  }

  async function agentStep(session) {
    if (agentState.inFlight) return;
    agentState.inFlight = true;
    try {
      if (redditIsThreadPath(location.pathname)) {
        await agentObserveThread(session);
      } else if (redditListingContext().isListing) {
        await agentObserveFeed(session);
      } else {
        await agentDoBootstrapNavigation(session);
      }
    } finally {
      agentState.inFlight = false;
    }
  }

  async function agentLoop() {
    while (agentState.active) {
      try {
        if (agentSessionStoreGet(AGENT_STORE_PENDING)) {
          await agentResolveStalePending();
          if (agentSessionStoreGet(AGENT_STORE_PENDING)) {
            await delay(AGENT_POLL_MS);
            continue;
          }
        }

        const sessionResponse = await agentAsk({
          type: 'falbor:agent-session',
          maxAgeMs: AGENT_SESSION_FRESHNESS_MS,
        });
        if (!sessionResponse || sessionResponse.ok !== true) {
          agentState.backendDown = true;
          agentState.error = (sessionResponse && sessionResponse.error) || 'The Falbor backend could not be reached.';
          agentRenderOverlay();
          await delay(agentNextBackoff());
          continue;
        }
        agentState.backendDown = false;

        const session = sessionResponse.session;
        if (!session) {
          agentRunnerStop('No agent session is running.');
          return;
        }
        agentState.session = session;
        if (session.status === 'stopping' || session.stopRequested) {
          agentRunnerStop('Stopped by the user.');
          return;
        }
        if (session.status !== 'running') {
          agentState.statusMessage = null;
          agentRunnerStop(null);
          return;
        }

        agentState.backoffMs = 0;
        await agentStep(session);
        await delay(AGENT_ACTION_GAP_MS);
      } catch (err) {
        agentState.error = safeMessage(err);
        agentRenderOverlay();
        await delay(agentNextBackoff());
      }
    }
  }

  function agentRunnerStart() {
    if (agentState.active) return;
    agentState.active = true;
    agentOverlaySetHandlers({
      onPause: () => {
        void agentRunnerControl('pause');
      },
      onStop: () => {
        void agentRunnerControl('stop');
      },
    });
    agentRenderOverlay();
    void agentLoop();
  }

  async function agentInit() {
    const sessionResponse = await agentAsk({ type: 'falbor:agent-session', maxAgeMs: 0 });
    if (!sessionResponse || sessionResponse.ok !== true) return;
    const session = sessionResponse.session;
    if (!session) {
      agentState.session = null;
      agentSessionStoreSet(AGENT_STORE_PENDING, null);
      agentRenderOverlay();
      return;
    }
    agentState.session = session;
    agentState.backendDown = false;
    agentOverlaySetHandlers({
      onPause: () => {
        void agentRunnerControl('pause');
      },
      onStop: () => {
        void agentRunnerControl('stop');
      },
    });
    agentRenderOverlay();
    if (agentSessionStoreGet(AGENT_STORE_PENDING)) {
      await agentVerifyPending();
    }
    if (agentState.session && agentState.session.status === 'running' && !agentState.session.stopRequested) {
      agentRunnerStart();
    }
  }

  void agentInit();

  runtime.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return undefined;
    switch (message.type) {
      case 'falbor:ping':
        sendResponse({ type: 'falbor:pong' });
        return undefined;
      case 'falbor:cancel':
        teardown();
        sendResponse({ ok: true });
        return undefined;
      case 'falbor:fill':
        handleFill(message.payload || {}).then(sendResponse, (err) =>
          sendResponse({
            ok: false,
            result: { status: 'failed', error: 'Falbor extension error: ' + safeMessage(err) },
          }),
        );
        return true;
      case 'falbor:agent-feed':
        sendResponse(extractFeedCandidates());
        return undefined;
      case 'falbor:agent-thread':
        sendResponse(extractThreadObservation());
        return undefined;
      case 'falbor:agent-wake':
        (async () => {
          const payload = message.payload || {};
          if (payload.session) agentState.session = payload.session;
          const session = agentState.session;
          if (session && session.status === 'running' && !session.stopRequested) {
            agentRunnerStart();
          } else if (session && session.status && session.status !== 'running') {
            agentState.statusMessage = null;
            agentRunnerStop(null);
          }
          agentRenderOverlay();
          sendResponse({ ok: true });
        })();
        return true;
      case 'falbor:agent-pause':
        (async () => {
          agentRunnerStop((message && message.reason) || 'Paused.');
          sendResponse({ ok: true });
        })();
        return true;
      default:
        return undefined;
    }
  });
})();
