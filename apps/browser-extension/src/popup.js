// Falbor Automation popup. Plain JS, no inline handlers. It reads real state
// from storage/background and never fabricates statuses.

(function () {
  'use strict';

  const els = {
    version: document.getElementById('version'),
    disconnected: document.getElementById('view-disconnected'),
    connected: document.getElementById('view-connected'),
    backendUrl: document.getElementById('backend-url'),
    pairingCode: document.getElementById('pairing-code'),
    connectBtn: document.getElementById('connect-btn'),
    connectStatus: document.getElementById('connect-status'),
    connPill: document.getElementById('conn-pill'),
    workspace: document.getElementById('workspace'),
    taskCounts: document.getElementById('task-counts'),
    lastSync: document.getElementById('last-sync'),
    taskPanel: document.getElementById('task-panel'),
    taskPhase: document.getElementById('task-phase'),
    taskMessage: document.getElementById('task-message'),
    connError: document.getElementById('conn-error'),
    checkBtn: document.getElementById('check-btn'),
    cancelBtn: document.getElementById('cancel-btn'),
    agentPill: document.getElementById('agent-pill'),
    agentActivity: document.getElementById('agent-activity'),
    agentCounters: document.getElementById('agent-counters'),
    agentStartBtn: document.getElementById('agent-start-btn'),
    agentPauseBtn: document.getElementById('agent-pause-btn'),
    agentResumeBtn: document.getElementById('agent-resume-btn'),
    agentStopBtn: document.getElementById('agent-stop-btn'),
    agentStatus: document.getElementById('agent-status'),
    backendUrlSetting: document.getElementById('backend-url-setting'),
    saveUrlBtn: document.getElementById('save-url-btn'),
    disconnectBtn: document.getElementById('disconnect-btn'),
    settingsStatus: document.getElementById('settings-status'),
  };

  const ACTIVE_PHASES = ['claiming', 'opening', 'filling', 'awaiting_user', 'observing'];
  const STALE_MS = 3 * 60 * 1000;

  function setStatus(el, text, kind) {
    if (!el) return;
    if (!text) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = text;
    el.className = 'status ' + (kind || '');
  }

  function detectBrowserName() {
    const ua = navigator.userAgent || '';
    if (/firefox/i.test(ua)) return 'firefox';
    if (/edg/i.test(ua)) return 'edge';
    return 'chrome';
  }

  function apiErrorMessage(response) {
    if (response && response.data && response.data.error) return String(response.data.error);
    if (response && response.status === 0) return 'the backend could not be reached. Is Falbor running?';
    if (response && response.status) return 'HTTP ' + response.status + '.';
    return 'unknown error.';
  }

  async function readStateFromStorage() {
    try {
      const stored = await getStorage([
        'falbor_token',
        'falbor_workspace_id',
        'falbor_backend_url',
        'falbor_installation_id',
        'falbor_last_sync',
        'falbor_last_error',
        'falbor_task_state',
        'falbor_last_heartbeat',
        'falbor_agent_state',
      ]);
      const taskState = stored.falbor_task_state || null;
      return {
        type: 'falbor:state',
        connected: !!stored.falbor_token,
        workspaceId: stored.falbor_workspace_id || null,
        backendUrl: stored.falbor_backend_url || DEFAULT_BACKEND_URL,
        installationId: stored.falbor_installation_id || null,
        taskState,
        taskActive: !!(taskState && ACTIVE_PHASES.indexOf(taskState.phase) !== -1),
        agent: stored.falbor_agent_state || null,
        lastSync: typeof stored.falbor_last_sync === 'number' ? stored.falbor_last_sync : null,
        lastError: stored.falbor_last_error || null,
        heartbeat: stored.falbor_last_heartbeat || null,
      };
    } catch (err) {
      return {
        type: 'falbor:state',
        connected: false,
        backendUrl: DEFAULT_BACKEND_URL,
        lastError: 'Could not read extension storage: ' + String((err && err.message) || err),
      };
    }
  }

  async function readState() {
    try {
      const response = await sendRuntimeMessage({ type: 'falbor:get-state' });
      if (response && response.type === 'falbor:state' && !response.error) return response;
      if (response && response.error) return { ...(await readStateFromStorage()), lastError: response.error };
    } catch (_) {
      // Fall through to direct storage reads.
    }
    return readStateFromStorage();
  }

  function shortId(id) {
    const text = String(id || '');
    return text.length > 10 ? text.slice(0, 8) + '...' : text;
  }

  function compactNumber(value, digits) {
    const number = Number(value) || 0;
    if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
    if (number >= 1000) return (number / 1000).toFixed(1) + 'k';
    return number.toFixed(digits || 0);
  }

  function renderAgent(agent) {
    const status = agent && typeof agent.status === 'string' ? agent.status : null;
    const pillLabels = {
      running: 'Running',
      paused: 'Paused',
      stopping: 'Stopping',
      stopped: 'Stopped',
      completed: 'Completed',
      error: 'Error',
    };
    const pillClasses = {
      running: 'ok',
      paused: 'warn',
      stopping: 'warn',
      stopped: '',
      completed: 'ok',
      error: 'error',
    };
    els.agentPill.textContent = status ? pillLabels[status] || status : 'Idle';
    els.agentPill.className = 'pill ' + (status ? pillClasses[status] || '' : '');

    const message = agent && (agent.message || agent.error);
    const scope = agent && agent.config && Array.isArray(agent.config.scopeSubreddits) ? agent.config.scopeSubreddits : null;
    const needsScope = scope !== null && scope.length === 0;
    if (message) {
      els.agentActivity.textContent = message;
    } else if (needsScope) {
      els.agentActivity.textContent = 'Add subreddits in Falbor: Automation > AI agent > Configure.';
    } else if (!status) {
      els.agentActivity.textContent = 'No agent session. Start one from Falbor Automation.';
    } else {
      els.agentActivity.textContent = 'Agent ' + (pillLabels[status] || status).toLowerCase() + '.';
    }

    const counters = agent && agent.counters;
    if (counters) {
      const parts = [
        'Inspected ' + compactNumber(counters.inspected),
        'Analyzed ' + compactNumber(counters.analyzed),
        'Drafts ' + compactNumber(counters.draftsCreated),
        'Skipped ' + compactNumber(counters.skipped),
        'AI calls ' + compactNumber(counters.aiCalls),
        '~$' + compactNumber(counters.estimatedCostUsd, 2),
      ];
      els.agentCounters.textContent = parts.join(' / ');
      els.agentCounters.hidden = false;
    } else {
      els.agentCounters.textContent = '';
      els.agentCounters.hidden = true;
    }

    const idle = !status || status === 'stopped' || status === 'completed' || status === 'error';
    els.agentStartBtn.hidden = !idle || needsScope;
    els.agentPauseBtn.hidden = status !== 'running';
    els.agentResumeBtn.hidden = status !== 'paused' || needsScope;
    els.agentStopBtn.hidden = !(status === 'running' || status === 'paused' || status === 'stopping');
    els.agentStopBtn.disabled = status === 'stopping';
  }

  function render(state) {
    els.version.textContent = 'v' + EXTENSION_VERSION;

    if (!state.connected) {
      els.disconnected.hidden = false;
      els.connected.hidden = true;
      if (document.activeElement !== els.backendUrl) {
        els.backendUrl.value = state.backendUrl || DEFAULT_BACKEND_URL;
      }
      setStatus(els.connectStatus, state.lastError ? String(state.lastError) : '', state.lastError ? 'error' : '');
      return;
    }

    els.disconnected.hidden = true;
    els.connected.hidden = false;

    els.workspace.textContent = state.workspaceId ? 'Workspace ' + state.workspaceId : 'Workspace unknown';
    if (document.activeElement !== els.backendUrlSetting) {
      els.backendUrlSetting.value = state.backendUrl || DEFAULT_BACKEND_URL;
    }

    const syncedRecently = !!state.lastSync && Date.now() - state.lastSync < STALE_MS;
    let pillText = 'Extension offline';
    let pillClass = 'warn';
    if (state.lastError && /token rejected/i.test(state.lastError)) {
      pillText = 'Token rejected';
      pillClass = 'error';
    } else if (syncedRecently) {
      pillText = 'Connected';
      pillClass = 'ok';
    }
    els.connPill.textContent = pillText;
    els.connPill.className = 'pill ' + pillClass;

    const heartbeat = state.heartbeat;
    if (heartbeat && heartbeat.tasks) {
      const queued = Number(heartbeat.tasks.queued) || 0;
      const running = Number(heartbeat.tasks.running) || 0;
      els.taskCounts.textContent = 'Queued ' + queued + ' / Running ' + running;
    } else {
      els.taskCounts.textContent = '-';
    }
    els.lastSync.textContent = state.lastSync
      ? new Date(state.lastSync).toLocaleTimeString()
      : 'Never';

    if (state.taskState) {
      els.taskPanel.hidden = false;
      els.taskPhase.textContent =
        state.taskState.phase + (state.taskState.draftId ? ' / draft ' + shortId(state.taskState.draftId) : '');
      els.taskMessage.textContent = state.taskState.message || '';
    } else {
      els.taskPanel.hidden = true;
      els.taskPhase.textContent = '';
      els.taskMessage.textContent = '';
    }
    els.cancelBtn.hidden = !state.taskActive;

    renderAgent(state.agent);

    if (state.lastError) {
      els.connError.hidden = false;
      els.connError.textContent = String(state.lastError);
    } else {
      els.connError.hidden = true;
      els.connError.textContent = '';
    }
  }

  async function refresh() {
    const state = await readState();
    render(state);
    return state;
  }

  async function ensureInstallationId() {
    const stored = await getStorage('falbor_installation_id');
    if (stored && stored.falbor_installation_id) return stored.falbor_installation_id;
    let id = '';
    try {
      id = crypto.randomUUID();
    } catch (_) {
      id = 'inst-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    }
    await setStorage({ falbor_installation_id: id });
    return id;
  }

  async function ensureHostPermission(base) {
    try {
      const parsed = new URL(base);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
      if (!api.permissions || !api.permissions.request) return true;
      // Must stay inside the click's user gesture; call request directly.
      return await api.permissions.request({ origins: [parsed.origin + '/*'] });
    } catch (_) {
      return true;
    }
  }

  els.connectBtn.addEventListener('click', async () => {
    const base = normalizeBase(els.backendUrl.value);
    const code = String(els.pairingCode.value || '').trim().toUpperCase();
    if (!code) {
      setStatus(els.connectStatus, 'Enter the pairing code from Falbor.', 'error');
      return;
    }
    els.connectBtn.disabled = true;
    setStatus(els.connectStatus, 'Connecting...', 'info');
    try {
      const granted = await ensureHostPermission(base);
      if (!granted) {
        setStatus(
          els.connectStatus,
          'Permission for ' + base + ' was not granted, so the extension cannot reach that backend.',
          'error',
        );
        return;
      }
      const installationId = await ensureInstallationId();
      const response = await claimPairing(base, {
        code,
        installationId,
        browser: detectBrowserName(),
        version: EXTENSION_VERSION,
        label: detectBrowserName() + ' extension',
      });
      if (!response.ok) {
        setStatus(els.connectStatus, 'Pairing failed: ' + apiErrorMessage(response), 'error');
        return;
      }
      const data = response.data || {};
      if (!data.token) {
        setStatus(els.connectStatus, 'Pairing failed: the backend did not return a token.', 'error');
        return;
      }
      await setStorage({
        falbor_token: data.token,
        falbor_workspace_id: data.workspaceId || null,
        falbor_backend_url: base,
        falbor_last_error: null,
      });
      els.pairingCode.value = '';
      setStatus(els.connectStatus, 'Connected. Checking in with Falbor...', 'ok');
      sendRuntimeMessage({ type: 'falbor:check-now' }).catch(() => {});
      setTimeout(refresh, 800);
      setTimeout(refresh, 2500);
    } catch (err) {
      setStatus(els.connectStatus, 'Pairing failed: ' + String((err && err.message) || err), 'error');
    } finally {
      els.connectBtn.disabled = false;
    }
  });

  els.checkBtn.addEventListener('click', async () => {
    els.checkBtn.disabled = true;
    setStatus(els.settingsStatus, 'Checking...', 'info');
    try {
      await sendRuntimeMessage({ type: 'falbor:check-now' });
    } catch (_) {
      // The next refresh will show the real stored state.
    }
    setTimeout(refresh, 1200);
    setTimeout(refresh, 3000);
    setTimeout(() => {
      els.checkBtn.disabled = false;
      setStatus(els.settingsStatus, '', '');
    }, 3400);
  });

  els.cancelBtn.addEventListener('click', async () => {
    els.cancelBtn.disabled = true;
    try {
      const response = await sendRuntimeMessage({ type: 'falbor:cancel-task' });
      if (response && response.ok === false) {
        setStatus(els.settingsStatus, response.error || 'Could not cancel the task.', 'error');
      } else {
        setStatus(els.settingsStatus, 'Cancellation requested.', 'info');
      }
    } catch (err) {
      setStatus(els.settingsStatus, String((err && err.message) || err), 'error');
    }
    await refresh();
    els.cancelBtn.disabled = false;
  });

  els.saveUrlBtn.addEventListener('click', async () => {
    const base = normalizeBase(els.backendUrlSetting.value);
    els.saveUrlBtn.disabled = true;
    try {
      const granted = await ensureHostPermission(base);
      if (!granted) {
        setStatus(els.settingsStatus, 'Permission for ' + base + ' was not granted.', 'error');
        return;
      }
      await setStorage({ falbor_backend_url: base, falbor_last_error: null });
      els.backendUrlSetting.value = base;
      setStatus(els.settingsStatus, 'Backend URL saved. Checking...', 'ok');
      sendRuntimeMessage({ type: 'falbor:check-now' }).catch(() => {});
      setTimeout(refresh, 1200);
    } catch (err) {
      setStatus(els.settingsStatus, String((err && err.message) || err), 'error');
    } finally {
      els.saveUrlBtn.disabled = false;
    }
  });

  els.disconnectBtn.addEventListener('click', async () => {
    els.disconnectBtn.disabled = true;
    try {
      await sendRuntimeMessage({ type: 'falbor:cancel-task' }).catch(() => {});
      await removeStorage([
        'falbor_token',
        'falbor_workspace_id',
        'falbor_task_state',
        'falbor_last_heartbeat',
        'falbor_last_sync',
        'falbor_last_error',
      ]);
      setStatus(els.settingsStatus, 'Disconnected. The token was removed from this browser.', 'ok');
      await refresh();
    } catch (err) {
      setStatus(els.settingsStatus, String((err && err.message) || err), 'error');
    } finally {
      els.disconnectBtn.disabled = false;
    }
  });

  async function sendAgentControl(action, button) {
    button.disabled = true;
    setStatus(els.agentStatus, 'Requesting ' + action + '...', 'info');
    try {
      const response = await sendRuntimeMessage({ type: 'falbor:agent-control', action });
      if (response && response.ok === false) {
        setStatus(els.agentStatus, response.error || 'Could not ' + action + ' the agent.', 'error');
      } else {
        setStatus(els.agentStatus, 'Agent ' + action + ' requested.', 'ok');
      }
    } catch (err) {
      setStatus(els.agentStatus, String((err && err.message) || err), 'error');
    }
    await refresh();
    button.disabled = false;
  }

  els.agentStartBtn.addEventListener('click', () => sendAgentControl('start', els.agentStartBtn));
  els.agentPauseBtn.addEventListener('click', () => sendAgentControl('pause', els.agentPauseBtn));
  els.agentResumeBtn.addEventListener('click', () => sendAgentControl('resume', els.agentResumeBtn));
  els.agentStopBtn.addEventListener('click', () => sendAgentControl('stop', els.agentStopBtn));

  refresh();
  setInterval(refresh, 2000);
})();
