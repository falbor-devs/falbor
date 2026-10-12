export type Severity = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export interface StayUpConfig {
    projectId: string;
    apiKey: string;
    environment?: string;
    endpoint?: string;
    disableConsole?: boolean;
    disableUnhandledPromiseRejection?: boolean;
    disableUncaughtException?: boolean;
    disableFetchTracking?: boolean;
    disableXhrTracking?: boolean;
    notifyOn?: Severity[];
}
export interface StayUpEvent {
    message?: string;
    stacktrace?: string;
    url?: string;
    method?: string;
    browserInfo?: {
        userAgent: string;
        language: string;
        url: string;
        viewportWidth: number;
        viewportHeight: number;
    };
    metadata?: Record<string, any>;
    severity: Severity;
    timestamp: string;
    fingerprint?: string;
}
export interface StayUpPayload {
    projectId: string;
    environment: string;
    events: StayUpEvent[];
}
