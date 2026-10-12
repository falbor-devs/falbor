"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
exports.captureError = captureError;
exports.captureMessage = captureMessage;
exports.trackEvent = trackEvent;
const client_1 = require("./client");
const browser_1 = require("./integrations/browser");
__exportStar(require("./types"), exports);
__exportStar(require("./client"), exports);
let globalClient = null;
function init(config) {
    if (globalClient) {
        console.warn('[StayUp] SDK is already initialized.');
        return globalClient;
    }
    globalClient = new client_1.StayUpClient(config);
    (0, browser_1.setupBrowserIntegrations)(globalClient, config);
    return globalClient;
}
function captureError(error, metadata) {
    if (!globalClient)
        return;
    globalClient.captureError(error, metadata);
}
function captureMessage(message, severity = 'info', metadata) {
    if (!globalClient)
        return;
    globalClient.captureMessage(message, severity, metadata);
}
function trackEvent(name, metadata) {
    if (!globalClient)
        return;
    globalClient.trackEvent(name, metadata);
}
const stayup = {
    init,
    captureError,
    captureMessage,
    trackEvent
};
exports.default = stayup;
