'use client';

import type { ITheme } from '@xterm/xterm';

// -------------------------
// SAFE CSS VARIABLE READER
// -------------------------
const getStyle = () => {
  if (typeof window === 'undefined') return null;
  return getComputedStyle(document.documentElement);
};

const cssVar = (token: string) => {
  const style = getStyle();
  return style?.getPropertyValue(token) || undefined;
};

// -------------------------
// MAIN FUNCTION
// -------------------------
export function getTerminalTheme(overrides?: ITheme): ITheme {
  // SSR fallback (prevents Next.js crash)
  if (typeof window === 'undefined') {
    return (overrides ?? {}) as ITheme;
  }

  return {
    cursor: cssVar('--falbor-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--falbor-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--falbor-elements-terminal-textColor'),
    background: cssVar('--falbor-elements-terminal-backgroundColor'),

    selectionBackground: cssVar('--falbor-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--falbor-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--falbor-elements-terminal-selection-backgroundColorInactive'),

    // ANSI colors
    black: cssVar('--falbor-elements-terminal-color-black'),
    red: cssVar('--falbor-elements-terminal-color-red'),
    green: cssVar('--falbor-elements-terminal-color-green'),
    yellow: cssVar('--falbor-elements-terminal-color-yellow'),
    blue: cssVar('--falbor-elements-terminal-color-blue'),
    magenta: cssVar('--falbor-elements-terminal-color-magenta'),
    cyan: cssVar('--falbor-elements-terminal-color-cyan'),
    white: cssVar('--falbor-elements-terminal-color-white'),

    brightBlack: cssVar('--falbor-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--falbor-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--falbor-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--falbor-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--falbor-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--falbor-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--falbor-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--falbor-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}