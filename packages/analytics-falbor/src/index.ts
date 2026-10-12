export interface AnalyticsOptions {
  projectId: string;
  endpoint?: string;
  environment?: string;
  options?: {
    enableAutoTracking?: boolean;
    debugMode?: boolean;
  };
}

export interface AnalyticsEvent {
  projectId: string;
  event: string;
  path: string;
  referrer: string;
  url: string;
  timestamp: number;
  properties?: Record<string, any>;
}

class FalborAnalytics {
  private config: AnalyticsOptions | null = null;
  private initialized = false;
  private defaultEndpoint = 'https://analytics.falbor.xyz/api/event';

  init(config: AnalyticsOptions) {
    this.config = config;
    this.initialized = true;

    if (this.config.options?.debugMode) {
      console.log('[Falbor Analytics] Initialized with config:', this.config);
    }

    if (this.config.options?.enableAutoTracking) {
      this.setupAutoTracking();
    }

    return this;
  }

  private setupAutoTracking() {
    if (typeof window === 'undefined') return;

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

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.initialized || !this.config) {
      console.warn('[Falbor Analytics] SDK not initialized. Call init() first.');
      return;
    }

    if (typeof window === 'undefined') return; // Do not run on server-side

    const endpoint = this.config.endpoint || this.defaultEndpoint;
    
    const payload: AnalyticsEvent = {
      projectId: this.config.projectId,
      event: eventName,
      path: window.location.pathname,
      referrer: document.referrer,
      url: window.location.href,
      timestamp: Date.now(),
      properties,
    };

    if (this.config.options?.debugMode) {
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
    } catch (error) {
      if (this.config.options?.debugMode) {
        console.error('[Falbor Analytics] Error sending event:', error);
      }
    }
  }
}

export const analytics = new FalborAnalytics();

export function initFalborAnalytics(config: AnalyticsOptions) {
  return analytics.init(config);
}

export default analytics;
