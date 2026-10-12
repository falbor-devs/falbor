import { StayUpConfig, StayUpEvent, Severity } from './types';
export declare class StayUpClient {
    private config;
    private queue;
    private flushTimer;
    private endpoint;
    private eventCache;
    constructor(config: StayUpConfig);
    captureError(error: Error, metadata?: Record<string, any>): void;
    captureMessage(message: string, severity?: Severity, metadata?: Record<string, any>): void;
    trackEvent(name: string, metadata?: Record<string, any>): void;
    captureEvent(eventData: Partial<StayUpEvent>): void;
    private scheduleFlush;
    private flush;
}
