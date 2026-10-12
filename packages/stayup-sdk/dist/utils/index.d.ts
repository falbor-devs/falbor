export declare function generateFingerprint(message?: string, stacktrace?: string, url?: string): string;
export declare function getBrowserInfo(): {
    userAgent?: undefined;
    language?: undefined;
    url?: undefined;
    viewportWidth?: undefined;
    viewportHeight?: undefined;
} | {
    userAgent: string;
    language: string;
    url: string;
    viewportWidth: number;
    viewportHeight: number;
};
