"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StayUpClient = void 0;
const utils_1 = require("./utils");
class StayUpClient {
    constructor(config) {
        this.queue = [];
        this.flushTimer = null;
        this.eventCache = new Set(); // For basic rate limiting / deduplication in same session
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
    captureError(error, metadata) {
        this.captureEvent({
            severity: 'error',
            message: error.message,
            stacktrace: error.stack,
            metadata
        });
    }
    captureMessage(message, severity = 'info', metadata) {
        this.captureEvent({
            severity,
            message,
            metadata
        });
    }
    trackEvent(name, metadata) {
        this.captureEvent({
            severity: 'info',
            message: `Event: ${name}`,
            metadata
        });
    }
    captureEvent(eventData) {
        const fingerprint = (0, utils_1.generateFingerprint)(eventData.message, eventData.stacktrace, eventData.url);
        // Deduplication within 1 minute for same fingerprint
        const cacheKey = `${fingerprint}-${Math.floor(Date.now() / 60000)}`;
        if (this.eventCache.has(cacheKey)) {
            return; // Deduplicated
        }
        this.eventCache.add(cacheKey);
        const event = {
            severity: eventData.severity || 'error',
            message: eventData.message,
            stacktrace: eventData.stacktrace,
            url: eventData.url || (typeof window !== 'undefined' ? window.location.href : undefined),
            method: eventData.method,
            metadata: eventData.metadata || {},
            browserInfo: (0, utils_1.getBrowserInfo)(),
            timestamp: new Date().toISOString(),
            fingerprint
        };
        this.queue.push(event);
        this.scheduleFlush();
    }
    scheduleFlush() {
        if (this.flushTimer)
            return;
        // Batch events every 2 seconds
        this.flushTimer = setTimeout(() => {
            this.flush();
        }, 2000);
    }
    async flush() {
        this.flushTimer = null;
        if (this.queue.length === 0)
            return;
        const eventsToSend = [...this.queue];
        this.queue = [];
        const payload = {
            projectId: this.config.projectId,
            environment: this.config.environment,
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
        }
        catch (e) {
            console.warn('[StayUp] Network failure while transmitting telemetry.');
        }
    }
}
exports.StayUpClient = StayUpClient;
