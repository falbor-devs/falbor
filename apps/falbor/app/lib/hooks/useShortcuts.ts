import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import { shortcutsStore, type Shortcuts } from '~/lib/stores/settings';
import { isMac } from '~/utils/os';

const INPUT_ELEMENTS = ['input', 'textarea'];

class ShortcutEventEmitter {
  #emitter = new EventTarget();

  dispatch(type: keyof Shortcuts) {
    this.#emitter.dispatchEvent(new Event(type));
  }

  on(type: keyof Shortcuts, cb: VoidFunction) {
    this.#emitter.addEventListener(type, cb);

    return () => {
      this.#emitter.removeEventListener(type, cb);
    };
  }
}

export const shortcutEventEmitter = new ShortcutEventEmitter();

export function useShortcuts(): void {
  const shortcuts = useStore(shortcutsStore);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {

      if (
        document.activeElement &&
        INPUT_ELEMENTS.includes(document.activeElement.tagName.toLowerCase()) &&
        !event.altKey &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        return;
      }

      for (const [name, shortcut] of Object.entries(shortcuts)) {
        const keyMatches =
          shortcut.key.toLowerCase() === event.key.toLowerCase() || `Key${shortcut.key.toUpperCase()}` === event.code;

        const ctrlOrMetaKeyMatches = shortcut.ctrlOrMetaKey
          ? (isMac && event.metaKey) || (!isMac && event.ctrlKey)
          : true;

        const modifiersMatch =
          ctrlOrMetaKeyMatches &&
          (shortcut.ctrlKey === undefined || shortcut.ctrlKey === event.ctrlKey) &&
          (shortcut.metaKey === undefined || shortcut.metaKey === event.metaKey) &&
          (shortcut.shiftKey === undefined || shortcut.shiftKey === event.shiftKey) &&
          (shortcut.altKey === undefined || shortcut.altKey === event.altKey);

        if (keyMatches && modifiersMatch) {

          if (shortcut.isPreventDefault) {
            event.preventDefault();
            event.stopPropagation();
          }

          shortcutEventEmitter.dispatch(name as keyof Shortcuts);
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}
