import { useStore } from '@nanostores/react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';
import { useEditChatDescription } from '~/lib/hooks';
import { description as descriptionStore } from '~/lib/persistence';
import { ChatSettingsModal } from '~/components/chat/modals/ChatSettingsModal';
import { chatSettingsOpenStore } from '~/lib/stores/settings';

export function ChatDescription() {
  const initialDescription = useStore(descriptionStore)!;

  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentDescription, toggleEditMode } =
    useEditChatDescription({
      initialDescription,
      syncWithGlobalStore: true,
    });

  const settingsOpen = useStore(chatSettingsOpenStore);

  if (!initialDescription) {
    
    return null;
  }

  return (
    <div className="flex items-center justify-center">
      {editing ? (
        <form onSubmit={handleSubmit} className="flex items-center justify-center">
          <input
            type="text"
            className="bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary rounded px-2 mr-2 w-fit"
            autoFocus
            value={currentDescription}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{ width: `${Math.max(currentDescription.length * 8, 100)}px` }}
          />
          <TooltipProvider>
            <WithTooltip tooltip="Save title">
              <div className="flex justify-between items-center p-2 rounded-md bg-falbor-elements-item-backgroundAccent">
                <button type="submit" onMouseDown={handleSubmit} className="hover:text-falbor-elements-item-contentAccent">
                  <i className="i-ph:check-bold h-4 w-4 block scale-110" />
                </button>
              </div>
            </WithTooltip>
          </TooltipProvider>
        </form>
      ) : (
        <>
          {currentDescription}
          <TooltipProvider>
            <WithTooltip tooltip="Rename chat">
              <button
                type="button"
                className="ml-2 hover:text-falbor-elements-item-contentAccent"
                onClick={(event) => {
                  event.preventDefault();
                  toggleEditMode();
                }}
              >
                <i className="i-ph:pencil-fill h-4 w-4 block scale-110" />
              </button>
            </WithTooltip>
          </TooltipProvider>

          <TooltipProvider>
            <WithTooltip tooltip="Settings">
              <button
                type="button"
                className="ml-2 hover:text-falbor-elements-item-contentAccent"
                onClick={(event) => {
                  event.preventDefault();
                  chatSettingsOpenStore.set(true);
                }}
              >
                <i className="i-ph:dots-three-vertical-bold h-5 w-5 block" />
              </button>
            </WithTooltip>
          </TooltipProvider>
        </>
      )}

      <ChatSettingsModal isOpen={settingsOpen} onClose={() => chatSettingsOpenStore.set(false)} />
    </div>
  );
}