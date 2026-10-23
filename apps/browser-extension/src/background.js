// Falbor Automation background script.
//
// Runs as an MV3 service worker on Chrome and an event page on Firefox. All
// listeners are registered synchronously at the top level so they re-register
// every time the worker is woken up. This file is concatenated with
// src/lib/browser.js, src/lib/api.js and src/config.js at build time.

const STORAGE = {
  TOKEN: 'falbor_token',
  WORKSPACE_ID: 'falbor_workspace_id',
  BACKEND_URL: 'falbor_backend_url',
  INSTALLATION_ID: 'falbor_installation_id',
  LAST_SYNC: 'falbor_last_sync',
  LAST_ERROR: 'falbor_last_error',
  TASK_STATE: 'falbor_task_state',
  LAST_HEARTBEAT: 'falbor_last_heartbeat',
};

const ACTIVE_PHASES = ['claiming', 'opening', 'filling', 'awaiting_user', 'observing'];
const POLL_ALARM = 'falbor-poll';
const CONTENT_READY_TIMEOUT_MS = 20000;
// The content script gives up after 10 minutes and reports outcome_unknown;
// this is a backstop in case its message never arrives.
const RESULT_TIMEOUT_MS = 11 * 60 * 1000;

let polling = false;
let pendingTask = null;
let lastActiveTabId = null;
// Set when a cancellation is reported outside executeTask, so the fill
// acknowledgement path does not report the same task twice.
let directlyReportedTaskId = null;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isActivePhase(phase) {
  return ACTIVE_PHASES.indexOf(phase) !== -1;
}

function truncateError(err) {
  const text = err && err.message ? err.message : String(err);
  return text.slice(0, 500);
}

function errorMessage(response, prefix) {
  const data = response && response.data;
  if (data && typeof data.error === 'string' && data.error) return prefix + ': ' + data.error;
  if (response && response.status === 0) return prefix + ': the backend could not be reached.';
  if (response && typeof response.status === 'number') return prefix + ': HTTP ' + response.status + '.';
  return prefix + ': unknown error.';
}

async function setTaskState(taskId, phase, message, extra) {
  const info = extra || {};
  const state = {
    taskId: taskId || null,
    draftId: info.draftId || null,
    phase,
    message: message || '',
    updatedAt: Date.now(),
  };
  if (info.tabId != null) state.tabId = info.tabId;
  await setStorage({ [STORAGE.TASK_STATE]: state });
  return state;
}

function createPollAlarm() {
  try {
    const result = api.alarms.create(POLL_ALARM, { periodInMinutes: 1 });
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch (_) {
    // Alarm creation failing must never break the background script.
  }
  createAgentAlarm();
}

async function ensureInstallationId() {
  const stored = await getStorage(STORAGE.INSTALLATION_ID);
  const existing = stored && stored[STORAGE.INSTALLATION_ID];
  if (existing) return existing;
  let id = '';
  try {
    id = crypto.randomUUID();
  } catch (_) {
    id = 'inst-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }
  await setStorage({ [STORAGE.INSTALLATION_ID]: id });
  return id;
}

function heartbeatSnapshot(data) {
  if (!data || typeof data !== 'object') return null;
  const reddit = data.reddit && typeof data.reddit === 'object' ? data.reddit : null;
  const tasks = data.tasks && typeof data.tasks === 'object' ? data.tasks : null;
  return {
    receivedAt: Date.now(),
    workspaceId: data.workspaceId || null,
    reddit: reddit ? { status: reddit.status || null, username: reddit.username || null } : null,
    tasks: tasks
      ? { queued: Number(tasks.queued) || 0, running: Number(tasks.running) || 0 }
      : null,
    settings: data.settings && typeof data.settings === 'object' ? data.settings : null,
    counts: data.counts && typeof data.counts === 'object' ? data.counts : null,
  };
}

async function pollOnce() {
  if (polling) return { skipped: 'already-polling' };
  polling = true;
  try {
    const stored = await getStorage([STORAGE.TOKEN, STORAGE.BACKEND_URL, STORAGE.TASK_STATE]);
    const token = stored[STORAGE.TOKEN];
    if (!token) return { skipped: 'not-connected' };
    const base = stored[STORAGE.BACKEND_URL];
    await ensureInstallationId();

    const state = stored[STORAGE.TASK_STATE];
    if (state && isActivePhase(state.phase)) return { skipped: 'task-in-progress' };

    const hb = await heartbeat(base, token);
    if (!hb.ok) {
      const message = errorMessage(hb, 'Heartbeat failed');
      if (hb.status === 401) {
        await removeStorage(STORAGE.TOKEN);
        await setStorage({
          [STORAGE.LAST_ERROR]:
            'Token rejected by Falbor: ' + message + ' Re-pair the extension from the Falbor Automation page.',
        });
        await setStorage({ [STORAGE.TASK_STATE]: null });
      } else {
        await setStorage({ [STORAGE.LAST_ERROR]: message });
      }
      return { ok: false, status: hb.status };
    }

    const updates = {
      [STORAGE.LAST_SYNC]: Date.now(),
      [STORAGE.LAST_ERROR]: null,
      [STORAGE.LAST_HEARTBEAT]: heartbeatSnapshot(hb.data),
    };
    if (hb.data && hb.data.workspaceId) updates[STORAGE.WORKSPACE_ID] = hb.data.workspaceId;
    await setStorage(updates);

    const claimed = await claimTask(base, token);
    if (!claimed.ok) {
      await setStorage({ [STORAGE.LAST_ERROR]: errorMessage(claimed, 'Could not fetch the next task') });
      return { ok: false, status: claimed.status };
    }
    const task = claimed.data && claimed.data.task;
    if (!task) return { ok: true, task: null };
    if (task.type !== 'publish_comment') {
      await setStorage({ [STORAGE.LAST_ERROR]: 'Unsupported task type received: ' + String(task.type) });
      return { ok: true, task: 'unsupported' };
    }
    await executeTask(task);
    return { ok: true, task: task.id };
  } catch (err) {
    await setStorage({ [STORAGE.LAST_ERROR]: truncateError(err) }).catch(() => {});
    return { ok: false };
  } finally {
    polling = false;
  }
}

async function findOrOpenTab(payload) {
  const threadUrl = typeof payload.threadUrl === 'string' ? payload.threadUrl : '';
  let threadPath = '';
  try {
    threadPath = new URL(threadUrl).pathname.replace(/\/+$/, '');
  } catch (_) {
    threadPath = '';
  }
  let tabs = [];
  try {
    tabs = (await queryTabs({ url: '*://*.reddit.com/*' })) || [];
  } catch (_) {
    tabs = [];
  }
  const existing = tabs.find((tab) => {
    if (!tab || typeof tab.url !== 'string') return false;
    if (threadPath && tab.url.indexOf(threadPath) !== -1) return true;
    return payload.threadExternalId ? tab.url.indexOf(String(payload.threadExternalId)) !== -1 : false;
  });
  if (existing && existing.id != null) {
    try {
      await updateTab(existing.id, { active: true });
    } catch (_) {
      // Activating is best-effort only.
    }
    return existing;
  }
  if (!threadUrl) throw new Error('The task does not include a Reddit thread URL.');
  return createTab({ url: threadUrl, active: true });
}

async function injectContentScript(tabId) {
  try {
    if (!api.scripting) return false;
    await api.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  } catch (_) {
    return false;
  }
  try {
    if (api.scripting.insertCSS) {
      await api.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
    }
  } catch (_) {
    // The stylesheet is already declared for content_scripts matches; injection
    // here only matters for tabs that existed before the extension was loaded.
  }
  return true;
}

async function waitForContentScript(tabId) {
  const deadline = Date.now() + CONTENT_READY_TIMEOUT_MS;
  let injectedOk = false;
  while (Date.now() < deadline) {
    const pong = await sendMessageToTab(tabId, { type: 'falbor:ping' });
    if (pong && pong.type === 'falbor:pong') return true;
    if (!injectedOk) injectedOk = await injectContentScript(tabId);
    await delay(1000);
  }
  return false;
}

function waitForTaskResult(taskId, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pendingTask && pendingTask.taskId === taskId) pendingTask = null;
      resolve({
        status: 'outcome_unknown',
        error: 'The extension stopped receiving status updates before the outcome could be confirmed.',
      });
    }, timeoutMs);
    pendingTask = {
      taskId,
      resolve: (result) => {
        clearTimeout(timer);
        resolve(result);
      },
    };
  });
}

async function finishTask(taskId, result) {
  let stored = {};
  try {
    stored = await getStorage([STORAGE.TOKEN, STORAGE.BACKEND_URL, STORAGE.TASK_STATE]);
  } catch (_) {
    stored = {};
  }
  const token = stored[STORAGE.TOKEN];
  let reportError = null;
  if (!token) {
    reportError = 'Not connected to Falbor; the task result could not be reported.';
  } else {
    const response = await reportResult(stored[STORAGE.BACKEND_URL], token, taskId, result);
    if (!response.ok) reportError = errorMessage(response, 'Could not report the task result');
  }
  const updates = { [STORAGE.LAST_SYNC]: Date.now() };
  if (reportError) updates[STORAGE.LAST_ERROR] = reportError;
  const state = stored[STORAGE.TASK_STATE];
  if (state && state.taskId === taskId) {
    if (result && result.status === 'cancelled_by_user') {
      updates[STORAGE.TASK_STATE] = {
        taskId,
        draftId: state.draftId || null,
        phase: 'done',
        message: 'Cancelled by the user.',
        updatedAt: Date.now(),
      };
    } else if (reportError) {
      // Keep the error visible in the popup; the next poll will move on.
      updates[STORAGE.TASK_STATE] = {
        taskId,
        draftId: state.draftId || null,
        phase: 'error',
        message: reportError,
        updatedAt: Date.now(),
      };
    } else {
      updates[STORAGE.TASK_STATE] = null;
    }
  }
  await setStorage(updates);
  return result;
}

async function executeTask(task) {
  const taskId = task && task.id;
  const payload = (task && task.payload) || {};
  if (!taskId) return;
  if (!payload.threadUrl) {
    await finishTask(taskId, { status: 'failed', error: 'The task is missing required data (the Reddit thread URL).' });
    return;
  }
  let filled = false;
  lastActiveTabId = null;
  try {
    await setTaskState(taskId, 'claiming', 'Task received from Falbor.', { draftId: payload.draftId });
    await setTaskState(taskId, 'opening', 'Opening the Reddit discussion...', { draftId: payload.draftId });
    const tab = await findOrOpenTab(payload);
    if (!tab || tab.id == null) throw new Error('Could not open a Reddit tab.');
    lastActiveTabId = tab.id;
    await setTaskState(taskId, 'opening', 'Waiting for the Reddit page to become ready...', {
      draftId: payload.draftId,
      tabId: tab.id,
    });

    const ready = await waitForContentScript(tab.id);
    if (!ready) {
      await finishTask(taskId, {
        status: 'failed',
        error: 'The Reddit page did not respond to the Falbor extension. Reload the Reddit tab and try again.',
      });
      return;
    }

    await setTaskState(taskId, 'filling', 'Prefilling the approved comment into the Reddit editor...', {
      draftId: payload.draftId,
      tabId: tab.id,
    });
    const ack = await sendMessageToTab(tab.id, {
      type: 'falbor:fill',
      payload: {
        taskId,
        draftId: payload.draftId,
        subreddit: payload.subreddit,
        threadUrl: payload.threadUrl,
        threadExternalId: payload.threadExternalId,
        title: payload.title,
        body: payload.body,
        contentHash: payload.contentHash,
      },
    });

    if (!ack) {
      await finishTask(taskId, {
        status: 'failed',
        error: 'The Reddit content script did not acknowledge the fill request.',
      });
      return;
    }
    if (ack.ok === false) {
      const result = ack.result || { status: 'failed', error: 'The Reddit page rejected the fill request.' };
      if (result.status === 'cancelled_by_user' && directlyReportedTaskId === taskId) {
        await setTaskState(taskId, 'done', 'Cancelled by the user.', { draftId: payload.draftId });
      } else {
        await finishTask(taskId, result);
      }
      return;
    }

    filled = true;
    await setTaskState(
      taskId,
      'awaiting_user',
      "The approved comment is prefilled. Review it, then click Reddit's Comment button yourself.",
      { draftId: payload.draftId, tabId: tab.id },
    );

    const result = await waitForTaskResult(taskId, RESULT_TIMEOUT_MS);
    await finishTask(taskId, result);
  } catch (err) {
    const message = truncateError(err);
    // If the editor was already prefilled, the state of the submission is not
    // knowable from here; report outcome_unknown instead of inventing failure.
    const result = filled
      ? { status: 'outcome_unknown', error: 'The extension lost track of the task before confirming an outcome: ' + message }
      : { status: 'failed', error: message };
    await finishTask(taskId, result);
  } finally {
    pendingTask = null;
    lastActiveTabId = null;
  }
}

async function handleContentResult(taskId, result) {
  if (!result || typeof result !== 'object') return;
  if (pendingTask && pendingTask.taskId === taskId) {
    const pending = pendingTask;
    pendingTask = null;
    pending.resolve(result);
    return;
  }
  // The service worker may have been restarted while a task was awaiting the
  // user; report directly from the persisted task id.
  let stored = {};
  try {
    stored = await getStorage([STORAGE.TOKEN, STORAGE.BACKEND_URL, STORAGE.TASK_STATE]);
  } catch (_) {
    return;
  }
  const state = stored[STORAGE.TASK_STATE];
  const id = taskId || (state && state.taskId);
  if (!id) return;
  const token = stored[STORAGE.TOKEN];
  if (!token) {
    await setStorage({
      [STORAGE.LAST_ERROR]: 'Not connected to Falbor; the task result could not be reported.',
    });
    return;
  }
  const response = await reportResult(stored[STORAGE.BACKEND_URL], token, id, result);
  const updates = { [STORAGE.LAST_SYNC]: Date.now() };
  if (!response.ok) updates[STORAGE.LAST_ERROR] = errorMessage(response, 'Could not report the task result');
  else updates[STORAGE.LAST_ERROR] = null;
  if (state && state.taskId === id) updates[STORAGE.TASK_STATE] = null;
  await setStorage(updates);
}

async function applyProgress(message) {
  try {
    const stored = await getStorage(STORAGE.TASK_STATE);
    const current = stored[STORAGE.TASK_STATE];
    if (!current) return;
    if (message.taskId && current.taskId !== message.taskId) return;
    await setStorage({
      [STORAGE.TASK_STATE]: {
        ...current,
        message: typeof message.message === 'string' ? message.message : current.message,
        updatedAt: Date.now(),
      },
    });
  } catch (_) {
    // Progress reporting is best-effort.
  }
}

async function cancelCurrentTask() {
  const stored = await getStorage(STORAGE.TASK_STATE);
  const state = stored[STORAGE.TASK_STATE];
  if (!state || !isActivePhase(state.phase)) {
    return { ok: false, error: 'There is no active task to cancel.' };
  }
  const tabId = state.tabId != null ? state.tabId : lastActiveTabId;
  if (tabId != null) {
    await sendMessageToTab(tabId, { type: 'falbor:cancel' });
  }
  await setStorage({
    [STORAGE.TASK_STATE]: {
      taskId: state.taskId || null,
      draftId: state.draftId || null,
      phase: 'done',
      message: 'Cancelled by the user.',
      updatedAt: Date.now(),
    },
  });
  if (pendingTask) {
    const pending = pendingTask;
    pendingTask = null;
    pending.resolve({ status: 'cancelled_by_user' });
  } else if (state.taskId) {
    const auth = await getStorage([STORAGE.TOKEN, STORAGE.BACKEND_URL]);
    const token = auth[STORAGE.TOKEN];
    if (token) {
      await reportResult(auth[STORAGE.BACKEND_URL], token, state.taskId, { status: 'cancelled_by_user' });
      directlyReportedTaskId = state.taskId;
      await setStorage({ [STORAGE.LAST_SYNC]: Date.now() });
    }
  }
  return { ok: true };
}

async function getState() {
  await ensureInstallationId();
  const stored = await getStorage(Object.values(STORAGE));
  const taskState = stored[STORAGE.TASK_STATE] || null;
  let agent = null;
  try {
    agent = await getAgentRunState();
  } catch (_) {
    agent = null;
  }
  return {
    type: 'falbor:state',
    connected: !!stored[STORAGE.TOKEN],
    workspaceId: stored[STORAGE.WORKSPACE_ID] || null,
    backendUrl: stored[STORAGE.BACKEND_URL] || DEFAULT_BACKEND_URL,
    installationId: stored[STORAGE.INSTALLATION_ID] || null,
    taskState,
    taskActive: !!(taskState && isActivePhase(taskState.phase)),
    agent,
    lastSync: typeof stored[STORAGE.LAST_SYNC] === 'number' ? stored[STORAGE.LAST_SYNC] : null,
    lastError: stored[STORAGE.LAST_ERROR] || null,
    heartbeat: stored[STORAGE.LAST_HEARTBEAT] || null,
  };
}

api.runtime.onInstalled.addListener(() => {
  createPollAlarm();
  void ensureInstallationId();
});

api.runtime.onStartup.addListener(() => {
  createPollAlarm();
  void ensureInstallationId();
});

api.alarms.onAlarm.addListener((alarm) => {
  if (!alarm) return;
  if (alarm.name === POLL_ALARM) void pollOnce();
  if (alarm.name === AGENT_ALARM) void agentTick();
});

api.tabs.onRemoved.addListener((tabId) => {
  void agentHandleTabRemoved(tabId);
});

api.tabs.onUpdated.addListener((tabId, changeInfo) => {
  void agentHandleTabUpdated(tabId, changeInfo);
});

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (!message || typeof message.type !== 'string') return undefined;
    switch (message.type) {
      case 'falbor:get-state':
        getState().then(sendResponse, (err) =>
          sendResponse({ type: 'falbor:state', error: truncateError(err) }),
        );
        return true;
      case 'falbor:check-now':
        void pollOnce();
        sendResponse({ ok: true });
        return undefined;
      case 'falbor:cancel-task':
        cancelCurrentTask().then(sendResponse, (err) => sendResponse({ ok: false, error: truncateError(err) }));
        return true;
      case 'falbor:cancel-requested':
        void cancelCurrentTask();
        sendResponse({ ok: true });
        return undefined;
      case 'falbor:result':
        void handleContentResult(message.taskId, message.result);
        sendResponse({ ok: true });
        return undefined;
      case 'falbor:progress':
        void applyProgress(message);
        sendResponse({ ok: true });
        return undefined;
      case 'falbor:agent-control':
        agentControl(message.action, message.config).then(sendResponse, (err) =>
          sendResponse({ ok: false, error: truncateError(err) }),
        );
        return true;
      case 'falbor:agent-refresh':
        void agentTick();
        sendResponse({ ok: true });
        return undefined;
      case 'falbor:agent-session':
        agentSessionForContent(message.maxAgeMs, sender && sender.tab ? sender.tab.id : null).then(
          sendResponse,
          (err) => sendResponse({ ok: false, error: truncateError(err) }),
        );
        return true;
      case 'falbor:agent-observe':
        agentObservePayload(message.payload || {}, sender && sender.tab ? sender.tab.id : null).then(
          sendResponse,
          (err) => sendResponse({ ok: false, status: 0, error: truncateError(err) }),
        );
        return true;
      case 'falbor:agent-action-report':
        agentReportPayload(message.body || {}).then(
          sendResponse,
          (err) => sendResponse({ ok: false, status: 0, error: truncateError(err) }),
        );
        return true;
      default:
        return undefined;
    }
  } catch (err) {
    try {
      sendResponse({ ok: false, error: truncateError(err) });
    } catch (_) {
      // Channel already closed.
    }
    return undefined;
  }
});
