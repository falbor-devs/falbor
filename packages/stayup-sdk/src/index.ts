import { StayUpClient } from './client';
import { StayUpConfig } from './types';
import { setupBrowserIntegrations } from './integrations/browser';

export * from './types';
export * from './client';

let globalClient: StayUpClient | null = null;

export function init(config: StayUpConfig): StayUpClient {
  if (globalClient) {
    console.warn('[StayUp] SDK is already initialized.');
    return globalClient;
  }

  globalClient = new StayUpClient(config);
  setupBrowserIntegrations(globalClient, config);
  
  return globalClient;
}

export function captureError(error: Error, metadata?: Record<string, any>) {
  if (!globalClient) return;
  globalClient.captureError(error, metadata);
}

export function captureMessage(message: string, severity: import('./types').Severity = 'info', metadata?: Record<string, any>) {
  if (!globalClient) return;
  globalClient.captureMessage(message, severity, metadata);
}

export function trackEvent(name: string, metadata?: Record<string, any>) {
  if (!globalClient) return;
  globalClient.trackEvent(name, metadata);
}

const stayup = {
  init,
  captureError,
  captureMessage,
  trackEvent
};

export default stayup;
