// Visible agent overlay for Reddit pages.
//
// Renders a small status card, a synthetic pointer dot that is visually
// distinct from the OS cursor, a scroll cue, and element highlights so the
// user can watch the agent work. Styles live in content.css; this module only
// builds DOM and updates text, so it stays CSP-safe on reddit.com.

const OVERLAY_ID = 'falbor-agent-overlay';
const POINTER_ID = 'falbor-agent-pointer';
const SCROLL_CUE_ID = 'falbor-scroll-cue';
const HIGHLIGHT_CLASS = 'falbor-agent-highlight';

let overlayPauseHandler = null;
let overlayStopHandler = null;

function agentOverlaySetHandlers(handlers) {
  overlayPauseHandler = handlers && handlers.onPause ? handlers.onPause : null;
  overlayStopHandler = handlers && handlers.onStop ? handlers.onStop : null;
}

function agentOverlayEnsure() {
  let overlay = document.getElementById(OVERLAY_ID);
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');

  const header = document.createElement('div');
  header.className = 'falbor-agent-header';
  const dot = document.createElement('span');
  dot.className = 'falbor-agent-dot';
  dot.setAttribute('data-state', 'idle');
  const title = document.createElement('span');
  title.className = 'falbor-agent-title';
  title.textContent = 'Falbor Agent';
  const status = document.createElement('span');
  status.className = 'falbor-agent-status';
  status.setAttribute('data-field', 'status');
  status.textContent = 'idle';
  header.appendChild(dot);
  header.appendChild(title);
  header.appendChild(status);

  const rows = document.createElement('dl');
  rows.className = 'falbor-agent-rows';
  const fields = [
    ['connection', 'Connection'],
    ['activity', 'Activity'],
    ['discussion', 'Discussion'],
    ['lastAction', 'Last action'],
    ['inspected', 'Inspected'],
    ['opportunities', 'Opportunities'],
  ];
  for (const [key, label] of fields) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.setAttribute('data-field', key);
    dd.textContent = '—';
    rows.appendChild(dt);
    rows.appendChild(dd);
  }

  const error = document.createElement('p');
  error.className = 'falbor-agent-error';
  error.setAttribute('data-field', 'error');
  error.hidden = true;

  const actions = document.createElement('div');
  actions.className = 'falbor-agent-actions';
  const pause = document.createElement('button');
  pause.type = 'button';
  pause.id = 'falbor-agent-pause';
  pause.textContent = 'Pause';
  pause.addEventListener('click', () => {
    if (overlayPauseHandler) overlayPauseHandler();
  });
  const stop = document.createElement('button');
  stop.type = 'button';
  stop.id = 'falbor-agent-stop';
  stop.textContent = 'Stop';
  stop.addEventListener('click', () => {
    if (overlayStopHandler) overlayStopHandler();
  });
  actions.appendChild(pause);
  actions.appendChild(stop);

  overlay.appendChild(header);
  overlay.appendChild(rows);
  overlay.appendChild(error);
  overlay.appendChild(actions);

  (document.body || document.documentElement).appendChild(overlay);
  return overlay;
}

function agentOverlaySetField(overlay, key, value) {
  const node = overlay.querySelector('[data-field="' + key + '"]');
  if (node) node.textContent = value == null || value === '' ? '—' : String(value);
}

function agentOverlayRender(state) {
  const overlay = agentOverlayEnsure();
  const data = state || {};
  overlay.setAttribute('data-status', String(data.status || 'idle'));
  const dot = overlay.querySelector('.falbor-agent-dot');
  if (dot) {
    dot.setAttribute(
      'data-state',
      data.status === 'running' ? 'running' : data.status === 'paused' ? 'paused' : data.status === 'error' ? 'error' : 'idle',
    );
  }
  agentOverlaySetField(overlay, 'status', data.status || 'idle');
  agentOverlaySetField(overlay, 'connection', data.connected === false ? 'disconnected' : 'connected');
  agentOverlaySetField(overlay, 'activity', data.activity || 'Waiting for instructions');
  agentOverlaySetField(overlay, 'discussion', data.discussion || '—');
  agentOverlaySetField(overlay, 'lastAction', data.lastAction || '—');
  agentOverlaySetField(overlay, 'inspected', data.inspected == null ? '0' : String(data.inspected));
  agentOverlaySetField(overlay, 'opportunities', data.opportunities == null ? '0' : String(data.opportunities));
  const error = overlay.querySelector('[data-field="error"]');
  if (error) {
    if (data.error) {
      error.textContent = String(data.error);
      error.hidden = false;
    } else {
      error.textContent = '';
      error.hidden = true;
    }
  }
  const pause = overlay.querySelector('#falbor-agent-pause');
  const stop = overlay.querySelector('#falbor-agent-stop');
  const running = data.status === 'running';
  if (pause) {
    pause.disabled = !running;
    pause.textContent = data.status === 'paused' ? 'Paused' : 'Pause';
  }
  if (stop) stop.disabled = !running && data.status !== 'paused';
  return overlay;
}

function agentOverlayRemove() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
  agentPointerHide();
  agentHideScrollCue();
  agentClearHighlights();
}

function agentPointerEnsure() {
  let pointer = document.getElementById(POINTER_ID);
  if (pointer) return pointer;
  pointer = document.createElement('div');
  pointer.id = POINTER_ID;
  pointer.setAttribute('aria-hidden', 'true');
  (document.body || document.documentElement).appendChild(pointer);
  return pointer;
}

function agentPointerTo(node) {
  if (!node || !node.getBoundingClientRect) return;
  const pointer = agentPointerEnsure();
  const rect = node.getBoundingClientRect();
  pointer.style.left = String(Math.round(rect.right - 14 + window.scrollX)) + 'px';
  pointer.style.top = String(Math.round(rect.top + Math.min(24, rect.height / 2) + window.scrollY)) + 'px';
  pointer.classList.add('falbor-agent-pointer-visible');
}

function agentPointerHide() {
  const pointer = document.getElementById(POINTER_ID);
  if (pointer) pointer.classList.remove('falbor-agent-pointer-visible');
}

function agentShowScrollCue(text) {
  let cue = document.getElementById(SCROLL_CUE_ID);
  if (!cue) {
    cue = document.createElement('div');
    cue.id = SCROLL_CUE_ID;
    cue.setAttribute('aria-hidden', 'true');
    (document.body || document.documentElement).appendChild(cue);
  }
  cue.textContent = text || 'Scrolling page…';
  cue.classList.add('falbor-scroll-cue-visible');
}

function agentHideScrollCue() {
  const cue = document.getElementById(SCROLL_CUE_ID);
  if (cue) cue.classList.remove('falbor-scroll-cue-visible');
}

function agentHighlight(node) {
  if (!node || !node.classList) return;
  node.classList.add(HIGHLIGHT_CLASS);
}

function agentClearHighlights() {
  try {
    for (const node of document.querySelectorAll('.' + HIGHLIGHT_CLASS)) {
      node.classList.remove(HIGHLIGHT_CLASS);
    }
  } catch (_) {
    // Best-effort cleanup.
  }
}
