import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

const BOOT_GUARD_KEY = '__webcontainer_boot_promise__';

function bootWebContainer(): Promise<WebContainer> {
  return WebContainer.boot({
    coep: 'credentialless',
    workdirName: WORK_DIR_NAME,
    forwardPreviewErrors: true,
  }).then(async (instance) => {
    webcontainerContext.loaded = true;

    const { workbenchStore } = await import('~/lib/stores/workbench');

    const response = await fetch('/inspector-script.js');
    const inspectorScript = await response.text();
    await instance.setPreviewScript(inspectorScript);

    instance.on('preview-message', (message) => {
      console.log('WebContainer preview message:', message);

      if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
        const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
        const title = isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception';
        workbenchStore.actionAlert.set({
          type: 'preview',
          title,
          description: 'message' in message ? message.message : 'Unknown error',
          content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
          source: 'preview',
        });
      }
    });

    return instance;
  });
}

let resolveWebContainer: (wc: WebContainer) => void;
let rejectWebContainer: (err: any) => void;

let webcontainerPromise: Promise<WebContainer> | undefined = undefined;

if (typeof window !== 'undefined') {
  if (import.meta.hot && import.meta.hot.data.webcontainer) {
    webcontainerPromise = import.meta.hot.data.webcontainer;
  } else if ((window as any)[BOOT_GUARD_KEY]) {
    webcontainerPromise = (window as any)[BOOT_GUARD_KEY];
  } else {
    webcontainerPromise = new Promise<WebContainer>((resolve, reject) => {
      resolveWebContainer = resolve;
      rejectWebContainer = reject;
    });
    (window as any)[BOOT_GUARD_KEY] = webcontainerPromise;
    if (import.meta.hot) {
      import.meta.hot.data.webcontainer = webcontainerPromise;
    }
  }
} else {
  webcontainerPromise = new Promise(() => { });
}

export const webcontainer = webcontainerPromise as Promise<WebContainer>;

export function startWebContainer() {
  if (typeof window === 'undefined') return;
  if ((window as any).__webcontainer_started__) return;
  (window as any).__webcontainer_started__ = true;

  bootWebContainer()
    .then((wc) => {
      if (resolveWebContainer) resolveWebContainer(wc);
    })
    .catch((err) => {
      if (rejectWebContainer) rejectWebContainer(err);
      else console.error('WebContainer boot failed:', err);
    });
}
