'use client';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';
import { IconButton } from '~/components/ui/IconButton';
import { ImportFolderButton } from '~/components/chat/input/ImportFolderButton';
import { workbenchStore } from '~/lib/stores/workbench';

type ChatData = {
  messages?: Message[];
  description?: string;
};

interface ImportButtonsProps {
  importChat?: (description: string, messages: Message[]) => Promise<void>;
}

export function ImportButtons(props: ImportButtonsProps | ((description: string, messages: Message[]) => Promise<void>)) {
  const importChat = typeof props === 'function' ? props : props?.importChat;
  return (
    <>
      <input
        type="file"
        id="chat-import"
        className="hidden"
        accept=".json"
        onChange={async (e) => {
          const file = e.target.files?.[0];

          if (file && importChat) {
            try {
              const reader = new FileReader();

              reader.onload = async (e) => {
                try {
                  const content = e.target?.result as string;
                  const data = JSON.parse(content) as ChatData;


                  if (Array.isArray(data.messages)) {
                    await importChat(data.description || 'Imported Chat', data.messages);
                    toast.success('Chat imported successfully');

                    return;
                  }

                  toast.error('Invalid chat file format');
                } catch (error: unknown) {
                  if (error instanceof Error) {
                    toast.error('Failed to parse chat file: ' + error.message);
                  } else {
                    toast.error('Failed to parse chat file');
                  }
                }
              };
              reader.onerror = () => toast.error('Failed to read chat file');
              reader.readAsText(file);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Failed to import chat');
            }
            e.target.value = '';
          } else {
            toast.error('Something went wrong');
          }
        }}
      />

      <Dropdown
        trigger={
          <IconButton
            title="More Options"
            className="transition-all border border-falbor-elements-borderColor !bg-white dark:!bg-falbor-elements-background-depth-2"
          >
            <div className="i-ph:dots-three-vertical text-xl" />
          </IconButton>
        }
      >
        <DropdownItem onSelect={() => document.getElementById('chat-import')?.click()}>
          <div className="flex items-center gap-2 w-full text-falbor-elements-textPrimary">
            <div className="i-falbor:chat text-lg text-falbor-elements-textSecondary"></div>
            <span>Import Chat</span>
          </div>
        </DropdownItem>
        <ImportFolderButton importChat={importChat} asMenuItem />
        <DropdownItem onSelect={() => workbenchStore.isGameMode.set(true)}>
          <div className="flex items-center gap-2 w-full text-falbor-elements-textPrimary">
            <div className="i-ph:game-controller text-lg text-falbor-elements-textSecondary"></div>
            <span>2D Game</span>
          </div>
        </DropdownItem>
      </Dropdown>
    </>
  );
}