import React, { useEffect, useState } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { Dropdown, DropdownItem, DropdownSub, DropdownSubTrigger, DropdownSubContent, DropdownSeparator } from '~/components/ui/Dropdown';
import { classNames } from '~/utils/classNames';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { SendButton } from './SendButton.client';
import { IconButton } from '~/components/ui/IconButton';
import { toast } from 'react-toastify';
import { SpeechRecognitionButton } from '~/components/chat/input/SpeechRecognition';
import { useAuth } from '~/hooks/useAuth';
import { SupabaseConnection } from '../settings/SupabaseConnection';
import { ExpoQrModal } from '~/components/workbench/ExpoQrModal';
import styles from '../core/BaseChat.module.scss';
import type { ProviderInfo } from '~/types/model';
import type { DesignScheme } from '~/types/design-scheme';
import type { ElementInfo } from '~/components/workbench/Inspector';
import { McpTools } from '../tools/MCPTools';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { DesignSystemPanel } from '../../design-system/DesignSystemPanel';
import { DesignSystemToolbar } from '../../design-system/DesignSystemToolbar';
import { useDesignSystem } from '~/lib/hooks/useDesignSystem';
import { SkillsDialog } from '../../skills/SkillsDialog';
import { useSettings } from '~/lib/hooks/useSettings';
import { Tooltip } from '~/components/ui/Tooltip';
import { Badge } from '../../ui';
import { MCP_CONNECTORS } from '~/components/@settings/tabs/mcp/connectors';
import { useMCPStore } from '~/lib/stores/mcp';
import Link from 'next/link';
import { QuestionOverlay, type QuestionData } from '../core/QuestionOverlay';
import { selectedDatabase } from '~/lib/stores/database';
import { WorkspaceSettingsModal } from '~/components/workspace/workspace-settings/WorkspaceSettingsModal';
import { useParams, usePathname } from 'next/navigation';



interface ChatBoxProps {
  isModelSettingsCollapsed: boolean;
  setIsModelSettingsCollapsed: (collapsed: boolean) => void;
  provider: any;
  providerList: any[];
  modelList: any[];
  apiKeys: Record<string, string>;
  isModelLoading: string | undefined;
  onApiKeysChange: (providerName: string, apiKey: string) => void;
  uploadedFiles: File[];
  imageDataList: string[];
  textareaRef: React.RefObject<HTMLTextAreaElement> | undefined;
  input: string;
  handlePaste: (e: React.ClipboardEvent) => void;
  TEXTAREA_MIN_HEIGHT: number;
  TEXTAREA_MAX_HEIGHT: number;
  isStreaming: boolean;
  handleSendMessage: (event: React.UIEvent, messageInput?: string) => void;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  chatStarted: boolean;
  exportChat?: () => void;
  qrModalOpen: boolean;
  setQrModalOpen: (open: boolean) => void;
  handleFileUpload: () => void;
  setProvider?: ((provider: ProviderInfo) => void) | undefined;
  model?: string | undefined;
  setModel?: ((model: string) => void) | undefined;
  setUploadedFiles?: ((files: File[]) => void) | undefined;
  setImageDataList?: ((dataList: string[]) => void) | undefined;
  handleInputChange?: ((event: React.ChangeEvent<HTMLTextAreaElement>) => void) | undefined;
  handleStop?: (() => void) | undefined;
  enhancingPrompt?: boolean | undefined;
  enhancePrompt?: (() => void) | undefined;
  onWebSearchResult?: (result: string) => void;
  chatMode?: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research';
  setChatMode?: (mode: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research') => void;
  designScheme?: DesignScheme;
  setDesignScheme?: (scheme: DesignScheme) => void;
  selectedElement?: ElementInfo | null;
  setSelectedElement?: ((element: ElementInfo | null) => void) | undefined;
  cloneUrl?: string | null;
  setCloneUrl?: ((url: string | null) => void) | undefined;
  pendingQuestions?: QuestionData[];
  inputLockedMessage?: string;
}

export const ChatBox: React.FC<ChatBoxProps> = (props) => {
  const hasFiles = props.uploadedFiles.length > 0;
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const isInspectorMode = useStore(workbenchStore.isInspectorMode);
  const isDesignSystemMode = useStore(workbenchStore.isDesignSystemMode);
  const isSlidesMode = useStore(workbenchStore.isSlidesMode);
  const isGameMode = useStore(workbenchStore.isGameMode);
  const { user } = useAuth();

  const { handleDesignSystemSave, handleLiveUpdate } = useDesignSystem();
  const [skillsDialogOpen, setSkillsDialogOpen] = React.useState(false);
  const [imageGeneratorOpen, setImageGeneratorOpen] = React.useState(false);
  const [cloneModalOpen, setCloneModalOpen] = React.useState(false);
  const [cloneUrlInput, setCloneUrlInput] = React.useState('');

  const { imageGenerationEnabled, applyDesignScheme, setApplyDesignScheme } = useSettings();
  const [isQuestionsOpen, setIsQuestionsOpen] = React.useState(false);
  const selectedMCPs = useMCPStore((state) => state.selectedMCPs);
  const toggleSelectedMCP = useMCPStore((state) => state.toggleSelectedMCP);
  const activeDb = useStore(selectedDatabase);
  const [connections, setConnections] = React.useState<any[]>([]);

  const [balance, setBalance] = React.useState<number | null>(null);
  const [subscriptionTier, setSubscriptionTier] = React.useState<string>('free');
  const [displayTokenUsage, setDisplayTokenUsage] = React.useState<boolean>(false);
  const highlightDivRef = React.useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const dragCounterRef = React.useRef(0);

  React.useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
      if (types.includes('Files')) {
        dragCounterRef.current += 1;
        setIsDraggingOver(true);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      setIsDraggingOver(true);
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0 || e.clientX === 0 && e.clientY === 0) {
        dragCounterRef.current = 0;
        setIsDraggingOver(false);
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);

      const dataTransferFiles = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
      if (dataTransferFiles.length > 0) {
        const imageFiles = dataTransferFiles.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        const newImages: string[] = [];
        let processedCount = 0;

        imageFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64Image = event.target?.result as string;
            if (base64Image) {
              newImages.push(base64Image);
            }
            processedCount++;
            if (processedCount === imageFiles.length) {
              if (props.setUploadedFiles) {
                props.setUploadedFiles(((prevFiles: File[]) => [...(prevFiles || []), ...imageFiles]) as any);
              }
              if (props.setImageDataList) {
                props.setImageDataList(((prevData: string[]) => [...(prevData || []), ...newImages]) as any);
              }
            }
          };
          reader.readAsDataURL(file);
        });
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [props.uploadedFiles, props.imageDataList, props.setUploadedFiles, props.setImageDataList]);

  React.useEffect(() => {
    if (user) {
      fetch('/api/user/credits')
        .then(res => res.json())
        .then(data => {
          if (data.balance !== undefined) setBalance(data.balance);
          if (data.subscriptionTier) {
            const tier = data.subscriptionTier.toLowerCase();
            setSubscriptionTier(tier);
            if (tier !== 'pro' && props.model !== 'gpt-5.6-luna') {
              props.setModel?.('gpt-5.6-luna');
            }
          }
        })
        .catch(console.error);

      fetch('/api/sync?key=falbor_display_token_usage')
        .then(res => res.json())
        .then(data => {
          if (data.value !== undefined) {
            setDisplayTokenUsage(data.value === true || data.value === 'true');
          }
        })
        .catch(console.error);
    } else if (!user && props.model !== 'gpt-5.6-luna') {

      props.setModel?.('gpt-5.6-luna');
    }
  }, [user]);

  React.useEffect(() => {
    fetch('/api/mcp/connections', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.connections)) {
          setConnections(data.connections);
        } else if (Array.isArray(data)) {
          setConnections(data);
        } else {
          setConnections([]);
        }
      })
      .catch((err) => console.error('Error fetching connections', err));
  }, []);

  const claudeModel = props.modelList?.find(m => m.name === 'claude-sonnet-4-5' && m.provider === 'Anthropic');
  const haikuModel = props.modelList?.find(m => m.name === 'claude-haiku-4-5' && m.provider === 'Anthropic');
  const gpt4oModel = props.modelList?.find(m => m.name === 'gpt-4o' && m.provider === 'OpenAI');
  const isFreeTierUser = !(user as any)?.subscriptionTier || (user as any).subscriptionTier !== 'pro';
  const rawAvailableModels =
    [
      gpt4oModel,
      claudeModel,
      haikuModel,
    ].filter(Boolean);

  const availableModels = rawAvailableModels;
  const selectedModelInfo = availableModels.find(m => m?.name === props.model);

  const [showSettings, setShowSettings] = useState(false);
  const params = useParams();
  const pathname = usePathname();
  const workspaceId = params?.id as string;

  useEffect(() => {
    const handleInsertMcpToken = (e: Event) => {
      const customEvent = e as CustomEvent;
      const connectorId = customEvent.detail?.connectorId;
      if (!connectorId) return;

      const textarea = props.textareaRef?.current;
      if (textarea && props.handleInputChange) {
        const cursorPosition = textarea.selectionStart;
        const textBefore = props.input.substring(0, cursorPosition);
        const textAfter = props.input.substring(cursorPosition);
        const token = `@${connectorId} `;
        const newValue = textBefore + token + textAfter;
        props.handleInputChange({ target: { value: newValue } } as any);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(cursorPosition + token.length, cursorPosition + token.length);
        }, 10);
      }
    };

    window.addEventListener('insert-mcp-token', handleInsertMcpToken);
    return () => window.removeEventListener('insert-mcp-token', handleInsertMcpToken);
  }, [props.input, props.handleInputChange, props.textareaRef]);

  return (
    <div className="relative w-full max-w-chat mx-auto z-prompt flex flex-col">
      <div>
        <ClientOnly>
          {() => (
            <div className={props.isModelSettingsCollapsed ? 'hidden' : ''}>
              { }
            </div>
          )}
        </ClientOnly>
      </div>

      <ClientOnly>
        {() => (
          <ScreenshotStateManager
            setUploadedFiles={props.setUploadedFiles}
            setImageDataList={props.setImageDataList}
            uploadedFiles={props.uploadedFiles}
            imageDataList={props.imageDataList}
          />
        )}
      </ClientOnly>

      {props.selectedElement && (
        isDesignSystemMode ? (
          <DesignSystemPanel
            selectedElement={props.selectedElement}
            onClear={() => props.setSelectedElement?.(null)}
            onSave={(changes) => {
              if (handleDesignSystemSave) {
                handleDesignSystemSave(props.selectedElement!, changes).then(() => {
                  props.setSelectedElement?.(null);
                });
              }
            }}
            onLiveUpdate={handleLiveUpdate}
          />
        ) : (
          <div className="flex mx-1.5 gap-2 items-center justify-between rounded-lg rounded-b-none border border-b-none border-falbor-elements-borderColor text-falbor-elements-textPrimary py-1 px-2.5 font-medium text-xs">
            <div className="flex gap-2 items-center lowercase">
              <code className="bg-accent-500 rounded-4px px-1.5 py-1 mr-0.5 text-white">
                {props?.selectedElement?.tagName}
              </code>
              selected for inspection
            </div>
            <button
              className="bg-transparent text-accent-500 pointer-auto"
              onClick={() => props.setSelectedElement?.(null)}
            >
              Clear
            </button>
          </div>
        )
      )}
      <div className={classNames('relative transition-all duration-300', {
        'rounded-xl': props.chatStarted,
      })}>
        {!props.chatStarted && (
          pathname?.includes('/sources') ? (
            <div className="bg-purple-500/10 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 px-4 pt-2.5 pb-4 -mb-2 flex justify-between items-center text-sm rounded-t-[8px] relative z-0 border-b border-purple-500/20">
              <div className="font-semibold flex items-center gap-2">
                <span className="i-ph:share-network w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Sources</span>
                <span className="opacity-60 mx-1">•</span>
                <span className="font-normal text-xs opacity-90">You can ask questions related to Acquisition Sources</span>
              </div>
            </div>
          ) : user ? (
            <div className="bg-[#0099ff]/20 dark:bg-[#3A2C1D] text-orange-800 dark:text-orange-200 px-4 pt-2.5 pb-4 -mb-2 flex justify-between items-center text-sm rounded-t-[8px] relative z-0">
              <div className="text-[#0099ff] dark:text-orange-200 font-medium flex items-center gap-2">
                <span className="font-medium">Low on credits</span>
                <span className="opacity-80 mx-1.5">–</span>
                <span className="opacity-90">{balance !== null ? balance : '...'} credits remaining</span>
              </div>
              <button
                className="text-black/70 dark:text-[#14B8A6] dark:hover:text-teal-400 font-medium transition-colors flex items-center"
                onClick={() => {
                  import('~/lib/stores/settings').then(({ settingsOpenStore, settingsTabStore }) => {
                    settingsTabStore.set('pricing');
                    settingsOpenStore.set(true);
                  });
                }}
              >
                Upgrade team <span className="opacity-70 ml-1.5 text-lg leading-none mb-0.5">&times;</span>
              </button>
            </div>
          ) : null
        )}

        <div className={classNames(
          "relative backdrop-blur z-10",
          props.chatStarted ? "bg-white dark:bg-[#111114] border border-[#D6D6D6] dark:border-[#353538] rounded-lg h-full overflow-hidden min-h-[60px]" : "bg-white dark:bg-[#1E1E21] border border-[#D6D6D6] dark:border-transparent rounded-[8px] min-h-[60px]"
        )}>
          {isDraggingOver ? (
            <div className="absolute inset-0 z-50 p-3 bg-[#F4F3F6] dark:bg-[#1A191D] rounded-[10.5px] dark:rounded-lg flex items-center justify-center pointer-events-none">
              <div className="w-full h-full border border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                <div className="flex items-center gap-2 mb-1 text-gray-700 dark:text-gray-200 font-medium text-sm">
                  <div className="i-ph:image text-lg text-gray-500" />
                  <span>Drop files here to add to chat</span>
                  <div className="i-ph:file-text text-lg text-gray-500" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  A maximum of 5 uploads per message at 10 MB each
                </p>
              </div>
            </div>
          ) : null}
          {props.pendingQuestions && props.pendingQuestions.length > 0 && !props.isStreaming && (
            <QuestionOverlay
              questions={props.pendingQuestions}
              onSkipAll={() => {
                if (props.handleSendMessage) {
                  props.handleSendMessage(new Event('submit') as any, "Skipped questions.");
                }
              }}
              onSubmit={(answers) => {
                if (props.handleSendMessage) {
                  const answerText = Object.entries(answers).map(([k, v], i) => `Q${i + 1}: ${v}`).join('\n');
                  props.handleSendMessage(new Event('submit') as any, `Answers:\n${answerText}`);
                }
              }}
            />
          )}
          {!(props.pendingQuestions && props.pendingQuestions.length > 0 && !props.isStreaming) && (
            <>
              <svg className={classNames(styles.PromptEffectContainer, "hidden dark:block")}>
                <defs>
                  <linearGradient
                    id="line-gradient"
                    x1="20%"
                    y1="0%"
                    x2="-14%"
                    y2="10%"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="rotate(-45)"
                  >
                    <stop offset="0%" className="[stop-color:#000000] dark:[stop-color:#777777]" stopOpacity="0%" />
                    <stop offset="40%" className="[stop-color:#000000] dark:[stop-color:#ffffff]" stopOpacity="80%" />
                    <stop offset="50%" className="[stop-color:#000000] dark:[stop-color:#9c9c9c]" stopOpacity="80%" />
                    <stop offset="100%" className="[stop-color:#000000] dark:[stop-color:#777777]" stopOpacity="0%" />
                  </linearGradient>

                  <linearGradient id="shine-gradient">
                    <stop offset="0%" className="[stop-color:#000000] dark:[stop-color:#ffffff]" stopOpacity="0%" />
                    <stop offset="40%" className="[stop-color:#000000] dark:[stop-color:#ffffff]" stopOpacity="80%" />
                    <stop offset="50%" className="[stop-color:#000000] dark:[stop-color:#ffffff]" stopOpacity="80%" />
                    <stop offset="100%" className="[stop-color:#000000] dark:[stop-color:#ffffff]" stopOpacity="0%" />
                  </linearGradient>
                </defs>
                <rect className={classNames(styles.PromptEffectLine)} pathLength="100" strokeLinecap="round"></rect>
                <rect className={classNames(styles.PromptShine)} x="48" y="24" width="70" height="1"></rect>
              </svg>

              { }
              {(hasFiles || !!props.cloneUrl) && (
                <div className="px-4 pt-3 pb-1">
                  <div className="flex flex-wrap gap-2">
                    {props.cloneUrl && (
                      <div className="relative group flex items-center gap-2 bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor rounded-full px-3 py-1.5 shadow-sm pr-6 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <div className="i-ph:globe text-white text-xs" />
                        </div>
                        <div className="flex flex-col max-w-[200px]">
                          <span className="text-xs font-medium text-falbor-elements-textPrimary truncate">
                            {props.cloneUrl.replace(/^https?:\/\//, '')}
                          </span>
                        </div>
                        <div className="bg-falbor-elements-background-depth-1 px-1.5 py-0.5 rounded text-[10px] text-falbor-elements-textSecondary ml-1 border border-falbor-elements-borderColor">
                          Content & Design
                        </div>
                        <button
                          onClick={() => props.setCloneUrl?.(null)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-falbor-elements-background-depth-2 hover:bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor text-falbor-elements-textSecondary flex items-center justify-center transition-colors text-[10px] leading-none"
                          title="Remove"
                        >
                          <div className="i-ph:x text-[10px]" />
                        </button>
                      </div>
                    )}
                    {props.imageDataList.map((dataUrl, index) => (
                      <div key={index} className="relative group w-16 h-16 flex-shrink-0">
                        <img
                          src={dataUrl}
                          alt={props.uploadedFiles[index]?.name ?? `upload-${index}`}
                          className="w-full h-full object-cover rounded-md border border-falbor-elements-borderColor"
                        />
                        <button
                          onClick={() => {
                            props.setUploadedFiles?.(props.uploadedFiles.filter((_, i) => i !== index));
                            props.setImageDataList?.(props.imageDataList.filter((_, i) => i !== index));
                          }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor text-falbor-elements-textSecondary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none"
                          title="Remove"
                        >
                          <div className="i-ph:x text-[10px]" />
                        </button>
                      </div>
                    ))}

                  </div>
                </div>
              )}

              <div className="relative w-full">
                <div
                  ref={highlightDivRef}
                  className={classNames(
                    'absolute inset-0 pl-4 pt-4 pr-16',
                    'text-sm font-sans whitespace-pre-wrap break-words pointer-events-none leading-6',
                    'overflow-hidden'
                  )}
                  aria-hidden="true"
                >
                  {(() => {
                    if (!props.input) return null;
                    const parts = props.input.split(/(@\w+\s?)/g);
                    return parts.map((part, i) => {
                      const mcpMatch = part.match(/^@(\w+)(\s?)$/);
                      if (mcpMatch) {
                        const isMcpToken = MCP_CONNECTORS.some(c => c.id === mcpMatch[1]);
                        if (isMcpToken) {
                          return (
                            <span key={i}>
                              <span className="bg-[#0099ff]/20 text-[#0099ff] rounded-[4px] px-1 font-medium">@{mcpMatch[1]}</span>
                              {mcpMatch[2]}
                            </span>
                          );
                        }
                      }
                      return <span key={i} className="text-falbor-elements-textPrimary">{part}</span>;
                    });
                  })()}
                  {props.input.endsWith('\n') ? <br /> : null}
                </div>

                <textarea
                  disabled={!!props.inputLockedMessage}
                  ref={props.textareaRef}
                  onScroll={(e) => {
                    if (highlightDivRef.current) {
                      highlightDivRef.current.scrollTop = e.currentTarget.scrollTop;
                    }
                  }}
                  className={classNames(
                    'relative w-full pl-4 pt-4 pr-16 outline-none resize-none font-sans',
                    'placeholder-falbor-elements-textTertiary',
                    'bg-transparent text-transparent caret-falbor-elements-textPrimary text-sm leading-6',
                    'transition-all duration-200',
                    'border-none focus:border-none focus:outline-none focus:ring-0',
                  )}
                  onDragEnter={(e) => e.preventDefault()}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files);
                    files.forEach((file) => {
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const base64Image = e.target?.result as string;
                          props.setUploadedFiles?.([...props.uploadedFiles, file]);
                          props.setImageDataList?.([...props.imageDataList, base64Image]);
                        };
                        reader.readAsDataURL(file);
                      }
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace') {
                      const textarea = event.currentTarget;
                      const cursorPosition = textarea.selectionStart;
                      const textBefore = props.input.substring(0, cursorPosition);

                      const mcpMatch = textBefore.match(/@(\w+)\s?$/);
                      if (mcpMatch) {
                        const connectorId = mcpMatch[1];
                        const isMcpToken = MCP_CONNECTORS.some(c => c.id === connectorId);
                        if (isMcpToken) {
                          event.preventDefault();
                          const textAfter = props.input.substring(cursorPosition);
                          const newValue = textBefore.substring(0, cursorPosition - mcpMatch[0].length) + textAfter;
                          if (props.handleInputChange) {
                            props.handleInputChange({ target: { value: newValue } } as any);
                          }
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(cursorPosition - mcpMatch[0].length, cursorPosition - mcpMatch[0].length);
                          }, 0);
                          return;
                        }
                      }
                    }

                    if (event.key === 'Enter') {
                      if (event.shiftKey) return;
                      event.preventDefault();
                      if (!user) return;
                      if (props.isStreaming) {
                        props.handleStop?.();
                        return;
                      }
                      if (event.nativeEvent.isComposing) return;
                      props.handleSendMessage?.(event);
                    }
                  }}
                  value={props.input}
                  onChange={(event) => {
                    props.handleInputChange?.(event);
                  }}
                  onPaste={props.handlePaste}
                  style={{
                    minHeight: props.TEXTAREA_MIN_HEIGHT,
                    maxHeight: props.TEXTAREA_MAX_HEIGHT,
                  }}
                  placeholder={
                    props.inputLockedMessage
                      ? props.inputLockedMessage
                      : props.chatMode === 'discuss'
                      ? 'DISCUSS Mode: Chat & ask questions without file edits...'
                      : props.chatMode === 'build'
                        ? 'How can Falbor help you today?'
                        : props.chatMode === 'troubleshoot'
                          ? 'Paste an error or describe a problem you need to fix...'
                          : 'What would you like to discuss?'
                  }
                  translate="no"
                />
              </div>

              <ClientOnly>
                {() => (
                  <SendButton
                    show={props.input.length > 0 || props.isStreaming || props.uploadedFiles.length > 0 || !!props.cloneUrl}
                    isStreaming={props.isStreaming}
                    disabled={(!props.providerList || props.providerList.length === 0) || !user || !!props.inputLockedMessage}
                    onClick={(event) => {
                      if (!user) return;

                      if ('balance' in user && typeof (user as any).balance === 'number' && (user as any).balance <= 0) {
                        toast.error("Insufficient credits. Please top up your balance to continue.");
                        return;
                      }

                      if (props.isStreaming) {
                        props.handleStop?.();
                        return;
                      }
                      if (props.input.length > 0 || props.uploadedFiles.length > 0 || props.cloneUrl) {
                        props.handleSendMessage?.(event);
                      }
                    }}
                  />
                )}
              </ClientOnly>

              <div className="flex justify-between items-center text-sm p-4 pt-2">
                <div className="flex gap-1 items-center">
                  <Dropdown
                    sideOffset={10}
                    align="start"
                    trigger={
                      <IconButton
                        title="More actions"
                        className="!rounded-full transition-all border border-falbor-elements-borderColor"
                      >
                        <div className="i-ph:plus text-xl" />
                      </IconButton>
                    }
                  >
                    <DropdownItem onSelect={() => setSkillsDialogOpen(true)}>
                      <div className="i-ph:puzzle-piece text-xl text-falbor-elements-textSecondary"></div>
                      <span>Using the skill</span>
                    </DropdownItem>

                    <DropdownItem onSelect={() => props.handleFileUpload()}>
                      <div className="i-ph:paperclip text-xl text-falbor-elements-textSecondary"></div>
                      <span>Upload file</span>
                    </DropdownItem>

                    {imageGenerationEnabled && (
                      <DropdownItem
                        className="cursor-not-allowed opacity-50"
                      >
                        <div className="i-ph:image text-xl text-falbor-elements-textSecondary"></div>
                        <span>Image generator <span className="text-xs font-mono">(coming soon)</span></span>
                      </DropdownItem>
                    )}
                    <DropdownSub>
                      <DropdownSubTrigger>
                        <div className="i-ph:brain text-xl text-falbor-elements-textSecondary"></div>
                        <span>Choose a model</span>
                      </DropdownSubTrigger>
                      <DropdownSubContent className="w-64 max-h-[300px] overflow-y-auto z-[1000] p-1.5 flex flex-col gap-1">
                        <div className="relative group w-full">
                          <button
                            className={classNames(
                              'flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm text-left hover:bg-falbor-elements-background-depth-3 cursor-pointer text-falbor-elements-textPrimary',
                              props.model === 'gpt-5-6' && 'bg-falbor-elements-background-depth-3'
                            )}
                            onClick={() => props.setModel?.('gpt-5-6')}
                          >
                            <div className="flex items-center gap-2">
                              <img src="/icons/OpenAI.svg" alt="GPT" className="w-4 h-4" />
                              <span>GPT 5.6</span>
                            </div>
                            {props.model === 'gpt-5-6' && <div className="i-ph:check text-green-500 text-sm ml-auto" />}
                          </button>
                        </div>

                        <div className="relative group w-full">
                          <button
                            className={classNames(
                              'flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm text-left',
                              subscriptionTier === 'pro'
                                ? 'hover:bg-falbor-elements-background-depth-3 cursor-pointer text-falbor-elements-textPrimary'
                                : 'text-falbor-elements-textTertiary opacity-60 cursor-not-allowed',
                              props.model === 'claude-sonnet-4-5' && 'bg-falbor-elements-background-depth-3'
                            )}
                            onClick={(e) => {
                              if (subscriptionTier !== 'pro') {
                                e.preventDefault();
                                toast.error("Upgrade to Pro to use Cloud Sonnet 4.5.");
                                return;
                              }
                              props.setModel?.('claude-sonnet-4-5');
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <img src="/icons/claude-color.svg" alt="Claude" className="w-4 h-4" />
                              <span>Cloud Sonnet 4.5</span>
                            </div>
                            {props.model === 'claude-sonnet-4-5' && <div className="i-ph:check text-green-500 text-sm ml-auto" />}
                            {subscriptionTier !== 'pro' && (
                              <div className="text-[10px] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ml-auto">Pro</div>
                            )}
                          </button>
                        </div>

                        <div className="relative group w-full">
                          <button
                            className={classNames(
                              'flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm text-left',
                              subscriptionTier === 'pro'
                                ? 'hover:bg-falbor-elements-background-depth-3 cursor-pointer text-falbor-elements-textPrimary'
                                : 'text-falbor-elements-textTertiary opacity-60 cursor-not-allowed',
                              props.model === 'claude-haiku-4-5' && 'bg-falbor-elements-background-depth-3'
                            )}
                            onClick={(e) => {
                              if (subscriptionTier !== 'pro') {
                                e.preventDefault();
                                toast.error("Upgrade to Pro to use Cloud Haki 4.5.");
                                return;
                              }
                              props.setModel?.('claude-haiku-4-5');
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <img src="/icons/claude-color.svg" alt="Claude" className="w-4 h-4" />
                              <span>Cloud Haki 4.5</span>
                            </div>
                            {props.model === 'claude-haiku-4-5' && <div className="i-ph:check text-green-500 text-sm ml-auto" />}
                            {subscriptionTier !== 'pro' && (
                              <div className="text-[10px] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ml-auto">Pro</div>
                            )}
                          </button>
                        </div>
                      </DropdownSubContent>
                    </DropdownSub>

                    { }

                    <DropdownSub>
                      <DropdownSubTrigger>
                        <div className="i-ph:graph text-xl text-falbor-elements-textSecondary"></div>
                        <span>Connectors</span>
                      </DropdownSubTrigger>
                      <DropdownSubContent className="w-64 max-h-[300px] overflow-y-auto z-[1000]">
                        {MCP_CONNECTORS.filter(c => c.id !== 'custom').map((connector) => {
                          const hasDbConnection = Array.isArray(connections) && connections.some((c) => c.connectorId === connector.id || c.connector_id === connector.id);
                          const hasLocalConnection = Object.keys(useMCPStore.getState().settings?.mcpConfig?.mcpServers || {}).some(key => key.startsWith(`${connector.id}-`));
                          const isConnected = hasDbConnection || hasLocalConnection;
                          const isSelected = selectedMCPs.includes(connector.id);

                          return (
                            <div key={connector.id} className="relative group w-full">
                              <button
                                onClick={() => {
                                  if (isConnected) {
                                    if (!isSelected) {
                                      toggleSelectedMCP(connector.id);
                                    }
                                    const textarea = props.textareaRef?.current;
                                    if (textarea && props.handleInputChange) {
                                      const cursorPosition = textarea.selectionStart;
                                      const textBefore = props.input.substring(0, cursorPosition);
                                      const textAfter = props.input.substring(cursorPosition);
                                      const token = `@${connector.id} `;
                                      const newValue = textBefore + token + textAfter;
                                      props.handleInputChange({ target: { value: newValue } } as any);
                                      setTimeout(() => {
                                        textarea.focus();
                                        textarea.setSelectionRange(cursorPosition + token.length, cursorPosition + token.length);
                                      }, 10);
                                    }
                                  }
                                }}
                                disabled={!isConnected}
                                className={classNames(
                                  'flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm text-left',
                                  isConnected
                                    ? 'text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-3 cursor-pointer'
                                    : 'text-falbor-elements-textTertiary opacity-60 cursor-not-allowed',
                                  isSelected && 'bg-falbor-elements-background-depth-3'
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <img src={connector.logo} className="w-5 h-5 object-contain" alt={connector.name} />
                                  <span>{connector.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {isSelected && <div className="i-ph:check text-accent-500 text-sm" />}
                                  {!isConnected && (
                                    <div className="i-ph:warning-circle text-orange-500 text-sm opacity-80" />
                                  )}
                                </div>
                              </button>

                              {!isConnected && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-falbor-elements-background-depth-4 text-falbor-elements-textPrimary text-xs rounded border border-falbor-elements-borderColor shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                  Needs to be connected in settings
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <DropdownSeparator />
                        <McpTools asMenuItem={true} />
                      </DropdownSubContent>
                    </DropdownSub>

                    <DropdownSub>
                      <DropdownSubTrigger>
                        <div className="i-ph:database text-xl text-falbor-elements-textSecondary"></div>
                        <span>Database</span>
                      </DropdownSubTrigger>
                      <DropdownSubContent className="w-64 z-[1000] p-1">
                        <div className="relative group w-full mb-1">
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              selectedDatabase.set(activeDb === 'neon' ? null : 'neon');
                              const textarea = props.textareaRef?.current;
                              if (textarea) {
                                textarea.focus();
                              }
                            }}
                            className={classNames(
                              'flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm text-left',
                              'text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-3 cursor-pointer'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <img src="https://cdn.simpleicons.org/neon" className="w-5 h-5 object-contain" alt="Neon" />
                              <span>Neon API</span>
                            </div>
                            <Switch.Root
                              checked={activeDb === 'neon'}
                              className="w-8 h-4 bg-falbor-elements-background-depth-4 border border-falbor-elements-borderColor rounded-full relative shadow-inner focus:outline-none data-[state=checked]:bg-[#3ECF8E] data-[state=checked]:border-[#3ECF8E] transition-colors pointer-events-none"
                            >
                              <Switch.Thumb className="block w-3 h-3 bg-white rounded-full transition-transform transform translate-x-0.5 data-[state=checked]:translate-x-4.5 shadow-sm" />
                            </Switch.Root>
                          </div>
                        </div>
                        <Tooltip
                          content="This feature will come soon. But in the meantime, you can tell the AI to replace the line for you and use the Supabase that's yours."
                          side="right"
                        >
                          <div className="relative group w-full">
                            <div
                              className={classNames(
                                'flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm text-left',
                                'text-falbor-elements-textPrimary opacity-50 cursor-not-allowed'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <img src="https://cdn.simpleicons.org/supabase" className="w-5 h-5 object-contain grayscale" alt="Supabase" />
                                <span>Supabase</span>
                              </div>
                              <Switch.Root
                                disabled
                                checked={false}
                                className="w-8 h-4 bg-falbor-elements-background-depth-4 border border-falbor-elements-borderColor rounded-full relative shadow-inner focus:outline-none transition-colors pointer-events-none"
                              >
                                <Switch.Thumb className="block w-3 h-3 bg-white rounded-full transition-transform transform translate-x-0.5 shadow-sm" />
                              </Switch.Root>
                            </div>
                          </div>
                        </Tooltip>
                      </DropdownSubContent>
                    </DropdownSub>

                    { }

                    <DropdownItem
                      className={classNames(props.input.length === 0 || props.enhancingPrompt ? 'opacity-50' : '')}
                      onSelect={(e) => {
                        if (props.input.length === 0 || props.enhancingPrompt) {
                          e.preventDefault();
                          return;
                        }
                        e.preventDefault();
                        props.enhancePrompt?.();
                        toast.success('Prompt enhanced!');
                      }}
                    >
                      {props.enhancingPrompt ? (
                        <div className="i-svg-spinners:90-ring-with-bg text-falbor-elements-loader-progress text-xl animate-spin"></div>
                      ) : (
                        <div className="i-falbor:stars text-xl text-falbor-elements-textSecondary"></div>
                      )}
                      <span>Enhance prompt</span>
                    </DropdownItem>

                    <DropdownSeparator />
                    <DropdownItem onSelect={() => {
                      setTimeout(() => setShowSettings(true), 150);
                    }}>
                      <div className="i-ph:gear text-xl text-falbor-elements-textSecondary"></div>
                      <span>Settings</span>
                    </DropdownItem>
                  </Dropdown>

                  {workspaceId && (
                    <WorkspaceSettingsModal
                      isOpen={showSettings}
                      onClose={() => setShowSettings(false)}
                      workspaceId={workspaceId}
                    />
                  )}

                  <SpeechRecognitionButton
                    isListening={props.isListening}
                    onStart={props.startListening}
                    onStop={props.stopListening}
                    disabled={props.isStreaming}
                  />

                  {isSlidesMode && (
                    <IconButton
                      title="Disable Slides Mode"
                      className="transition-all flex items-center gap-1 px-1.5 !bg-falbor-elements-item-backgroundAccent !text-falbor-elements-item-contentAccent"
                      onClick={() => {
                        workbenchStore.isSlidesMode.set(false);
                      }}
                    >
                      <div className="i-ph:presentation-chart text-xl" />
                      <span>Slides</span>
                    </IconButton>
                  )}

                  {isGameMode && (
                    <IconButton
                      title="Disable 2D Game Mode"
                      className="transition-all flex items-center gap-1 px-1.5 !bg-falbor-elements-item-backgroundAccent !text-falbor-elements-item-contentAccent"
                      onClick={() => {
                        workbenchStore.isGameMode.set(false);
                      }}
                    >
                      <div className="i-ph:game-controller text-xl" />
                      <span>2D Game</span>
                    </IconButton>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {props.chatStarted && props.setChatMode && false && (
                    <Dropdown
                      sideOffset={8}
                      align="end"
                      trigger={
                        <IconButton
                          title="Select Chat Mode"
                          className={classNames(
                            'transition-all flex items-center gap-1.5 px-2 py-1',
                            '!bg-[#F3F3F3] !text-gray-700'
                          )}
                        >
                          <div className={classNames(
                            'text-base',
                            props.chatMode === 'build' && 'i-ph:rocket-launch-duotone',
                            props.chatMode === 'troubleshoot' && 'i-ph:wrench-duotone',
                            props.chatMode === 'discuss' && 'i-ph:chats-duotone',
                            props.chatMode === 'idea' && 'i-ph:lightbulb-duotone',
                            props.chatMode === 'mvp_research' && 'i-ph:flask-duotone',
                            !['build', 'troubleshoot', 'discuss', 'idea', 'mvp_research'].includes(props.chatMode || '') && 'i-ph:sliders-horizontal-duotone'
                          )} />
                          <span className="text-xs font-medium capitalize">
                            {props.chatMode === 'build' && 'MVP'}
                            {props.chatMode === 'troubleshoot' && 'Troubleshoot'}
                            {props.chatMode === 'discuss' && 'Chat'}
                            {props.chatMode === 'idea' && 'Idea'}
                            {props.chatMode === 'mvp_research' && 'Research'}
                            {!['build', 'troubleshoot', 'discuss', 'idea', 'mvp_research'].includes(props.chatMode || '') && 'Mode'}
                          </span>
                          <div className="i-ph:caret-down text-xs" />
                        </IconButton>
                      }
                    >
                      <DropdownItem
                        active={props.chatMode === 'build'}
                        onSelect={() => props.setChatMode?.('build')}
                      >
                        <div className="i-ph:rocket-launch-duotone text-base" />
                        <span>MVP</span>
                      </DropdownItem>
                      <DropdownItem
                        active={props.chatMode === 'troubleshoot'}
                        onSelect={() => props.setChatMode?.('troubleshoot')}
                      >
                        <div className="i-ph:wrench-duotone text-base" />
                        <span>Troubleshoot</span>
                      </DropdownItem>
                      <DropdownItem
                        active={props.chatMode === 'discuss'}
                        onSelect={() => props.setChatMode?.('discuss')}
                      >
                        <div className="i-ph:chats-duotone text-base" />
                        <span>Chat</span>
                      </DropdownItem>
                      <DropdownItem
                        active={props.chatMode === 'idea'}
                        onSelect={() => props.setChatMode?.('idea')}
                      >
                        <div className="i-ph:lightbulb-duotone text-base" />
                        <span>Idea</span>
                      </DropdownItem>
                      <DropdownItem
                        active={props.chatMode === 'mvp_research'}
                        onSelect={() => props.setChatMode?.('mvp_research')}
                      >
                        <div className="i-ph:flask-duotone text-base" />
                        <span>Research</span>
                      </DropdownItem>
                    </Dropdown>
                  )}

                  {showWorkbench && (
                    <DesignSystemToolbar
                      isInspectorMode={isInspectorMode}
                      isDesignSystemMode={isDesignSystemMode}
                    />
                  )}
                  {false && availableModels.length > 0 && (
                    <Dropdown
                      sideOffset={8}
                      align="start"
                      className="w-56"
                      trigger={
                        <IconButton
                          title="Choose model"
                          className={classNames(
                            'transition-all flex items-center gap-1 px-1.5 text-[12px] !bg-[#EEEEEE] !dark:bg-falbor-elements-background-depth-2',
                          )}
                        >
                          {props.model?.includes('claude') ? (
                            <>
                              <img src="/icons/models/claude-light.svg" className="w-4 h-4 dark:hidden" alt="Claude" />
                              <img src="/icons/models/claude-dark.svg" className="w-4 h-4 hidden dark:block" alt="Claude" />
                            </>
                          ) : props.model?.includes('deepseek') ? (
                            <>
                              <img src="/icons/models/deepseek-light.svg" className="w-4 h-4 dark:hidden" alt="DeepSeek" />
                              <img src="/icons/models/deepseek-dark.svg" className="w-4 h-4 hidden dark:block" alt="DeepSeek" />
                            </>
                          ) : props.model?.includes('gpt') ? (
                            <>
                              <img src="/icons/models/chatGPT-light.svg" className="w-3.5 h-3.5 dark:hidden" alt="ChatGPT" />
                              <img src="/icons/models/chatGPT-dark.svg" className="w-3.5 h-3.5 hidden dark:block" alt="ChatGPT" />
                            </>
                          ) : props.model?.includes('gemini') ? (
                            <>
                              <img src="/icons/models/Gemini-light.svg" className="w-4 h-4 dark:hidden" alt="Gemini" />
                              <img src="/icons/models/Gemini-dark.svg" className="w-4 h-4 hidden dark:block" alt="Gemini" />
                            </>
                          ) : props.model?.includes('qwen') ? (
                            <>
                              <img src="/icons/models/qwen-light.svg" className="w-4 h-4 dark:hidden" alt="Qwen" />
                              <img src="/icons/models/qwen-dark.svg" className="w-4 h-4 hidden dark:block" alt="Qwen" />
                            </>
                          ) : (
                            <div className="i-ph:cpu text-sm" />
                          )}
                          <span className="dark:text-white text-[#27251E]">{selectedModelInfo?.label || 'Choose models'}</span>
                          <div className="i-ph:caret-down text-[10px] ml-0.5" />
                        </IconButton>
                      }
                    >
                      {availableModels.map((m) => {
                        if (!m) return null;
                        const isClaude = m.name.toLowerCase().includes('sonnet') || m.name.toLowerCase().includes('haiku');
                        const isGpt = m.name.toLowerCase().includes('gpt');
                        const isGemini = m.name.toLowerCase().includes('gemini');
                        const isDeepSeek = m.name.toLowerCase().includes('deepseek');
                        const isQwen = m.name.toLowerCase().includes('qwen');
                        let displayName = (m.label || m.name).replace(/\s\([^)]+\scontext\)/i, '');

                        let vision = "Supports images";
                        let bestFor = "General tasks";
                        let speed = "Normal";
                        let price = "$$";
                        let providerName = "Unknown";
                        let modelIcon = "Default";

                        if (isDeepSeek) {
                          vision = "No images";
                          bestFor = "Coding & Logic";
                          speed = "Fast";
                          price = "$ (Cheapest)";
                          providerName = "DeepSeek";
                          modelIcon = "deepseek-color";
                        } else if (isClaude) {
                          bestFor = "Maximum intelligence for complex work";
                          speed = "Heavy";
                          price = "$$$ (Expensive)";
                          providerName = "Anthropic";
                          modelIcon = "claude-color";
                        } else if (isGpt) {
                          bestFor = "Maximum intelligence for complex work";
                          speed = "Heavy";
                          price = "$$$ (Expensive)";
                          providerName = "OpenAI";
                          modelIcon = "OpenAI";
                        } else if (isGemini) {
                          bestFor = "Speed & Efficiency";
                          speed = "Fastest";
                          price = "$$ (Medium)";
                          providerName = "Google";
                          modelIcon = "gemini";
                        } else if (isQwen) {
                          bestFor = "Lightweight efficiency";
                          speed = "Fast";
                          price = "$ (Cheapest)";
                          providerName = "Qwen";
                          modelIcon = "Default";
                        }

                        const isPremiumModel = isClaude || isGemini;
                        const isFreeTier = !(user as any)?.subscriptionTier || (user as any).subscriptionTier !== 'pro';
                        const premiumUsageCount = (user as any)?.stats?.premium_model_usage?.[m.name] || 0;
                        const hasReachedLimit = isPremiumModel && isFreeTier && premiumUsageCount >= 1;

                        const isDisabledModel = m.name === 'qwen3.7-flash' || hasReachedLimit;

                        return (
                          <DropdownItem
                            key={m.name}
                            className={classNames("group overflow-visible", isDisabledModel ? "cursor-not-allowed opacity-50" : "")}
                            active={props.model === m.name}
                            onSelect={(e) => {
                              if (isDisabledModel) {
                                e.preventDefault();
                                return;
                              }
                              props.setModel?.(m.name);
                              const targetProvider = props.providerList?.find(p => p.name === m.provider);
                              if (targetProvider) {
                                props.setProvider?.(targetProvider);
                              }
                            }}
                          >
                            <span className="flex items-center gap-2 flex-1">
                              {isClaude ? (
                                <>
                                  <img src="/icons/models/claude-light.svg" className="w-4 h-4 dark:hidden" alt="Claude" />
                                  <img src="/icons/models/claude-dark.svg" className="w-4 h-4 hidden dark:block" alt="Claude" />
                                </>
                              ) : isGpt ? (
                                <>
                                  <img src="/icons/models/chatGPT-light.svg" className="w-4 h-4 dark:hidden" alt="ChatGPT" />
                                  <img src="/icons/models/chatGPT-dark.svg" className="w-4 h-4 hidden dark:block scale-[1.2]" alt="ChatGPT" />
                                </>
                              ) : isGemini ? (
                                <>
                                  <img src="/icons/models/Gemini-light.svg" className="w-4 h-4 dark:hidden" alt="Gemini" />
                                  <img src="/icons/models/Gemini-dark.svg" className="w-4 h-4 hidden dark:block" alt="Gemini" />
                                </>
                              ) : isQwen ? (
                                <>
                                  <img src="/icons/models/qwen-light.svg" className="w-4 h-4 dark:hidden" alt="Qwen" />
                                  <img src="/icons/models/qwen-dark.svg" className="w-4 h-4 hidden dark:block" alt="Qwen" />
                                </>
                              ) : (
                                <>
                                  <img src="/icons/models/deepseek-light.svg" className="w-4 h-4 dark:hidden" alt="DeepSeek" />
                                  <img src="/icons/models/deepseek-dark.svg" className="w-4 h-4 hidden dark:block" alt="DeepSeek" />
                                </>
                              )}
                              <span className="flex items-center gap-2">
                                {displayName}
                                {(m.name === 'claude-haiku-4-5' || m.name === 'gemini-3.6-pro') && (
                                  <Badge size="sm" variant="destructive" className='!rounded-md'>
                                    New
                                  </Badge>
                                )}
                              </span>
                            </span>
                            {props.model === m.name && <div className="i-ph:check text-sm text-falbor-elements-textPrimary" />}

                            {isDisabledModel && m.name === 'qwen3.7-flash' ? (
                              <div className="absolute left-[calc(100%+8px)] top-0 hidden group-hover:flex flex-col w-[260px] p-3 rounded-xl bg-white dark:bg-[#1C1C1E] border border-red-500/50 shadow-xl z-[1001] animate-in fade-in zoom-in-95 cursor-default">
                                <div className="text-[13px] font-medium text-red-500/90 leading-snug">Currently Unavailable</div>
                                <div className="text-[12px] text-[#687076] dark:text-[#A0A0AB] mt-2">
                                  These models are not working so well right now. They will arrive soon after addressing certain problems we have.
                                </div>
                              </div>
                            ) : isDisabledModel && hasReachedLimit ? (
                              <div className="absolute left-[calc(100%+8px)] top-0 hidden group-hover:flex flex-col w-[260px] p-3 rounded-xl bg-white dark:bg-[#1C1C1E] border border-red-500/50 shadow-xl z-[1001] animate-in fade-in zoom-in-95 cursor-default">
                                <div className="text-[13px] font-medium text-red-500/90 leading-snug">Limit Reached (1/1 uses)</div>
                                <div className="text-[12px] text-[#687076] dark:text-[#A0A0AB] mt-2">
                                  You have used your free trial for this premium model. Please upgrade to Pro for unlimited access.
                                </div>
                              </div>
                            ) : (
                              <div className="absolute left-[calc(100%+8px)] top-0 hidden group-hover:flex flex-col w-[260px] p-3 rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5E5] dark:border-[#2C2C2E] shadow-xl z-[1001] animate-in fade-in zoom-in-95 cursor-default">
                                <div className="flex justify-between items-start">
                                  <div className="text-[13px] font-medium text-[#11181C] dark:text-[#EDEDED] leading-snug">{bestFor}</div>
                                  {isPremiumModel && isFreeTier && (
                                    <Badge size="sm" variant="secondary" className="!text-[10px] bg-falbor-elements-background-depth-3 font-mono">
                                      {premiumUsageCount}/1 uses
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-2 text-[12px] text-[#687076] dark:text-[#A0A0AB]">
                                  <img src={`/icons/${modelIcon}.svg`} className="w-3.5 h-3.5" alt={providerName} />
                                  <span>Powered by {displayName}</span>
                                </div>

                                <div className="h-px w-full bg-[#E5E5E5] dark:bg-[#2C2C2E] my-3" />

                                <div className="flex flex-col gap-1.5">
                                  <div className="text-[12px] text-[#687076] dark:text-[#A0A0AB] flex justify-between"><span>Vision:</span> <span className={vision.includes('No') ? 'text-red-500/80' : 'text-green-500/80'}>{vision}</span></div>
                                  <div className="text-[12px] text-[#687076] dark:text-[#A0A0AB] flex justify-between"><span>Speed:</span> <span className="text-[#11181C] dark:text-[#EDEDED]">{speed}</span></div>
                                  <div className="text-[12px] text-[#687076] dark:text-[#A0A0AB] flex justify-between"><span>Cost:</span> <span className="text-[#11181C] dark:text-[#EDEDED]">{price}</span></div>
                                </div>
                              </div>
                            )}
                          </DropdownItem>
                        );
                      })}
                      <div className='p-1 mt-1'>
                        <div className="border border-[#D6D6D6] dark:border-[#353538] rounded-md flex flex-col items-start w-full px-2 py-2 text-[10px] text-left gap-1">
                          <span className="flex items-center text-xs text-falbor-elements-textPrimary font-medium">
                            <div className="i-ph:info mr-1 w-4 h-4 text-falbor-elements-textSecondary" />
                            more models available soon.
                            <Link className='text-[#0099ff]' target="_blank" href="/docs/models">Learn more</Link>
                          </span>
                        </div>
                      </div>
                    </Dropdown>
                  )}

                  {typeof process !== 'undefined' && !!process.env.NEXT_PUBLIC_SUPABASE_ORG_ID && (
                    <SupabaseConnection />
                  )}
                </div>
                <ExpoQrModal open={props.qrModalOpen} onClose={() => props.setQrModalOpen(false)} />
                <SkillsDialog open={skillsDialogOpen} onOpenChange={setSkillsDialogOpen} />
                { }

                {cloneModalOpen && (
                  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                      <h2 className="text-lg font-semibold text-falbor-elements-textPrimary flex items-center gap-2">
                        <div className="i-ph:copy text-xl" />
                        Clone Website
                      </h2>
                      <p className="text-sm text-falbor-elements-textSecondary">
                        Enter the URL of the website you want to clone. Our agent will visit the site, extract its design, and build a replica.
                      </p>
                      <input
                        type="url"
                        placeholder="https://example.com"
                        value={cloneUrlInput}
                        onChange={(e) => setCloneUrlInput(e.target.value)}
                        className="w-full px-3 py-2 bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/50 text-falbor-elements-textPrimary placeholder-falbor-elements-textTertiary"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (cloneUrlInput.trim()) {
                              props.setCloneUrl?.(cloneUrlInput.trim());
                              if (props.handleInputChange) {
                                props.handleInputChange({ target: { value: 'Build a site like this one' } } as any);
                              }
                              setCloneModalOpen(false);
                              setCloneUrlInput('');
                            }
                          }
                        }}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => setCloneModalOpen(false)}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-falbor-elements-textSecondary hover:bg-falbor-elements-background-depth-3 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (cloneUrlInput.trim()) {
                              props.setCloneUrl?.(cloneUrlInput.trim());
                              if (props.handleInputChange) {
                                props.handleInputChange({ target: { value: 'Build a site like this one' } } as any);
                              }
                              setCloneModalOpen(false);
                              setCloneUrlInput('');
                            }
                          }}
                          disabled={!cloneUrlInput.trim()}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-500 text-white hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add URL
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        {displayTokenUsage && (
          <div className="text-center text-xs mt-2 text-falbor-elements-textTertiary">
            <span>
              Remaining Balance: <strong className="text-falbor-elements-textPrimary">{typeof balance === 'number' ? balance.toFixed(1) : (balance ?? 0)} credits</strong>
              {subscriptionTier === 'free' && (
                <>
                  {' '}·{' '}
                  <a
                    href="/upgrade"
                    className="text-[#0099ff] font-semibold hover:underline"
                  >
                    Upgrade Plan
                  </a>
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
