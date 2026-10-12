'use client';
import { memo, useEffect } from 'react';
import type { Terminal as XTerm } from '@xterm/xterm';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('TerminalManager');

interface TerminalManagerProps {
  terminal: XTerm | null;
  isActive: boolean;
  onReconnect?: () => void;
}

export const TerminalManager = memo(({ terminal, isActive }: TerminalManagerProps) => {
  

  
  useEffect(() => {
    if (!terminal) {
      return undefined;
    }

    const disposables: Array<{ dispose: () => void }> = [];

    
    const onPasteKeyDisposable = terminal.onKey((e) => {
      
      if ((e.domEvent.ctrlKey || e.domEvent.metaKey) && e.domEvent.key === 'v') {
        if (!isActive) {
          return;
        }

        
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard
            .readText()
            .then((text) => {
              if (text && terminal) {
                terminal.paste(text);
              }
            })
            .catch((err) => {
              logger.warn('Failed to read clipboard:', err);
            });
        }
      }
    });

    disposables.push(onPasteKeyDisposable);

    return () => {
      disposables.forEach((d) => d.dispose());
    };
  }, [terminal, isActive]);

  
  useEffect(() => {
    if (isActive && terminal) {
      
      setTimeout(() => {
        terminal.focus();
      }, 100);
    }
  }, [isActive, terminal]);

  return null; 
});

TerminalManager.displayName = 'TerminalManager';
