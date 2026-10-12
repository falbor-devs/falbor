import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { cloneWebsiteModalOpen, cloneWebsitePayload } from '~/lib/stores/cloneWebsite';
import { Dialog, DialogRoot, DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import UnifiedInputPane from '~/(main)/(flows)/ai/_components/unified-input/UnifiedInputPane';
import { Stack } from '~/(main)/(flows)/ai/_lib/stacks';
import { EditorTheme, Settings } from '~/(main)/(flows)/ai/_types';
import { CodeGenerationModel } from '~/(main)/(flows)/ai/_lib/models';

import { useChatHistory, chatId } from '~/lib/persistence';
import { generateId } from 'ai';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export function CloneWebsiteModal() {
  const open = useStore(cloneWebsiteModalOpen);
  const router = useRouter();
  const { storeMessageHistory } = useChatHistory();


  const [settings, setSettings] = useState<Settings>({
    openAiApiKey: null,
    openAiBaseURL: null,
    replicateApiKey: null,
    anthropicApiKey: null,
    geminiApiKey: null,
    screenshotOneApiKey: null,
    isImageGenerationEnabled: true,
    editorTheme: EditorTheme.COBALT,
    generatedCodeConfig: Stack.HTML_TAILWIND,
    codeGenerationModel: CodeGenerationModel.GPT_5_6_LUNA,
    selectedDesignSystemId: null,
    isTermOfServiceAccepted: true,
  });

  const handleCreate = async (images: string[], inputMode: "image" | "video", textPrompt?: string) => {
    try {
      cloneWebsitePayload.set({
        prompt: `Clone this website. Use framework: ${settings.generatedCodeConfig}. ${textPrompt || ''}`,
        images
      });

      cloneWebsiteModalOpen.set(false);
      chatId.set(undefined);
      router.push(`/chat`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCreateFromText = async (text: string) => {
    handleCreate([], 'image', text);
  };

  const handleImportFromCode = async (code: string, stack: Stack) => {
    handleCreate([], 'image', `Import this code:\n\n${code}`);
  };

  React.useEffect(() => {
    if (!open) {
      document.body.style.pointerEvents = 'auto';
    }
  }, [open]);

  return (
    <DialogRoot open={open} onOpenChange={(val) => cloneWebsiteModalOpen.set(val)}>
      <Dialog 
        showCloseButton 
        onClose={() => cloneWebsiteModalOpen.set(false)}
        className="w-[90vw] max-w-4xl bg-white dark:bg-[#141414] border border-[#D6D6D6] dark:border-[#353538] shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="p-6">
          <DialogTitle className="mb-2">Clone Website</DialogTitle>
          <DialogDescription className="mb-6">
            Provide a reference image, URL, or description to start cloning.
          </DialogDescription>
          
          <UnifiedInputPane
            doCreate={handleCreate}
            doCreateFromText={handleCreateFromText}
            importFromCode={handleImportFromCode}
            settings={settings}
            setSettings={setSettings}
          />
        </div>
      </Dialog>
    </DialogRoot>
  );
}
