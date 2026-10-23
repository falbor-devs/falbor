'use client';
import { useParams, usePathname } from "next/navigation";
import { WorkspaceSourcesView } from '~/components/workspace/sources/WorkspaceSourcesView';
import { WorkspaceSourceDetailView } from '~/components/workspace/sources/WorkspaceSourceDetailView';
import { WorkspaceCanvasView } from '~/components/workspace/canvas/WorkspaceCanvasView';
import { WorkspaceTrendsView } from '~/components/workspace/trends/WorkspaceTrendsView';
import { WorkspaceBudgetView } from '~/components/workspace/budget/WorkspaceBudgetView';
import { WorkspaceBudgetMarketResultView } from '~/components/workspace/budget/WorkspaceBudgetMarketResultView';
import { WorkspaceBrowserView } from '~/components/workspace/browser/WorkspaceBrowserView';
import { WorkspaceAgentContactView } from '~/components/workspace/agent-contact/WorkspaceAgentContactView';
import { WorkspaceAdsMarketingView } from '~/components/workspace/ads/WorkspaceAdsMarketingView';
import { WorkspaceAdsPlaygroundView } from '~/components/workspace/ads/WorkspaceAdsPlaygroundView';
import { WorkspaceAdsAnimationView } from '~/components/workspace/ads/WorkspaceAdsAnimationView';
import { WorkspaceGoogleAdsView } from '~/components/workspace/ads/WorkspaceGoogleAdsView';
import { WorkspaceMetaAdsView } from '~/components/workspace/ads/WorkspaceMetaAdsView';
import { WorkspaceAutomationView } from '~/components/workspace/automations/WorkspaceAutomationView';
import { WorkspaceBlogContentView } from '~/components/workspace/ads/WorkspaceBlogContentView';
import { WorkspacePresentationView } from '~/components/workspace/ads/WorkspacePresentationView';
import { WorkspaceMentionsView } from '~/components/workspace/mentions/WorkspaceMentionsView';
import { MyProspectsView } from '~/components/workspace/contacts/MyProspectsView';
import { CommunityMessagesView } from '~/components/community/CommunityMessagesView';
import { MilestoneView } from '~/components/milestone/MilestoneView';
import { WorkspaceCompetitorsView } from '~/components/workspace/competitors/WorkspaceCompetitorsView';
import { WorkspaceAiAeoView } from '~/components/workspace/ai-aeo/WorkspaceAiAeoView';
import { AiStartupArenaView } from '~/components/workspace/games/AiStartupArenaView';
import { WorkspaceAgentView } from '~/components/workspace/agent/WorkspaceAgentView';
import { WorkspaceDemandCaptureView } from '~/components/workspace/intelligence/WorkspaceDemandCaptureView';
import { WorkspaceFeatureIntelligenceView } from '~/components/workspace/intelligence/WorkspaceFeatureIntelligenceView';

import type { JSONValue, Message } from 'ai';
import React, { type RefCallback, useEffect, useState } from 'react';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { MainContentSpinner } from '~/components/ui/MainContentSpinner';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';


import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { PROVIDER_LIST } from '~/utils/constants';
import { Messages } from '../messages/Messages.client';
import Cookies from 'js-cookie';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Popover from '@radix-ui/react-popover';
import styles from './BaseChat.module.scss';
import { ImportButtons } from '~/components/chat/chatExportAndImport/ImportButtons';
import { ExamplePrompts } from '~/components/chat/core/ExamplePrompts';
import GitCloneButton from '../deploy/GitCloneButton';
import type { ProviderInfo } from '~/types/model';
import StarterTemplates from './StarterTemplates';
import type { ActionAlert, SupabaseAlert, DeployAlert, LlmErrorAlertType } from '~/types/actions';
import DeployChatAlert from '~/components/deploy/DeployAlert';
import ChatAlert from '../alerts/ChatAlert';
import { Button } from '~/components/ui/Button';
import type { ModelInfo } from '~/lib/modules/llm/types';
import ProgressCompilation from '../messages/ProgressCompilation';
import type { ProgressAnnotation } from '~/types/context';
import { SupabaseChatAlert } from '~/components/chat/alerts/SupabaseAlert';
import { expoUrlAtom } from '~/lib/stores/qrCodeStore';
import { useStore } from '@nanostores/react';
import { StickToBottom, useStickToBottomContext } from '~/lib/hooks';
import { toast } from 'react-toastify';
import { Slider } from '~/components/ui/Slider';
import { ChatBox } from '../input/ChatBox';
import { WorkspaceBuildProgress } from '~/components/workspace/build/WorkspaceBuildProgress';
import { useWorkspaceBuild } from '~/lib/hooks/useWorkspaceBuild';
import { ChatHistoryBox } from './ChatHistoryBox';
import type { DesignScheme } from '~/types/design-scheme';
import type { ElementInfo } from '~/components/workbench/Inspector';
import LlmErrorAlert from '../alerts/LLMApiAlert';
import ViewErrorAlert from '../alerts/ViewErrorAlert';
import { DesignSystemPanel } from '../settings/DesignSystemPanel';
import { useDesignSystem } from '~/lib/hooks/useDesignSystem';
import { workbenchStore } from '~/lib/stores/workbench';
import { useMCPStore } from '~/lib/stores/mcp';
import { RainbowTextEffect } from '../../ui/textUIrgb';
import { TextShimmer } from '../../ui/text-shimmer';
import { FeedbackWidget } from '~/components/ui/FeedbackWidget';
import { HistoryPanel } from './HistoryPanel';
import { getImagesForChat, removeBackgroundFromBase64, saveImageToStore } from '~/lib/utils/imageStore';
import { chatId } from '~/lib/persistence';
import { ProductIntelligencePanel } from '~/components/workspace/intelligence/ProductIntelligencePanel';
import { ControlPanel } from '~/components/@settings';
import { settingsOpenStore, settingsTabStore } from '~/lib/stores/settings';

const TEXTAREA_MIN_HEIGHT = 76;

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  onStreamingChange?: (streaming: boolean) => void;
  messages?: Message[];
  description?: string;
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  providerList?: ProviderInfo[];
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
  exportChat?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  actionAlert?: ActionAlert;
  clearAlert?: () => void;
  supabaseAlert?: SupabaseAlert;
  clearSupabaseAlert?: () => void;
  deployAlert?: DeployAlert;
  clearDeployAlert?: () => void;
  llmErrorAlert?: LlmErrorAlertType;
  clearLlmErrorAlert?: () => void;
  data?: JSONValue[] | undefined;
  chatMode?: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research';
  setChatMode?: (mode: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research') => void;
  append?: (message: Message) => void;
  designScheme?: DesignScheme;
  setDesignScheme?: (scheme: DesignScheme) => void;
  selectedElement?: ElementInfo | null;
  setSelectedElement?: (element: ElementInfo | null) => void;
  hideIntro?: boolean;
  cloneUrl?: string | null;
  setCloneUrl?: (url: string | null) => void;
  addToolResult?: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
  onWebSearchResult?: (result: string) => void;
  hideSlider?: boolean;
  isCompact?: boolean;
  fullMessages?: Message[];
  onRewind?: (id: string) => void;
}

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      onStreamingChange,
      model,
      setModel,
      provider,
      setProvider,
      providerList,
      input = '',
      enhancingPrompt,
      handleInputChange,


      enhancePrompt,
      sendMessage,
      handleStop,
      importChat,
      exportChat,
      uploadedFiles = [],
      setUploadedFiles,
      imageDataList = [],
      setImageDataList,
      messages,
      actionAlert,
      clearAlert,
      deployAlert,
      clearDeployAlert,
      supabaseAlert,
      clearSupabaseAlert,
      llmErrorAlert,
      clearLlmErrorAlert,
      data,
      chatMode,
      setChatMode,
      append,
      designScheme,
      setDesignScheme,
      selectedElement,
      setSelectedElement,
      hideIntro,
      hideSlider,
      isCompact,
      cloneUrl,
      setCloneUrl,
      addToolResult = () => {
        throw new Error('addToolResult not implemented');
      },
      onWebSearchResult,
      fullMessages,
      onRewind,
    },
    ref,
  ) => {
    const params = useParams();
    const pathname = usePathname();
    const workspaceId = params?.id as string;
    const isLoggedIn = true;

    const isSettingsOpen = useStore(settingsOpenStore);
    const activeSettingsTab = useStore(settingsTabStore);
    const isBrowserOpen = useStore(aiSidebarStore.isBrowserOpen);

    // UI Layout helpers
    const isAiAeoPage = pathname?.includes('/ai-aeo');
    const isCompetitorsPage = pathname?.includes('/competitors');
    const isDemandCapturePage = pathname?.includes('/demand-capture');
    const isFeatureIntelligencePage = pathname?.includes('/feature-intelligence');
    const isCanvasPage = pathname?.includes('/canvas');
    const isSourcesPage = pathname?.includes('/sources');
    const sourceChannelMatch = pathname?.match(/\/sources\/([^\/]+)/);
    const sourceChannelId = sourceChannelMatch ? sourceChannelMatch[1] : '';
    const isSourceDetailPage = isSourcesPage && !!sourceChannelId;
    const isProductPage = pathname?.includes('/product') && !pathname?.includes('/product-deck');
    const isVibePage = pathname?.includes('/vibe');
    const isBudgetMarketPage = pathname?.includes('/budget/market');
    const isBudgetPage = pathname?.includes('/budget') && !isBudgetMarketPage;
    const isAdsMarketingPage = pathname?.includes('/ads-marketing');
    const isAdsPlaygroundPage = pathname?.includes('/ads-marketing/playground/');
    const isAdsAnimationPage = pathname?.includes('/ads-marketing/playground/animation/');
    const isGoogleAdsPage = pathname?.includes('/google-ads');
    const isMetaAdsPage = pathname?.includes('/meta-ads');
    const isAutomationPage = pathname?.includes('/automation');
    const isBlogContentPage = pathname?.includes('/blog-content');
    const isProductDeckPage = pathname?.includes('/product-deck');
    const isAgentContactPage = pathname?.includes('/agent-contact');
    const isAgentPage = (pathname?.includes('/agent') && !isAgentContactPage) || false;
    const isMyProspectsPage = pathname?.includes('/my-prospects');
    const isMentionsPage = pathname?.includes('/mentions');
    const isCommunityMessagesPage = pathname?.includes('/community/messages');
    const isMilestonePage = pathname?.includes('/milestone');
    const isArenaPage = pathname?.includes('/games/ai-startup-arena');
    const isNewChat = pathname?.includes('/new/');
    const isWorkspaceHome = !!workspaceId && !isAiAeoPage && !isCompetitorsPage && !isCanvasPage && !isSourcesPage && !isProductPage && !isVibePage && !isBudgetPage && !isBudgetMarketPage && !isAdsMarketingPage && !isGoogleAdsPage && !isMetaAdsPage && !isAutomationPage && !isBlogContentPage && !isProductDeckPage && !isAgentContactPage && !isAgentPage && !isMyProspectsPage && !isMentionsPage && !isCommunityMessagesPage && !isMilestonePage && !isArenaPage && !isNewChat;
    const { build: workspaceBuild, isBuilding: isWorkspaceBuilding, retry: retryWorkspaceBuild } = useWorkspaceBuild(workspaceId);
    const showBuildProgress = isWorkspaceBuilding && !!workspaceBuild && (isWorkspaceHome || isSourcesPage || isCanvasPage || isMentionsPage || isMilestonePage || isBlogContentPage || isProductDeckPage);

    let marketId = '';
    if (isBudgetMarketPage) {
      const match = pathname?.match(/\/market\/([^\/]+)/);
      if (match) marketId = match[1];
    }

    const [isTabChanging, setIsTabChanging] = useState(false);

    useEffect(() => {
      setIsTabChanging(true);
      const timer = setTimeout(() => setIsTabChanging(false), 200);
      return () => clearTimeout(timer);
    }, [pathname]);

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [modelList, setModelList] = useState<ModelInfo[]>([]);
    const [isModelSettingsCollapsed, setIsModelSettingsCollapsed] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [transcript, setTranscript] = useState('');
    const [isModelLoading, setIsModelLoading] = useState<string | undefined>('all');
    const [progressAnnotations, setProgressAnnotations] = useState<ProgressAnnotation[]>([]);
    const processedFiles = React.useRef(new Set<string>());
    const currentChatId = useStore(chatId);
    const expoUrl = useStore(expoUrlAtom);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const showMainChatBox = !chatStarted;
    const { handleDesignSystemSave, handleLiveUpdate } = useDesignSystem();
    const isDesignSystemMode = useStore(workbenchStore.isDesignSystemMode);
    const showWorkbench = useStore(workbenchStore.showWorkbench);

    useEffect(() => {
      if (expoUrl) {
        setQrModalOpen(true);
      }
    }, [expoUrl]);

    useEffect(() => {
      import('~/lib/webcontainer').then(({ startWebContainer, webcontainer }) => {
        startWebContainer();


        if (currentChatId) {
          getImagesForChat(currentChatId).then(images => {
            if (images && images.length > 0) {
              webcontainer.then(async (wc) => {
                for (const img of images) {
                  try {
                    const pathParts = img.filePath.split('/');
                    if (pathParts.length > 1) {
                      pathParts.pop();
                      const dir = pathParts.join('/');
                      await wc.fs.mkdir(dir, { recursive: true });
                    }
                    const binaryString = atob(img.base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                      bytes[i] = binaryString.charCodeAt(i);
                    }
                    await wc.fs.writeFile(img.filePath, bytes);
                  } catch (e) {
                    console.error(`Failed to restore image ${img.filePath}`, e);
                  }
                }
              });
            }
          });
        }
      });
    }, [currentChatId]);

    useEffect(() => {
      if (data) {
        const progressList = data.filter(
          (x) => typeof x === 'object' && (x as any).type === 'progress',
        ) as ProgressAnnotation[];
        setProgressAnnotations(progressList);

        const fileWrites = data.filter(
          (x) => typeof x === 'object' && (x as any).type === 'file-write',
        );

        fileWrites.forEach((item: any) => {
          if (!processedFiles.current.has(item.filePath)) {
            processedFiles.current.add(item.filePath);
            import('~/lib/webcontainer').then(({ webcontainer }) => {
              webcontainer.then(async (wc) => {
                try {
                  const pathParts = item.filePath.split('/');
                  if (pathParts.length > 1) {
                    pathParts.pop();
                    const dir = pathParts.join('/');
                    await wc.fs.mkdir(dir, { recursive: true });
                  }

                  const base64Data = item.content;

                  const processedBase64 = await removeBackgroundFromBase64(base64Data);

                  const binaryString = atob(processedBase64);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  await wc.fs.writeFile(item.filePath, bytes);
                  console.log(`Successfully wrote generated image to ${item.filePath}`);


                  if (currentChatId) {
                    await saveImageToStore(currentChatId, item.filePath, processedBase64);
                  }
                } catch (e) {
                  console.error(`Failed to write image ${item.filePath}`, e);
                }
              });
            });
          }
        });
      }
    }, [data]);
    useEffect(() => {
      console.log(transcript);
    }, [transcript]);

    useEffect(() => {
      onStreamingChange?.(isStreaming);
    }, [isStreaming, onStreamingChange]);

    useEffect(() => {
      if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('');

          setTranscript(transcript);

          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: transcript },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        setRecognition(recognition);
      }
    }, []);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        setIsModelLoading('all');
        fetch('/api/models')
          .then((response) => response.json())
          .then((data) => {
            const typedData = data as { modelList?: ModelInfo[] };
            setModelList(typedData?.modelList || []);
          })
          .catch((error) => {
            console.error('Error fetching model list:', error);
          })
          .finally(() => {
            setIsModelLoading(undefined);
          });
      }
    }, [providerList, provider]);

    const onApiKeysChange = async (providerName: string, apiKey: string) => {
      await fetch('/api/provider-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerName, apiKey }),
      });
      setApiKeys({ ...apiKeys, [providerName]: 'configured' });

      setIsModelLoading(providerName);

      let providerModels: ModelInfo[] = [];

      try {
        const response = await fetch(`/api/models/${encodeURIComponent(providerName)}`);
        const data = await response.json();
        providerModels = (data as { modelList?: ModelInfo[] })?.modelList || [];
      } catch (error) {
        console.error('Error loading dynamic models for:', providerName, error);
      }


      setModelList((prevModels) => {
        const otherModels = prevModels.filter((model) => model.provider !== providerName);
        return [...otherModels, ...providerModels];
      });
      setIsModelLoading(undefined);
    };

    const startListening = () => {
      if (recognition) {
        recognition.start();
        setIsListening(true);
      }
    };

    const stopListening = () => {
      if (recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };

    const handleSendMessage = (event: React.UIEvent, messageInput?: string) => {
      if (sendMessage) {
        sendMessage(event, messageInput);
        setSelectedElement?.(null);

        if (recognition) {
          recognition.abort();
          setTranscript('');
          setIsListening(false);


          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: '' },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        }
      }
    };

    const handleFileUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (file) {
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;
            setUploadedFiles?.([...uploadedFiles, file]);
            setImageDataList?.([...imageDataList, base64Image]);
          };
          reader.readAsDataURL(file);
        }
      };

      input.click();
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();

          if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
              const base64Image = e.target?.result as string;
              setUploadedFiles?.([...uploadedFiles, file]);
              setImageDataList?.([...imageDataList, base64Image]);
            };
            reader.readAsDataURL(file);
          }

          break;
        }
      }
    };

    const pendingQuestions = React.useMemo(() => {
      if (!messages || messages.length === 0) return [];
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== 'assistant') return [];

      const content = lastMessage.content;
      if (!content) return [];

      const regex = /<falborAction\s+[^>]*type="question"[^>]*>([\s\S]*?)<\/falborAction>/g;
      const questions = [];
      let match;
      while ((match = regex.exec(content)) !== null) {
        try {
          let jsonStr = match[1].trim();
          if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
          } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
          }
          const data = JSON.parse(jsonStr);
          questions.push(data);
        } catch (e) {
          console.error("Failed to parse question action", e);
        }
      }
      return questions;
    }, [messages]);

    const baseChat = (
      <div
        ref={ref}
        className={classNames(styles.BaseChat, 'relative flex flex-1 min-h-0 h-full w-full overflow-hidden flex-col')}
        data-chat-visible={showChat}
      >

        <div className={classNames("flex-1 min-h-0 flex h-full", { "gap-[20px] pt-[10px] pl-[10px]": (!chatStarted || isAiAeoPage || isCompetitorsPage || isSourcesPage || isCanvasPage || isProductPage || isVibePage || isBudgetPage || isBudgetMarketPage || isAdsMarketingPage || isGoogleAdsPage || isMetaAdsPage || isAutomationPage || isBlogContentPage || isProductDeckPage || isMilestonePage || isArenaPage || isMentionsPage) && !isAgentPage && !isAdsPlaygroundPage && isLoggedIn })}>
          {!isCanvasPage && !isWorkspaceHome && !isAiAeoPage && !isCompetitorsPage && !isSourcesPage && !isProductPage && !isBudgetPage && !isBudgetMarketPage && !isAdsMarketingPage && !isGoogleAdsPage && !isMetaAdsPage && !isAutomationPage && !isBlogContentPage && !isProductDeckPage && !isAgentContactPage && !isAgentPage && !isMyProspectsPage && !isMentionsPage && !isCommunityMessagesPage && !isMilestonePage && !isArenaPage && (
            <div className={classNames("h-full min-h-0 flex flex-col", {
              'pt-[10px]': chatStarted && (isAiAeoPage || isCompetitorsPage || isSourcesPage || isProductPage || isBudgetPage || isBudgetMarketPage || isAdsMarketingPage || isGoogleAdsPage || isMetaAdsPage || isAutomationPage || isBlogContentPage || isProductDeckPage || isMilestonePage || isArenaPage || isAgentPage),
              'pt-[var(--header-height)]': chatStarted && !isAiAeoPage && !isCompetitorsPage && !isSourcesPage && !isCanvasPage && !isProductPage && !isVibePage && !isBudgetPage && !isBudgetMarketPage && !isAdsMarketingPage && !isGoogleAdsPage && !isMetaAdsPage && !isAutomationPage && !isBlogContentPage && !isProductDeckPage && !isAgentContactPage && !isAgentPage && !isMyProspectsPage && !isMentionsPage && !isCommunityMessagesPage && !isMilestonePage && !isArenaPage && !isWorkspaceHome,
              'w-full flex-1': (chatStarted && !isAiAeoPage && !isCompetitorsPage && !isSourcesPage && !isCanvasPage && !isProductPage && !isVibePage && !isBudgetPage && !isBudgetMarketPage && !isAdsMarketingPage && !isGoogleAdsPage && !isMetaAdsPage && !isAutomationPage && !isBlogContentPage && !isProductDeckPage && !isCommunityMessagesPage && !isMilestonePage && !isArenaPage && !isWorkspaceHome) || !isLoggedIn || !workspaceId || isVibePage,
              'w-[520px] shrink-0': (!chatStarted || isAiAeoPage || isCompetitorsPage || isSourcesPage || isProductPage || isBudgetPage || isBudgetMarketPage || isAdsMarketingPage || isGoogleAdsPage || isMetaAdsPage || isAutomationPage || isBlogContentPage || isProductDeckPage || isMilestonePage || isArenaPage) && isLoggedIn && !!workspaceId && !isCanvasPage && !isVibePage && !isAgentContactPage && !isAgentPage && !isMyProspectsPage && !isMentionsPage && !isCommunityMessagesPage && !isMilestonePage && !isWorkspaceHome && !isCompetitorsPage && !isAiAeoPage && !isArenaPage,
              'hidden': isCanvasPage || isWorkspaceHome || isAiAeoPage || isCompetitorsPage || isSourcesPage || isProductPage || isBudgetPage || isBudgetMarketPage || isAdsMarketingPage || isGoogleAdsPage || isMetaAdsPage || isAutomationPage || isBlogContentPage || isProductDeckPage || isAgentContactPage || isAgentPage || isMyProspectsPage || isMentionsPage || isCommunityMessagesPage || isMilestonePage || isArenaPage
            })}>
              <div className={classNames(styles.Chat, 'flex flex-col h-full relative w-full')}>
                <FeedbackWidget hasMessages={(messages?.length || 0) > 1} />
                <HistoryPanel messages={fullMessages && fullMessages.length > (messages?.length || 0) ? fullMessages : (messages || [])} onRewind={onRewind} />
                <StickToBottom
                  data-scrollable="true"
                  className={classNames('px-2 relative', {
                    'h-full flex flex-col pt-0': chatStarted,
                    'pt-2': !chatStarted
                  })}
                >
                  <StickToBottom.Content className="flex flex-col gap-4 relative pt-0 mt-0">
                    <ClientOnly>
                      {() => {
                        return chatStarted ? (
                          <Messages
                            className="flex flex-col w-full flex-1 max-w-chat pb-4 mx-auto z-1"
                            messages={messages}
                            isStreaming={isStreaming}
                            append={append}
                            chatMode={chatMode}
                            setChatMode={setChatMode}
                            provider={provider}
                            model={model}
                            addToolResult={addToolResult}
                          />
                        ) : null;
                      }}
                    </ClientOnly>
                    <ScrollToBottom />
                  </StickToBottom.Content>
                  <div
                    className={classNames('my-auto flex flex-col gap-2 w-full max-w-chat mx-auto z-prompt mb-6', {
                      'sticky bottom-2': chatStarted,
                    })}
                  >
                    {!chatStarted && <h1 className="dark:text-white/80 text-3xl">What do you want to build?</h1>}
                    <div className="flex flex-col gap-2">
                      {supabaseAlert && (
                        <SupabaseChatAlert
                          alert={supabaseAlert}
                          clearAlert={() => clearSupabaseAlert?.()}
                          postMessage={(message) => {
                            sendMessage?.({} as any, message);
                            clearSupabaseAlert?.();
                          }}
                        />
                      )}
                      {actionAlert && (
                        <ChatAlert
                          alert={actionAlert}
                          clearAlert={() => clearAlert?.()}
                          postMessage={(message) => {
                            sendMessage?.({} as any, message);
                            clearAlert?.();
                          }}
                        />
                      )}
                      {llmErrorAlert && <LlmErrorAlert alert={llmErrorAlert} clearAlert={() => clearLlmErrorAlert?.()} />}
                      {!hideIntro && (
                        <ViewErrorAlert
                          postMessage={(message) => {
                            sendMessage?.({} as any, message);
                          }}
                        />
                      )}
                    </div>
                    <div className={classNames({ '': !chatStarted })}>
                      {deployAlert && (
                        <DeployChatAlert
                          alert={deployAlert}
                          clearAlert={() => clearDeployAlert?.()}
                          postMessage={(message: string | undefined) => {
                            sendMessage?.({} as any, message);
                            clearSupabaseAlert?.();
                          }}
                        />
                      )}
                      {progressAnnotations && <ProgressCompilation data={progressAnnotations} />}
                      <ChatBox
                        inputLockedMessage={isWorkspaceBuilding ? 'Your workspace is still being built. The AI is currently researching your product and market.' : undefined}
                        isModelSettingsCollapsed={isModelSettingsCollapsed}
                        setIsModelSettingsCollapsed={setIsModelSettingsCollapsed}
                        provider={provider}
                        setProvider={setProvider}
                        providerList={providerList && providerList.length > 0 ? providerList : (PROVIDER_LIST as ProviderInfo[])}
                        model={model}
                        setModel={setModel}
                        modelList={modelList}
                        apiKeys={apiKeys}
                        isModelLoading={isModelLoading}
                        onApiKeysChange={onApiKeysChange}
                        uploadedFiles={uploadedFiles}
                        setUploadedFiles={setUploadedFiles}
                        imageDataList={imageDataList}
                        setImageDataList={setImageDataList}
                        textareaRef={textareaRef}
                        input={input}
                        handleInputChange={handleInputChange}
                        handlePaste={handlePaste}
                        TEXTAREA_MIN_HEIGHT={TEXTAREA_MIN_HEIGHT}
                        TEXTAREA_MAX_HEIGHT={TEXTAREA_MAX_HEIGHT}
                        isStreaming={isStreaming}
                        handleStop={handleStop}
                        handleSendMessage={handleSendMessage}
                        enhancingPrompt={enhancingPrompt}
                        enhancePrompt={enhancePrompt}
                        isListening={isListening}
                        startListening={startListening}
                        stopListening={stopListening}
                        chatStarted={chatStarted}
                        exportChat={exportChat}
                        qrModalOpen={qrModalOpen}
                        setQrModalOpen={setQrModalOpen}
                        handleFileUpload={handleFileUpload}
                        setChatMode={setChatMode}
                        designScheme={designScheme}
                        setDesignScheme={setDesignScheme}
                        selectedElement={selectedElement}
                        setSelectedElement={setSelectedElement}
                        cloneUrl={cloneUrl}
                        setCloneUrl={setCloneUrl}
                        onWebSearchResult={onWebSearchResult}
                        pendingQuestions={pendingQuestions}
                      />
                      {!hideSlider && !isSourcesPage && !isCanvasPage && !isWorkspaceHome && !chatStarted && setChatMode && chatMode && (
                        <div className="flex justify-start mt-3 max-w-chat mx-auto">
                          <Slider
                            selected={chatMode}
                            options={{
                              left: { value: 'build', text: 'MVP', icon: 'i-ph:rocket-launch-duotone' },
                              middle: { value: 'troubleshoot', text: 'Troubleshoot', icon: 'i-ph:wrench-duotone' },
                              right: { value: 'discuss', text: 'Chat', icon: 'i-ph:chats-duotone' },
                              extra: { value: 'idea', text: 'Idea', icon: 'i-ph:lightbulb-duotone' },
                              extra2: { value: 'mvp_research', text: 'Research', icon: 'i-ph:flask-duotone' },
                            }}
                            setSelected={setChatMode as any}
                          />
                        </div>
                      )}
                      {!chatStarted && isLoggedIn && !workspaceId && <ChatHistoryBox />}
                    </div>
                  </div>
                </StickToBottom>
              </div>
              <ClientOnly>
                {() => (
                  <Workbench chatStarted={chatStarted} isStreaming={isStreaming} setSelectedElement={setSelectedElement} sendMessage={sendMessage} />
                )}
              </ClientOnly>
            </div>
          )}
          {((!chatStarted || isAiAeoPage || isCompetitorsPage || isDemandCapturePage || isFeatureIntelligencePage || isSourcesPage || isCanvasPage || isProductPage || isBudgetPage || isBudgetMarketPage || isBlogContentPage || isProductDeckPage || isAgentContactPage || isAgentPage || isMyProspectsPage || isMentionsPage || isCommunityMessagesPage || isMilestonePage || isArenaPage || isWorkspaceHome || isAutomationPage) && isLoggedIn && !isVibePage) && (
            <div className={classNames("h-full min-w-0", isAgentPage || isAdsPlaygroundPage ? "w-full p-0 m-0" : (isBrowserOpen || isAiAeoPage || isCompetitorsPage || isDemandCapturePage || isFeatureIntelligencePage || isCanvasPage || isWorkspaceHome || isSourcesPage || isProductPage || isBudgetPage || isBudgetMarketPage || isBlogContentPage || isProductDeckPage || isAgentContactPage || isMyProspectsPage || isMentionsPage || isCommunityMessagesPage || isMilestonePage || isArenaPage || isAutomationPage || (isAdsMarketingPage && !isAdsPlaygroundPage)) ? "w-full pb-6 pr-6 pl-6" : "flex-1 pb-6 pr-6")}>
              <div className={classNames("h-full flex flex-col min-h-0", isAgentPage || isAdsPlaygroundPage ? "mt-0 overflow-hidden" : "mt-2 overflow-y-auto custom-scrollbar")}>
                {isSettingsOpen ? (
                  <ControlPanel open={true} onClose={() => settingsOpenStore.set(false)} activeTab={activeSettingsTab as any} inline />
                ) : isBrowserOpen ? (
                  <WorkspaceBrowserView workspaceId={workspaceId} />
                ) : isTabChanging ? (
                  <MainContentSpinner message="Loading workspace view..." />
                ) : showBuildProgress && workspaceBuild ? (
                  <WorkspaceBuildProgress build={workspaceBuild} onRetry={retryWorkspaceBuild} />
                ) : isAiAeoPage ? (
                  <WorkspaceAiAeoView workspaceId={workspaceId} />
                ) : isCompetitorsPage ? (
                  <WorkspaceCompetitorsView workspaceId={workspaceId} />
                ) : isDemandCapturePage ? (
                  <WorkspaceDemandCaptureView workspaceId={workspaceId} />
                ) : isFeatureIntelligencePage ? (
                  <WorkspaceFeatureIntelligenceView workspaceId={workspaceId} />
                ) : isSourceDetailPage ? (
                  <WorkspaceSourceDetailView workspaceId={workspaceId} channelId={sourceChannelId} />
                ) : isSourcesPage ? (
                  <WorkspaceSourcesView workspaceId={workspaceId} />
                ) : isCanvasPage ? (
                  <WorkspaceCanvasView workspaceId={workspaceId} />
                ) : isProductPage ? (
                  <WorkspaceTrendsView workspaceId={workspaceId} />
                ) : isBudgetPage ? (
                  <WorkspaceBudgetView workspaceId={workspaceId} />
                ) : isBudgetMarketPage ? (
                  <WorkspaceBudgetMarketResultView workspaceId={workspaceId} marketId={marketId} />
                ) : isAdsAnimationPage ? (
                  <WorkspaceAdsAnimationView workspaceId={workspaceId} animationId={pathname?.match(/\/ads-marketing\/playground\/animation\/([^/]+)/)?.[1] || 'new'} />
                ) : isAdsPlaygroundPage ? (
                  <WorkspaceAdsPlaygroundView workspaceId={workspaceId} playgroundId={pathname?.match(/\/ads-marketing\/playground\/([^/]+)/)?.[1] || 'new'} />
                ) : isAdsMarketingPage ? (
                  <WorkspaceAdsMarketingView workspaceId={workspaceId} />
                ) : isGoogleAdsPage ? (
                  <WorkspaceGoogleAdsView workspaceId={workspaceId} />
                ) : isMetaAdsPage ? (
                  <WorkspaceMetaAdsView workspaceId={workspaceId} />
                ) : isAutomationPage ? (
                  <WorkspaceAutomationView workspaceId={workspaceId} />
                ) : isBlogContentPage ? (
                  <WorkspaceBlogContentView workspaceId={workspaceId} />
                ) : isProductDeckPage ? (
                  <WorkspacePresentationView workspaceId={workspaceId} />
                ) : isAgentContactPage ? (
                  <WorkspaceAgentContactView workspaceId={workspaceId} />
                ) : isAgentPage ? (
                  <WorkspaceAgentView workspaceId={workspaceId} />
                ) : isMyProspectsPage ? (
                  <MyProspectsView workspaceId={workspaceId} />
                ) : isMentionsPage ? (
                  <WorkspaceMentionsView workspaceId={workspaceId} />
                ) : isCommunityMessagesPage ? (
                  <CommunityMessagesView />
                ) : isMilestonePage ? (
                  <MilestoneView workspaceId={workspaceId} />
                ) : isArenaPage ? (
                  <AiStartupArenaView workspaceId={workspaceId} />
                ) : isWorkspaceHome ? (
                  <ProductIntelligencePanel workspaceId={workspaceId} />
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    return <Tooltip.Provider delayDuration={200}>{baseChat}</Tooltip.Provider>;
  },
);

function ScrollToBottom() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  return (
    !isAtBottom && (
      <>
        <div className="sticky bottom-0 w-full max-w-chat mx-auto bg-gradient-to-t from-falbor-elements-background-depth-1 to-transparent h-20 z-10 pointer-events-none" />
        <button
          className="sticky z-50 bottom-0 left-0 right-0 text-4xl rounded-lg px-1.5 py-0.5 flex items-center justify-center mx-auto gap-2 bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor text-falbor-elements-textPrimary text-sm"
          onClick={() => scrollToBottom()}
        >
          Latest messages
          <span className="i-ph:arrow-down-bold" />
        </button>
      </>
    )
  );
}
