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
declare class FalborAnalytics {
    private config;
    private initialized;
    private defaultEndpoint;
    init(config: AnalyticsOptions): this;
    private setupAutoTracking;
    track(eventName: string, properties?: Record<string, any>): void;
}
export declare const analytics: FalborAnalytics;
export declare function initFalborAnalytics(config: AnalyticsOptions): FalborAnalytics;
export default analytics;
