// Promisified WebExtension API shim.
//
// The source files are concatenated into classic scripts by build.mjs, so this
// module must not use imports. `browser` (Firefox, promise-based) is preferred
// when present; otherwise `chrome`'s callback APIs are wrapped with promises.

const IS_FIREFOX = typeof browser !== 'undefined' && !!browser && !!browser.runtime;

export const api = IS_FIREFOX ? browser : chrome;

function chromeCall(fn, thisArg, ...args) {
  return new Promise((resolve, reject) => {
    try {
      fn.call(thisArg, ...args, (result) => {
        const lastError = chrome.runtime && chrome.runtime.lastError;
        if (lastError) reject(new Error(lastError.message || 'Extension API error'));
        else resolve(result);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function getStorage(key) {
  if (IS_FIREFOX) return api.storage.local.get(key);
  return chromeCall(api.storage.local.get, api.storage.local, key);
}

export function setStorage(items) {
  if (IS_FIREFOX) return api.storage.local.set(items);
  return chromeCall(api.storage.local.set, api.storage.local, items);
}

export function removeStorage(key) {
  if (IS_FIREFOX) return api.storage.local.remove(key);
  return chromeCall(api.storage.local.remove, api.storage.local, key);
}

export function queryTabs(queryInfo) {
  if (IS_FIREFOX) return api.tabs.query(queryInfo);
  return chromeCall(api.tabs.query, api.tabs, queryInfo);
}

// Resolves with the tab, or null when it no longer exists.
export async function getTab(tabId) {
  try {
    if (IS_FIREFOX) return await api.tabs.get(tabId);
    return await chromeCall(api.tabs.get, api.tabs, tabId);
  } catch (_) {
    return null;
  }
}

export function createTab(properties) {
  if (IS_FIREFOX) return api.tabs.create(properties);
  return chromeCall(api.tabs.create, api.tabs, properties);
}

export function updateTab(tabId, properties) {
  if (IS_FIREFOX) return api.tabs.update(tabId, properties);
  return chromeCall(api.tabs.update, api.tabs, tabId, properties);
}

// Resolves with the response, or null when no receiver is available.
export async function sendMessageToTab(tabId, message) {
  try {
    if (IS_FIREFOX) return await api.tabs.sendMessage(tabId, message);
    return await chromeCall(api.tabs.sendMessage, api.tabs, tabId, message);
  } catch (_) {
    return null;
  }
}

// Resolves with the response, or null when no listener answered.
export async function sendRuntimeMessage(message) {
  try {
    if (IS_FIREFOX) return await api.runtime.sendMessage(message);
    return await chromeCall(api.runtime.sendMessage, api.runtime, message);
  } catch (_) {
    return null;
  }
}

export async function openOptionsPage() {
  if (!api.runtime.openOptionsPage) return null;
  try {
    if (IS_FIREFOX) return await api.runtime.openOptionsPage();
    return await chromeCall(api.runtime.openOptionsPage, api.runtime);
  } catch (_) {
    return null;
  }
}
