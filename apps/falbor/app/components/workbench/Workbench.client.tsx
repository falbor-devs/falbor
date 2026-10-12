'use client';
import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import type { FileHistory } from '~/types/actions';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import { DatabaseView } from './DatabaseView';
import { FileModifiedDropdown } from './FileModifiedDropdown';
import { WorkflowView } from './workflows/WorkflowView';
import { ResearchView } from './ResearchView';
import useViewport from '~/lib/hooks';
import { usePreviewStore } from '~/lib/stores/previews';
import { chatStore } from '~/lib/stores/chat';
import type { ElementInfo } from './Inspector';
import { streamingState } from '~/lib/stores/streaming';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
  metadata?: {
    gitUrl?: string;
  };
  updateChatMestaData?: (metadata: any) => void;
  setSelectedElement?: (element: ElementInfo | null) => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
}

const viewTransition = { ease: cubicEasingFn };

const hasSupabaseConfig = typeof process !== 'undefined' && !!process.env.NEXT_PUBLIC_SUPABASE_ORG_ID;

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: {
    value: 'code',
    text: 'Code',
    icon: 'i-ph:code',
  },
  middle: {
    value: 'preview',
    text: 'Preview',
    icon: 'i-ph:browser',
  },
  right: {
    value: 'workflow',
    text: 'Workflow',
    icon: 'i-ph:share-network',
  },
  extra: hasSupabaseConfig
    ? {
      value: 'database',
      text: 'Database',
      icon: 'i-ph:database',
    }
    : undefined,
};

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

export const Workbench = memo(
  ({
    chatStarted,
    isStreaming,
    metadata: _metadata,
    updateChatMestaData: _updateChatMestaData,
    setSelectedElement,
    sendMessage,
  }: WorkspaceProps) => {
    renderLogger.trace('Workbench');

    const fileHistory = useStore(workbenchStore.fileHistory);
    const setFileHistory = (history: Record<string, FileHistory>) => workbenchStore.fileHistory.set(history);
    const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
    const showWorkbench = useStore(workbenchStore.showWorkbench);
    const mobilePreviewFullScreen = useStore(workbenchStore.mobilePreviewFullScreen);
    const selectedFile = useStore(workbenchStore.selectedFile);
    const currentDocument = useStore(workbenchStore.currentDocument);
    const unsavedFiles = useStore(workbenchStore.unsavedFiles);
    const files = useStore(workbenchStore.files);
    const selectedView = useStore(workbenchStore.currentView);
    const { showChat, showHistory } = useStore(chatStore);
    const canHideChat = showWorkbench || !showChat;

    const isSmallViewport = useViewport(1024);
    const streaming = useStore(streamingState);

    const [isLiveCode, setIsLiveCode] = useState(() => {
      if (typeof window !== 'undefined') {
        try {
          return JSON.parse(localStorage.getItem('falbor_write_code_in_live') || 'true');
        } catch {
          return true;
        }
      }
      return true;
    });

    useEffect(() => {
      const handleLiveCodeChange = (e: Event) => setIsLiveCode((e as CustomEvent).detail);
      window.addEventListener('falbor_write_code_in_live_changed', handleLiveCodeChange);
      return () => window.removeEventListener('falbor_write_code_in_live_changed', handleLiveCodeChange);
    }, []);

    const setSelectedView = (view: WorkbenchViewType) => {
      workbenchStore.currentView.set(view);
    };

    useEffect(() => {
      if (hasPreview) {
        setSelectedView('preview');
      }
    }, [hasPreview]);

    useEffect(() => {
      workbenchStore.setDocuments(files);
    }, [files]);

    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      const startWidth = parseInt(computedStyle.getPropertyValue('--chat-min-width')) || 533;

      setIsDragging(true);

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(300, Math.min(startWidth + deltaX, window.innerWidth / 2));
        root.style.setProperty('--chat-min-width', `${newWidth}px`);
      };

      const onMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }, []);

    const onEditorChange = useCallback<OnEditorChange>((update) => {
      workbenchStore.setCurrentDocumentContent(update.content);
    }, []);

    const onEditorScroll = useCallback<OnEditorScroll>((position) => {
      workbenchStore.setCurrentDocumentScrollPosition(position);
    }, []);

    const onFileSelect = useCallback((filePath: string | undefined) => {
      workbenchStore.setSelectedFile(filePath);
    }, []);

    const onFileSave = useCallback(() => {
      workbenchStore
        .saveCurrentDocument()
        .then(() => {

          const previewStore = usePreviewStore();
          previewStore.refreshAllPreviews();
        })
        .catch(() => {
          toast.error('Failed to update file content');
        });
    }, []);

    const onFileReset = useCallback(() => {
      workbenchStore.resetCurrentDocument();
    }, []);

    const handleSelectFile = useCallback((filePath: string) => {
      workbenchStore.setSelectedFile(filePath);
      workbenchStore.currentView.set('diff');
    }, []);

    return (
      chatStarted && (
        <motion.div
          initial="closed"
          animate={showWorkbench ? 'open' : 'closed'}
          variants={workbenchVariants}
          className={classNames('z-workbench', {
            '!z-[100]': mobilePreviewFullScreen && isSmallViewport,
          })}
        >
          <div
            className={classNames(
              isSmallViewport
                ? 'fixed top-0 bottom-0 z-[100] bg-falbor-elements-background-depth-2'
                : 'fixed top-[calc(var(--header-height)+1.2rem)] bottom-6 w-[var(--workbench-inner-width)] z-0 falbor-ease-cubic-bezier',
              {
                'w-full': isSmallViewport,
                'left-0': showWorkbench && isSmallViewport,
                'left-[var(--workbench-left)]': showWorkbench && !isSmallViewport,
                'left-[100%]': !showWorkbench,
                'transition-[left,width] duration-200': !isDragging,
              },
            )}
          >
            <div className={classNames('absolute inset-0', {
              'px-2 lg:px-4': !(mobilePreviewFullScreen && isSmallViewport)
            })}>
              {showWorkbench && !isSmallViewport && canHideChat && (
                <div
                  className="absolute left-2 lg:left-4 top-0 bottom-0 w-[15px] cursor-col-resize z-[100] flex justify-center items-center -ml-[7.5px]"
                  onMouseDown={handleMouseDown}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <div
                    className={classNames(
                      'h-full w-full transition-colors',
                      isDragging || isHovered ? 'bg-[#8882]' : 'bg-transparent'
                    )}
                  />
                </div>
              )}
              <div className={classNames('relative h-full flex flex-col bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor shadow-sm overflow-hidden', {
                'rounded-[7px]': !(mobilePreviewFullScreen && isSmallViewport)
              })}>
                {!isLiveCode && isStreaming && (
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-falbor-elements-background-depth-2">
                    <div className="i-ph:spinner-gap-duotone text-5xl text-purple-500 animate-spin mb-4" />
                    <p className="text-falbor-elements-textPrimary text-lg font-medium">AI is generating the codes...</p>
                  </div>
                )}
                <div className="flex items-center px-3 py-2 border-b border-falbor-elements-borderColor gap-1.5 z-10 bg-falbor-elements-background-depth-2 shrink-0">
                  {isSmallViewport ? (
                    <>
                      <button
                        className="i-ph:x text-xl text-falbor-elements-textSecondary mr-2 hover:text-falbor-elements-textPrimary transition-colors"
                        onClick={() => workbenchStore.showWorkbench.set(false)}
                      />
                      <span className="font-semibold text-falbor-elements-textPrimary ml-1">Preview</span>
                    </>
                  ) : (
                    <>
                      <button
                        className={`${showChat ? 'i-ph:sidebar-simple-fill' : 'i-ph:sidebar-simple'} text-lg text-falbor-elements-textSecondary mr-1`}
                        disabled={!canHideChat}
                        onClick={() => {
                          if (canHideChat) {
                            chatStore.setKey('showChat', !showChat);
                          }
                        }}
                      />
                      <button
                        className={`${showHistory ? 'i-ph:clock-counter-clockwise-fill' : 'i-ph:clock-counter-clockwise'} text-lg text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary transition-colors mr-2`}
                        onClick={() => chatStore.setKey('showHistory', !showHistory)}
                        title="History"
                      />
                      <Slider selected={selectedView} options={sliderOptions} setSelected={setSelectedView} />
                      <div className="ml-auto" />
                      {selectedView === 'diff' && (
                        <FileModifiedDropdown fileHistory={fileHistory} onSelectFile={handleSelectFile} />
                      )}
                    </>
                  )}
                </div>
                <div className="relative flex-1 overflow-hidden">
                  {isSmallViewport ? (
                    <View
                      initial={{ x: '0%' }}
                      animate={{ x: '0%' }}
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Preview setSelectedElement={setSelectedElement} />
                    </View>
                  ) : (
                    <>
                      <View
                        initial={{ x: '0%' }}
                        animate={{ x: selectedView === 'code' ? '0%' : '-100%' }}
                        style={{ pointerEvents: selectedView === 'code' ? 'auto' : 'none' }}
                      >
                        <EditorPanel
                          editorDocument={currentDocument}
                          isStreaming={isStreaming}
                          selectedFile={selectedFile}
                          files={files}
                          unsavedFiles={unsavedFiles}
                          fileHistory={fileHistory}
                          onFileSelect={onFileSelect}
                          onEditorScroll={onEditorScroll}
                          onEditorChange={onEditorChange}
                          onFileSave={onFileSave}
                          onFileReset={onFileReset}
                        />
                      </View>
                      <View
                        initial={{ x: '100%' }}
                        animate={{ x: selectedView === 'preview' ? '0%' : selectedView === 'code' ? '100%' : '-100%' }}
                        style={{ pointerEvents: selectedView === 'preview' ? 'auto' : 'none' }}
                      >
                        <Preview setSelectedElement={setSelectedElement} />
                      </View>
                      <View
                        initial={{ x: '100%' }}
                        animate={{ x: selectedView === 'workflow' ? '0%' : (selectedView === 'database' || selectedView === 'research') ? '-100%' : '100%' }}
                        style={{ pointerEvents: selectedView === 'workflow' ? 'auto' : 'none' }}
                      >
                        <WorkflowView sendMessage={sendMessage} />
                      </View>
                      <View
                        initial={{ x: '100%' }}
                        animate={{ x: selectedView === 'database' ? '0%' : (selectedView === 'research' ? '-100%' : '100%') }}
                        style={{ pointerEvents: selectedView === 'database' ? 'auto' : 'none' }}
                      >
                        <DatabaseView sendMessage={sendMessage} />
                      </View>
                      <View
                        initial={{ x: '100%' }}
                        animate={{ x: selectedView === 'research' ? '0%' : '100%' }}
                        style={{ pointerEvents: selectedView === 'research' ? 'auto' : 'none' }}
                      >
                        <ResearchView />
                      </View>
                    </>
                  )}

                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )
    );
  },
);


interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});