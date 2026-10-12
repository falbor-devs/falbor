"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBrowserIntegrations = setupBrowserIntegrations;
function setupBrowserIntegrations(client, config) {
    if (typeof window === 'undefined')
        return;
    // 1. Console Errors
    if (!config.disableConsole) {
        const originalConsoleError = console.error;
        console.error = function (...args) {
            // Capture before calling original to ensure we get it
            try {
                const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                client.captureMessage(message, 'error', { source: 'console.error' });
            }
            catch (e) {
                // Ignore JSON stringify errors
            }
            originalConsoleError.apply(console, args);
        };
    }
    // 2. Uncaught Exceptions
    if (!config.disableUncaughtException) {
        window.addEventListener('error', (event) => {
            var _a;
            client.captureEvent({
                severity: 'critical',
                message: event.message,
                stacktrace: (_a = event.error) === null || _a === void 0 ? void 0 : _a.stack,
                url: event.filename,
                metadata: {
                    line: event.lineno,
                    col: event.colno,
                    source: 'window.onerror'
                }
            });
        });
    }
    // 3. Unhandled Promise Rejections
    if (!config.disableUnhandledPromiseRejection) {
        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            let message = 'Unhandled Promise Rejection';
            let stacktrace;
            if (reason instanceof Error) {
                message = reason.message;
                stacktrace = reason.stack;
            }
            else if (typeof reason === 'string') {
                message = reason;
            }
            client.captureEvent({
                severity: 'critical',
                message,
                stacktrace,
                metadata: { source: 'unhandledrejection', reason: typeof reason !== 'object' ? String(reason) : 'object' }
            });
        });
    }
    // 4. Fetch Tracking (Failed Requests & 4xx/5xx)
    if (!config.disableFetchTracking) {
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            var _a, _b;
            try {
                const response = await originalFetch.apply(this, args);
                if (!response.ok) {
                    const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : 'unknown');
                    client.captureEvent({
                        severity: response.status >= 500 ? 'error' : 'warning',
                        message: `Fetch failed with status ${response.status}`,
                        url,
                        method: (((_a = args[1]) === null || _a === void 0 ? void 0 : _a.method) || 'GET').toUpperCase(),
                        metadata: {
                            status: response.status,
                            source: 'fetch'
                        }
                    });
                }
                return response;
            }
            catch (error) {
                const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : 'unknown');
                client.captureEvent({
                    severity: 'error',
                    message: error.message || 'Fetch network failure',
                    url,
                    method: (((_b = args[1]) === null || _b === void 0 ? void 0 : _b.method) || 'GET').toUpperCase(),
                    metadata: { source: 'fetch_network_error' }
                });
                throw error;
            }
        };
    }
    // 5. XMLHttpRequest Tracking
    if (!config.disableXhrTracking) {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this._stayupMethod = method;
            this._stayupUrl = typeof url === 'string' ? url : url.toString();
            return originalOpen.apply(this, [method, url, ...rest]);
        };
        XMLHttpRequest.prototype.send = function (...args) {
            this.addEventListener('loadend', () => {
                var _a;
                if (this.status >= 400 || this.status === 0) {
                    client.captureEvent({
                        severity: this.status >= 500 || this.status === 0 ? 'error' : 'warning',
                        message: this.status === 0 ? 'XHR network failure or timeout' : `XHR failed with status ${this.status}`,
                        url: this._stayupUrl,
                        method: (_a = this._stayupMethod) === null || _a === void 0 ? void 0 : _a.toUpperCase(),
                        metadata: {
                            status: this.status,
                            source: 'xhr'
                        }
                    });
                }
            });
            return originalSend.apply(this, args);
        };
    }
}
