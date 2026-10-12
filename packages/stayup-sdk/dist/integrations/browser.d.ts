import { StayUpClient } from '../client';
import { StayUpConfig } from '../types';
export declare function setupBrowserIntegrations(client: StayUpClient, config: StayUpConfig): void;
declare global {
    interface XMLHttpRequest {
        _stayupMethod?: string;
        _stayupUrl?: string;
    }
}
