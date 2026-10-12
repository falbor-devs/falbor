import React from 'react';
import { classNames } from '~/utils/classNames';
import Popover from '~/components/ui/Popover';
import { Switch } from '~/components/ui/Switch';
import { workbenchStore } from '~/lib/stores/workbench';
import { Button, IconButton } from '../ui';
import { VisualEditorExportModal } from '../chat/modals/VisualEditorExportModal';
import { publishAIToFunnel } from '~/lib/actions/funnel-publish';
import { useToast } from '~/components/ui/use-toast';
import { useRouter } from 'next/navigation';

interface DesignSystemToolbarProps {
  isInspectorMode: boolean;
  isDesignSystemMode: boolean;
}

export const DesignSystemToolbar: React.FC<DesignSystemToolbarProps> = ({
  isInspectorMode,
  isDesignSystemMode,
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const toggleInspectorMode = () => {
    workbenchStore.isInspectorMode.set(!isInspectorMode);
  };

  const handleWorkspaceSuccess = async (subAccountId: string) => {
    try {
      
      const files = workbenchStore.files.get();
      const pages = [];
      let combinedCss = '';

      
      for (const [filePath, file] of Object.entries(files)) {
        if (!file) continue;
        if (filePath.endsWith('.css') && file.type === 'file' && typeof file.content === 'string') {
          combinedCss += `\n/* ${filePath} */\n${file.content}\n`;
        }
      }

      
      for (const [filePath, file] of Object.entries(files)) {
        if (!file) continue;
        if (filePath.endsWith('.html') && file.type === 'file' && typeof file.content === 'string') {
          const parts = filePath.split('/');
          const fileName = parts[parts.length - 1];
          const name = fileName.replace('.html', '');
          const pathName = name === 'index' ? '' : name;

          let htmlContent = file.content;

          
          if (combinedCss) {
            const styleTag = `<style>\n${combinedCss}\n</style>`;
            if (htmlContent.includes('</head>')) {
              htmlContent = htmlContent.replace('</head>', `${styleTag}\n</head>`);
            } else {
              htmlContent = styleTag + '\n' + htmlContent;
            }
          }

          pages.push({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            pathName,
            htmlContent
          });
        }
      }

      if (pages.length === 0) {
        throw new Error('No HTML files were found in the generated workspace.');
      }

      const { funnelId, pageId } = await publishAIToFunnel('chat-123', subAccountId, pages);
      toast(`Successfully published to Visual Editor Funnel: ${funnelId}`, { type: 'success' });
      router.push(`/visual-editor/subaccount/${subAccountId}/funnels/${funnelId}/editor/${pageId}`);
    } catch (error: any) {
      toast(error.message || 'Could not publish site.', { type: 'error' });
    }
  };

  return (
    <div className="flex items-center ml-1">
      <div
        className={classNames(
          "group flex items-center overflow-hidden",
          isInspectorMode
            ? ""
            : ""
        )}
      >
        <IconButton
          title={isInspectorMode ? 'Disable Element Inspector' : 'Enable Element Inspector'}
          className={classNames(
            'transition-all flex items-center gap-1 px-1.5',
            isInspectorMode
              ? '!bg-falbor-elements-item-backgroundAccent !text-falbor-elements-item-contentAccent'
              : 'bg-falbor-elements-item-backgroundDefault text-falbor-elements-item-contentDefault',
          )}
          onClick={toggleInspectorMode}
        >
          <div className="i-ph:cursor-click text-lg" />
          <span className="text-xs font-medium">Select</span>
        </IconButton>

        <div
          className={classNames(
            "overflow-hidden transition-all duration-300 flex items-center",
            "max-w-0 opacity-0 group-hover:max-w-12 group-hover:opacity-100"
          )}
        >
          <div
            className={classNames(
              "w-px h-4 mx-1 opacity-20",
              isInspectorMode ? "bg-white" : "bg-current"
            )}
          />

          <button
            onClick={() => setModalOpen(true)}
            title="Publish to Visual Editor"
            className={classNames(
              "px-2 py-1 ml-1 transition-colors flex items-center justify-center text-falbor-elements-item-contentDefault hover:text-falbor-elements-item-contentActive"
            )}
          >
            <div className="i-ph:export text-sm" />
          </button>
        </div>
      </div>
      <VisualEditorExportModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleWorkspaceSuccess}
      />
    </div>
  );
};