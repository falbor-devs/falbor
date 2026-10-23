// Falbor autonomous agent coordinator (background side).
//
// The backend owns the session state, decisions and limits, and the Reddit
// content script owns the observe→decide→act→verify loop because the page
// survives MV3 service-worker suspension. This coordinator selects and binds
// the user's existing Reddit tab, caches the session briefly for the content
// script, proxies API calls, and reacts to tab lifecycle events. It never
// navigates tabs by URL, never touches page DOM, and never posts. Every piece
// of state that matters is persisted in extension storage so a worker restart
// cannot lose track of the session.

const AGENT_STORAGE_KEY = 'falbor_agent_state';
const AGENT_ALARM = 'falbor-agent';
const AGENT_SESSION_CACHE_MS = 4000;

let agentTicking = false;

function emptyAgentRunState() {
  return {
    sessionId: null,
    status: null,
    revision: null,
    stopRequested: false,
    config: null,
    counters: null,
    step: null,
    tabId: null,
    sourceSubreddit: null,
    message: '',
    lastTickAt: null,
    sessionFetchedAt: null,
    error: null,
  };
}

async function getAgentRunState() {
  try {
    const stored = await getStorage(AGENT_STORAGE_KEY);
    const state = stored && stored[AGENT_STORAGE_KEY];
    return state && typeof state === 'object' ? { ...emptyAgentRunState(), ...state } : emptyAgentRunState();
  } catch (_) {
    return emptyAgentRunState();
  }
}

async function setAgentRunState(patch) {
  const current = await getAgentRunState();
  const next = { ...current, ...patch, lastTickAt: Date.now() };
  await setStorage({ [AGENT_STORAGE_KEY]: next });
  return next;
}

function agentSessionView(runState) {
  if (!runState || !runState.sessionId) return null;
  return {
    id: runState.sessionId,
    status: runState.status,
    revision: runState.revision,
    stopRequested: !!runState.stopRequested,
    config: runState.config || null,
    counters: runState.counters || null,
  };
}

function hashString(value) {
  const text = String(value || '');
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

async function agentReadAuth() {
  const stored = await getStorage([STORAGE.TOKEN, STORAGE.BACKEND_URL]);
  const token = stored[STORAGE.TOKEN];
  if (!token) return null;
  return { token, base: stored[STORAGE.BACKEND_URL] };
}

async function agentFetchSession(auth, maxAgeMs) {
  const runState = await getAgentRunState();
  if (
    maxAgeMs > 0 &&
    runState.sessionId &&
    runState.status &&
    runState.sessionFetchedAt &&
    Date.now() - runState.sessionFetchedAt <= maxAgeMs
  ) {
    return { ok: true, status: 200, data: { session: agentSessionView(runState) } };
  }
  const response = await getAgentSession(auth.base, auth.token);
  if (response.ok && response.data && response.data.session) {
    await applySessionToRunState(response.data.session);
  }
  return response;
}

async function applySessionToRunState(session, extra) {
  await setAgentRunState({
    sessionId: session.id,
    status: session.status,
    revision: session.revision,
    stopRequested: !!session.stopRequested,
    config: session.config || null,
    counters: session.counters || null,
    sessionFetchedAt: Date.now(),
    error: null,
    ...(extra || {}),
  });
}

async function agentReportActions(base, token, session, actions, extra) {
  const body = { sessionId: session.id, revision: session.revision, actions };
  if (extra && extra.tab) body.tab = extra.tab;
  if (extra && extra.currentStep) body.currentStep = extra.currentStep;
  if (extra && extra.currentActivity) body.currentActivity = extra.currentActivity;
  const response = await reportAgent(base, token, body);
  if (!response.ok) {
    if (response.data && response.data.session) await applySessionToRunState(response.data.session);
    else await setAgentRunState({ error: errorMessage(response, 'Could not report agent progress') });
    return null;
  }
  const data = response.data || {};
  if (data.session) await applySessionToRunState(data.session);
  return data;
}

async function agentReportError(base, token, session, message, result) {
  await setAgentRunState({ error: message });
  await agentReportActions(base, token, session, [
    {
      kind: 'error',
      status: 'failed',
      idempotencyKey: 'error:' + Date.now().toString(36) + ':' + hashString(message),
      error: message.slice(0, 500),
      result: result || { fatal: false },
    },
  ]);
}

async function agentPauseWithReason(base, token, session, reason) {
  await setAgentRunState({ status: 'paused', step: null, message: reason });
  await agentReportActions(
    base,
    token,
    session,
    [
      {
        kind: 'pause',
        status: 'completed',
        idempotencyKey: 'pause:' + session.revision + ':' + hashString(reason),
        error: reason.slice(0, 500),
      },
    ],
    { currentStep: 'paused', currentActivity: reason },
  );
}

async function agentRedditTabs() {
  try {
    const tabs = (await queryTabs({ url: '*://*.reddit.com/*' })) || [];
    return tabs.filter((tab) => tab && tab.id != null);
  } catch (_) {
    return [];
  }
}

// Predictable binding rule: keep the already bound tab while it is open;
// otherwise prefer the active Reddit tab, then the most recently accessed one.
// The extension never creates a Reddit tab on its own.
async function agentSelectRedditTab() {
  const tabs = await agentRedditTabs();
  const runState = await getAgentRunState();
  if (!tabs.length) {
    // The URL-filtered query can miss a tab (e.g. while it is being created);
    // fall back to the tab we already bound so a live tab is never declared
    // missing by accident.
    if (runState.tabId != null) {
      const bound = await getTab(runState.tabId);
      if (bound && bound.id != null && agentIsRedditUrl(bound.url)) return bound;
    }
    return null;
  }
  const bound = runState.tabId != null ? tabs.find((tab) => tab.id === runState.tabId) : null;
  if (bound) return bound;
  const active = tabs.find((tab) => tab.active);
  const chosen = active || tabs.slice().sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  if (chosen.id !== runState.tabId) await setAgentRunState({ tabId: chosen.id });
  return chosen;
}

async function agentWakeBoundTab(tabId, session) {
  if (tabId == null) return false;
  const ready = await waitForContentScript(tabId);
  if (!ready) return false;
  const response = await sendMessageToTab(tabId, {
    type: 'falbor:agent-wake',
    payload: { session: session || null },
  });
  return !!response;
}

async function agentFocusRedditTab() {
  try {
    const tabs = await agentRedditTabs();
    if (!tabs.length) return;
    const runState = await getAgentRunState();
    const preferred = runState.tabId != null ? tabs.find((tab) => tab.id === runState.tabId) : null;
    const active = tabs.find((tab) => tab.active);
    const tab = preferred || active || tabs.slice().sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
    try {
      await updateTab(tab.id, { active: true });
    } catch (_) {
      // Bringing the tab forward is best-effort only.
    }
  } catch (_) {
    // Focus is best-effort only.
  }
}

async function agentSessionForContent(maxAgeMs, senderTabId) {
  const auth = await agentReadAuth();
  if (!auth) return { ok: false, status: 0, error: 'Connect the extension to Falbor first.' };
  const response = await agentFetchSession(auth, Number.isFinite(maxAgeMs) ? maxAgeMs : AGENT_SESSION_CACHE_MS);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      session: (response.data && response.data.session) || null,
      error: errorMessage(response, 'Agent session lookup failed'),
    };
  }
  const session = response.data && response.data.session;
  if (!session) return { ok: true, session: null };
  if (senderTabId != null) {
    const runState = await getAgentRunState();
    const tabs = await agentRedditTabs();
    const boundAlive = runState.tabId != null && tabs.some((tab) => tab.id === runState.tabId);
    if (!boundAlive && runState.tabId !== senderTabId) {
      await setAgentRunState({ tabId: senderTabId });
    }
  }
  return { ok: true, session };
}

async function agentObservePayload(payload, senderTabId) {
  const auth = await agentReadAuth();
  if (!auth) return { ok: false, status: 0, error: 'Connect the extension to Falbor first.' };
  const response = await observeAgent(auth.base, auth.token, payload);
  const data = response.data || {};
  if ((response.ok || response.status === 409) && data.session) {
    await applySessionToRunState(data.session);
  }
  const out = { ok: !!response.ok, status: response.status || 0 };
  if (!response.ok) out.error = errorMessage(response, 'The observation was rejected');
  out.decision = data.decision || null;
  out.session = data.session || null;
  out.counters = data.counters || null;
  if (response.ok && senderTabId != null) {
    const runState = await getAgentRunState();
    if (runState.tabId == null) await setAgentRunState({ tabId: senderTabId });
  }
  return out;
}

async function agentReportPayload(body) {
  const auth = await agentReadAuth();
  if (!auth) return { ok: false, status: 0, error: 'Connect the extension to Falbor first.' };
  const response = await reportAgent(auth.base, auth.token, body);
  const data = response.data || {};
  if ((response.ok || response.status === 409) && data.session) {
    await applySessionToRunState(data.session);
  }
  const out = { ok: !!response.ok, status: response.status || 0 };
  if (!response.ok) out.error = errorMessage(response, 'The action report was rejected');
  out.session = data.session || null;
  out.counters = data.counters || null;
  return out;
}

async function agentHandleTabRemoved(tabId) {
  const runState = await getAgentRunState();
  if (runState.tabId !== tabId) return;
  await setAgentRunState({ tabId: null });
  if (runState.status !== 'running' || !runState.sessionId) return;
  const auth = await agentReadAuth();
  if (!auth) return;
  const session = agentSessionView(runState);
  if (!session) return;
  await agentPauseWithReason(
    auth.base,
    auth.token,
    session,
    'Paused: the Reddit tab was closed. Open reddit.com in this browser, then resume the agent.',
  );
}

function agentIsRedditUrl(url) {
  try {
    const parsed = new URL(String(url || ''));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return /(^|\.)reddit\.com$/i.test(parsed.hostname);
  } catch (_) {
    return false;
  }
}

async function agentHandleTabUpdated(tabId, changeInfo) {
  if (!changeInfo || typeof changeInfo.url !== 'string') return;
  const runState = await getAgentRunState();
  if (runState.tabId !== tabId || runState.status !== 'running' || !runState.sessionId) return;
  const auth = await agentReadAuth();
  if (!auth) return;
  const session = agentSessionView(runState);
  if (!session) return;
  if (agentIsRedditUrl(changeInfo.url)) {
    const response = await agentFetchSession(auth, AGENT_SESSION_CACHE_MS);
    if (response.ok && response.data && response.data.session) {
      await applySessionToRunState(response.data.session);
      await sendMessageToTab(tabId, {
        type: 'falbor:agent-wake',
        payload: { session: response.data.session },
      });
    }
    return;
  }
  await agentPauseWithReason(
    auth.base,
    auth.token,
    session,
    'Paused: the Reddit tab navigated away from reddit.com. Go back to reddit.com in that tab, then resume the agent.',
  );
}

async function agentAcknowledgeStop(auth, session) {
  await agentReportActions(
    auth.base,
    auth.token,
    session,
    [
      {
        kind: 'stop',
        status: 'completed',
        idempotencyKey: 'stop-ack:' + session.id,
        result: { acknowledged: true },
      },
    ],
    { currentStep: 'stopped', currentActivity: 'Stopped by the user.' },
  );
  await setAgentRunState({ status: 'stopped', step: null, stopRequested: false, message: 'Stopped.' });
}

// Lightweight coordinator tick (also driven by the 1-minute alarm backstop):
// refresh the session, acknowledge stops, and wake the bound Reddit tab so a
// freshly started or resumed session picks up even before the page polls.
async function agentTick() {
  if (agentTicking) return { skipped: 'ticking' };
  agentTicking = true;
  try {
    const auth = await agentReadAuth();
    if (!auth) {
      await setAgentRunState({
        sessionId: null,
        status: null,
        revision: null,
        step: null,
        message: 'Connect the extension to Falbor to use the agent.',
      });
      return { skipped: 'not-connected' };
    }

    const response = await agentFetchSession(auth, 0);
    if (!response.ok) {
      if (response.status === 401) {
        await setAgentRunState({
          sessionId: null,
          status: null,
          revision: null,
          step: null,
          message: 'The extension token was rejected. Re-pair the extension from Falbor.',
        });
      } else {
        await setAgentRunState({ error: errorMessage(response, 'Agent session lookup failed') });
      }
      return { ok: false, status: response.status };
    }

    const session = response.data && response.data.session;
    if (!session) {
      await setAgentRunState({
        sessionId: null,
        status: null,
        revision: null,
        stopRequested: false,
        step: null,
        config: (response.data && response.data.config) || null,
        sessionFetchedAt: Date.now(),
        message: 'No agent session is running.',
      });
      return { ok: true, idle: true };
    }

    await applySessionToRunState(session);
    if (session.status === 'stopping' || session.stopRequested) {
      await agentAcknowledgeStop(auth, session);
      return { ok: true, stopped: true };
    }
    if (session.status !== 'running') {
      return { ok: true, idle: true, status: session.status };
    }

    const tab = await agentSelectRedditTab();
    if (!tab) {
      await agentPauseWithReason(
        auth.base,
        auth.token,
        session,
        'Paused: no Reddit tab is open. Open reddit.com in this browser, then resume the agent.',
      );
      return { ok: true, paused: 'no-reddit-tab' };
    }
    const awake = await agentWakeBoundTab(tab.id, session);
    if (!awake) {
      await agentReportError(
        auth.base,
        auth.token,
        session,
        'The Reddit tab did not respond to the extension. Reload the Reddit tab and resume the agent.',
        { fatal: false },
      );
      return { ok: false, error: 'content-script-unreachable' };
    }
    return { ok: true, bound: tab.id };
  } catch (err) {
    await setAgentRunState({ error: truncateError(err) }).catch(() => {});
    return { ok: false };
  } finally {
    agentTicking = false;
  }
}

async function agentControl(action, config) {
  const auth = await agentReadAuth();
  if (!auth) return { ok: false, error: 'Connect the extension to Falbor first.' };
  const body = { action };
  if (config !== undefined) body.config = config;
  const response = await controlAgent(auth.base, auth.token, body);
  if (!response.ok) {
    const session = response.data && response.data.session;
    if (session) await applySessionToRunState(session);
    return { ok: false, error: errorMessage(response, 'Could not ' + action + ' the agent') };
  }
  const session = response.data && response.data.session;
  if (session) {
    const extra = {};
    if (action === 'start' || action === 'resume') extra.step = null;
    await applySessionToRunState(session, extra);
  }
  if (action === 'stop') {
    if (session && session.status === 'stopped') {
      await setAgentRunState({ status: 'stopped', step: null, stopRequested: false, message: 'Stopped.' });
    }
    return { ok: true, session };
  }
  if (action === 'start' || action === 'resume') {
    void agentFocusRedditTab();
    if (session && session.status === 'running') {
      const bound = await agentSelectRedditTab();
      if (bound) {
        const runState = await getAgentRunState();
        void agentWakeBoundTab(bound.id, agentSessionView(runState));
      }
    }
  }
  return { ok: true, session };
}

function createAgentAlarm() {
  try {
    const result = api.alarms.create(AGENT_ALARM, { periodInMinutes: 1 });
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch (_) {
    // Alarm creation failing must never break the background script.
  }
}
