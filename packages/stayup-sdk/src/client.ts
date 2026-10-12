import { StayUpConfig, StayUpEvent, Severity, StayUpPayload } from './types';
import { generateFingerprint, getBrowserInfo } from './utils';

export class StayUpClient {
  private config: StayUpConfig;
  private queue: StayUpEvent[] = [];
  private flushTimer: any = null;
  private endpoint: string;
  private eventCache = new Set<string>(); // For basic rate limiting / deduplication in same session

  constructor(config: StayUpConfig) {
    if (!config.projectId || !config.apiKey) {
      console.error('[StayUp] Initialization failed: projectId and apiKey are required.');
    }
    
    this.config = {
      environment: 'production',
      notifyOn: ['error', 'critical'],
      ...config
    };
    
    this.endpoint = this.config.endpoint || 'https://api.stayup.cloud/v1/ingest';
  }

  public captureError(error: Error, metadata?: Record<string, any>) {
    this.captureEvent({
      severity: 'error',
      message: error.message,
      stacktrace: error.stack,
      metadata
    });
  }

  public captureMessage(message: string, severity: Severity = 'info', metadata?: Record<string, any>) {
    this.captureEvent({
      severity,
      message,
      metadata
    });
  }

  public trackEvent(name: string, metadata?: Record<string, any>) {
    this.captureEvent({
      severity: 'info',
      message: `Event: ${name}`,
      metadata
    });
  }

  public captureEvent(eventData: Partial<StayUpEvent>) {
    const fingerprint = generateFingerprint(eventData.message, eventData.stacktrace, eventData.url);
    
    // Deduplication within 1 minute for same fingerprint
    const cacheKey = `${fingerprint}-${Math.floor(Date.now() / 60000)}`;
    if (this.eventCache.has(cacheKey)) {
      return; // Deduplicated
    }
    this.eventCache.add(cacheKey);

    const event: StayUpEvent = {
      severity: eventData.severity || 'error',
      message: eventData.message,
      stacktrace: eventData.stacktrace,
      url: eventData.url || (typeof window !== 'undefined' ? window.location.href : undefined),
      method: eventData.method,
      metadata: eventData.metadata || {},
      browserInfo: getBrowserInfo() as any,
      timestamp: new Date().toISOString(),
      fingerprint
    };

    this.queue.push(event);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    
    // Batch events every 2 seconds
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, 2000);
  }

  private async flush() {
    this.flushTimer = null;
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];

    const payload: StayUpPayload = {
      projectId: this.config.projectId,
      environment: this.config.environment!,
      events: eventsToSend
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(payload),
        // Ensure request doesn't block unmounting or page unload
        keepalive: true 
      });
      
      if (!response.ok) {
        // Fallback or retry logic can be implemented here
        // If server is unavailable, we don't block the main thread.
        console.warn('[StayUp] Failed to transmit telemetry. Status:', response.status);
      }
    } catch (e) {
      console.warn('[StayUp] Network failure while transmitting telemetry.');
    }
  }
}
