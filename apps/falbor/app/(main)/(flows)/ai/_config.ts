// Replaces config.ts + constants.ts + urls.ts from the original app
// In Next.js we don't use import.meta.env — we use process.env

export const IS_RUNNING_ON_CLOUD = false;

const IS_BROWSER = typeof window !== "undefined";

const ORIGIN = IS_BROWSER ? window.location.origin : "http://localhost:3000";

// In Next.js we use our own API routes, not an external backend
// The generate-code endpoint is served by our Next.js API
export const HTTP_BACKEND_URL =
  process.env.NEXT_PUBLIC_AI_HTTP_URL || ORIGIN;

// WebSocket URL for the generate-code endpoint
// We proxy through Next.js so it's the same origin
export const WS_BACKEND_URL =
  process.env.NEXT_PUBLIC_AI_WS_URL || ORIGIN.replace(/^http/, "ws");

export const PICO_BACKEND_FORM_SECRET =
  process.env.NEXT_PUBLIC_AI_FORM_SECRET || null;

export const APP_ERROR_WEB_SOCKET_CODE = 4332;
export const USER_CLOSE_WEB_SOCKET_CODE = 4333;

export const URLS = {
  "intro-to-video":
    "https://github.com/abi/screenshot-to-code/wiki/Screen-Recording-to-Code",
  tips: "https://git.new/s5ywP0e",
};
