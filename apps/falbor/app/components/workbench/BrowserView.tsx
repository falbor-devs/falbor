import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';

export const BrowserView = () => {
  const browserDebugUrl = useStore(workbenchStore.browserDebugUrl);

  return (
    <div className="flex flex-col w-full h-full bg-falbor-elements-background-depth-1">
      {browserDebugUrl ? (
        <iframe
          src={browserDebugUrl}
          className="w-full h-full border-none"
          title="Browserbase Live View"
          allow="fullscreen"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-falbor-elements-textSecondary">
          <div className="flex flex-col items-center gap-4">
            <div className="i-ph:browser text-4xl opacity-50" />
            <p>No active browser session</p>
          </div>
        </div>
      )}
    </div>
  );
};
