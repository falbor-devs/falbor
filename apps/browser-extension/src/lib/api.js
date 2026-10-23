// HTTP client for the Falbor extension API.
//
// apiFetch never throws: it always resolves with { ok, status, data } so that
// callers can report the real outcome (including network failures) instead of
// crashing the service worker.

const REQUEST_TIMEOUT_MS = 45000;

export function normalizeBase(url) {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw) return DEFAULT_BACKEND_URL;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : 'http://' + raw;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return DEFAULT_BACKEND_URL;
    const path = parsed.pathname.replace(/\/+$/, '');
    return parsed.origin + (path === '/' ? '' : path);
  } catch (_) {
    return DEFAULT_BACKEND_URL;
  }
}

function networkError(err) {
  const name = err && err.name;
  const message = err && err.message ? err.message : String(err);
  if (name === 'AbortError') return 'Request timed out after 45 seconds.';
  return 'Network error: ' + message;
}

export async function apiFetch(base, path, options) {
  const opts = options || {};
  const url = normalizeBase(base) + path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
    const response = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    });
    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = { error: text.slice(0, 500) };
      }
    }
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: networkError(err) } };
  } finally {
    clearTimeout(timer);
  }
}

export function claimPairing(base, params) {
  const input = params || {};
  return apiFetch(base, '/api/automation/extension/claim', {
    method: 'POST',
    body: {
      code: input.code,
      installationId: input.installationId,
      browser: input.browser,
      version: input.version,
      label: input.label,
    },
  });
}

export function heartbeat(base, token) {
  return apiFetch(base, '/api/automation/extension/heartbeat', {
    method: 'POST',
    token,
    body: {},
  });
}

export function claimTask(base, token) {
  return apiFetch(base, '/api/automation/extension/tasks', {
    method: 'GET',
    token,
  });
}

export function reportResult(base, token, taskId, result) {
  return apiFetch(base, '/api/automation/extension/tasks/' + encodeURIComponent(taskId) + '/result', {
    method: 'POST',
    token,
    body: result,
  });
}

export function getAgentSession(base, token) {
  return apiFetch(base, '/api/automation/extension/agent/session', { token });
}

export function controlAgent(base, token, body) {
  return apiFetch(base, '/api/automation/extension/agent/control', { method: 'POST', token, body });
}

export function observeAgent(base, token, body) {
  return apiFetch(base, '/api/automation/extension/agent/observe', { method: 'POST', token, body });
}

export function reportAgent(base, token, body) {
  return apiFetch(base, '/api/automation/extension/agent/report', { method: 'POST', token, body });
}
