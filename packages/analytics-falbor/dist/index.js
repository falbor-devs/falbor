"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analytics = void 0;
exports.initFalborAnalytics = initFalborAnalytics;
class FalborAnalytics {
    constructor() {
        this.config = null;
        this.initialized = false;
        this.defaultEndpoint = 'https://analytics.falbor.xyz/api/event';
    }
    init(config) {
        var _a, _b;
        this.config = config;
        this.initialized = true;
        if ((_a = this.config.options) === null || _a === void 0 ? void 0 : _a.debugMode) {
            console.log('[Falbor Analytics] Initialized with config:', this.config);
        }
        if ((_b = this.config.options) === null || _b === void 0 ? void 0 : _b.enableAutoTracking) {
            this.setupAutoTracking();
        }
        return this;
    }
    setupAutoTracking() {
        if (typeof window === 'undefined')
            return;
        // Track initial pageview
        this.track('pageview');
        // Setup history API interception for SPA navigation tracking
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
            originalPushState.apply(this, args);
            window.dispatchEvent(new Event('pushstate'));
        };
        const originalReplaceState = history.replaceState;
        history.replaceState = function (...args) {
            originalReplaceState.apply(this, args);
            window.dispatchEvent(new Event('replacestate'));
        };
        const handleRouteChange = () => {
            this.track('pageview');
        };
        window.addEventListener('popstate', handleRouteChange);
        window.addEventListener('pushstate', handleRouteChange);
        window.addEventListener('replacestate', handleRouteChange);
        // Track 404s (basic heuristic or to be called explicitly)
        // Note: True 404s are best tracked by explicitly calling track('404') from the router's Not Found component.
    }
    track(eventName, properties) {
        var _a, _b;
        if (!this.initialized || !this.config) {
            console.warn('[Falbor Analytics] SDK not initialized. Call init() first.');
            return;
        }
        if (typeof window === 'undefined')
            return; // Do not run on server-side
        const endpoint = this.config.endpoint || this.defaultEndpoint;
        const payload = {
            projectId: this.config.projectId,
            event: eventName,
            path: window.location.pathname,
            referrer: document.referrer,
            url: window.location.href,
            timestamp: Date.now(),
            properties,
        };
        if ((_a = this.config.options) === null || _a === void 0 ? void 0 : _a.debugMode) {
            console.log(`[Falbor Analytics] Tracking Event: ${eventName}`, payload);
        }
        try {
            fetch(endpoint, {
                method: 'POST',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
        }
        catch (error) {
            if ((_b = this.config.options) === null || _b === void 0 ? void 0 : _b.debugMode) {
                console.error('[Falbor Analytics] Error sending event:', error);
            }
        }
    }
}
exports.analytics = new FalborAnalytics();
function initFalborAnalytics(config) {
    return exports.analytics.init(config);
}
exports.default = exports.analytics;
