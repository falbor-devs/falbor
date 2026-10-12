import { StayUpClient } from './client';
import { StayUpConfig } from './types';
export * from './types';
export * from './client';
export declare function init(config: StayUpConfig): StayUpClient;
export declare function captureError(error: Error, metadata?: Record<string, any>): void;
export declare function captureMessage(message: string, severity?: import('./types').Severity, metadata?: Record<string, any>): void;
export declare function trackEvent(name: string, metadata?: Record<string, any>): void;
declare const stayup: {
    init: typeof init;
    captureError: typeof captureError;
    captureMessage: typeof captureMessage;
    trackEvent: typeof trackEvent;
};
export default stayup;
