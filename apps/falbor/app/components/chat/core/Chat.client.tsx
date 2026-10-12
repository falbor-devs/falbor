'use client';
import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts } from '~/lib/hooks';
import { description as descriptionStore, useChatHistory, chatId, chatMetadata } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { cloneWebsitePayload } from '~/lib/stores/cloneWebsite';
import { webcontainer } from '~/lib/webcontainer';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, MODEL_REGEX, PROMPT_COOKIE_KEY, PROVIDER_LIST, PROVIDER_REGEX } from '~/utils/constants';
import { setRewindId } from '~/lib/api/data/chat';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';


import { selectedDatabase } from '~/lib/stores/database';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import type { ProviderInfo } from '~/types/model';
import { useSearchParams } from 'next/navigation';
import { createSampler } from '~/utils/sampler';
import { getTemplates, selectStarterTemplate } from '~/utils/selectStarterTemplate';
import { logStore } from '~/lib/stores/logs';
import { streamingState } from '~/lib/stores/streaming';
import { filesToArtifacts } from '~/utils/fileUtils';
import { supabaseConnection } from '~/lib/stores/supabase';
import { defaultDesignScheme, type DesignScheme } from '~/types/design-scheme';
import type { ElementInfo } from '~/components/workbench/Inspector';
import type { TextUIPart, FileUIPart, Attachment } from '@ai-sdk/ui-utils';
import { useMCPStore } from '~/lib/stores/mcp';
import type { LlmErrorAlertType } from '~/types/actions';
import { skillsStore } from '~/lib/stores/skills';

const logger = createScopedLogger('Chat');

export function Chat({ hideIntro, hideSlider, isCompact }: { hideIntro?: boolean; hideSlider?: boolean; isCompact?: boolean }) {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory, importChat, exportChat, updateChatMestaData } = useChatHistory();
  const title = useStore(descriptionStore);


  return (
    <>
      {ready && (
        <ChatImpl
          description={title}
          initialMessages={initialMessages}
          exportChat={exportChat}
          storeMessageHistory={storeMessageHistory}
          importChat={importChat}
          updateChatMestaData={updateChatMestaData}
          hideIntro={hideIntro}
          hideSlider={hideSlider}
          isCompact={isCompact}
        />
      )}
    </>
  );
}

const processSampledMessages = createSampler(
  (options: {
    messages: Message[];
    initialMessages: Message[];
    isLoading: boolean;
    parseMessages: (messages: Message[], isLoading: boolean) => void;
    storeMessageHistory: (messages: Message[]) => Promise<void>;
  }) => {
    const { messages, initialMessages, isLoading, parseMessages, storeMessageHistory } = options;
    parseMessages(messages, isLoading);

    if (messages.length > initialMessages.length && !isLoading) {
      storeMessageHistory(messages).catch((error) => toast.error(error.message));
    }
  },
  50,
);

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  importChat: (description: string, messages: Message[]) => Promise<void>;
  exportChat: () => void;
  updateChatMestaData?: (metadata: any) => Promise<void>;
  description?: string;
  hideIntro?: boolean;
  hideSlider?: boolean;
  isCompact?: boolean;
}

export const ChatImpl = memo(
  ({ description, initialMessages, storeMessageHistory, importChat, exportChat, updateChatMestaData, hideIntro, hideSlider, isCompact }: ChatProps) => {
    useShortcuts();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imageDataList, setImageDataList] = useState<string[]>([]);
    const [cloneUrl, setCloneUrl] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const [fakeLoading, setFakeLoading] = useState(false);
    const files = useStore(workbenchStore.files);
    const [designScheme, setDesignScheme] = useState<DesignScheme>(defaultDesignScheme);
    const actionAlert = useStore(workbenchStore.alert);
    const deployAlert = useStore(workbenchStore.deployAlert);
    const activeDb = useStore(selectedDatabase);
    const supabaseConn = useStore(supabaseConnection);
    const selectedProject = supabaseConn.stats?.projects?.find(
      (project) => project.id === supabaseConn.selectedProjectId,
    );
    const supabaseAlert = useStore(workbenchStore.supabaseAlert);
    const { activeProviders, promptId, autoSelectTemplate, contextOptimizationEnabled, applyDesignScheme } = useSettings();
    const [llmErrorAlert, setLlmErrorAlert] = useState<LlmErrorAlertType | undefined>(undefined);
    const currentChatId = useStore(chatId);
    const [localChatId] = useState(() =>
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    );
    const activeChatId = currentChatId || (initialMessages.length > 0 ? initialMessages[0].id : localChatId);

    const [provider, setProvider] = useState<ProviderInfo>(() => {
      const p = PROVIDER_LIST.find(p => p.staticModels?.some(m => m.name === DEFAULT_MODEL));
      return (p || DEFAULT_PROVIDER) as ProviderInfo;
    });
    const [model, setModel] = useState<string>(() => {
      if (typeof window !== 'undefined') {
        const savedModel = Cookies.get('selectedModel');
        if (savedModel) return savedModel;
      }
      return DEFAULT_MODEL;
    });

    useEffect(() => {
      if (provider && model && typeof window !== 'undefined') {
        localStorage.setItem('chat_model_' + activeChatId, JSON.stringify({ provider: provider.name, model }));
        Cookies.set('lastSelectedProvider', provider.name, { expires: 365 });
        Cookies.set('lastSelectedModel', model, { expires: 365 });
      }
    }, [provider, model, activeChatId]);

    useEffect(() => {
      if ((!initialMessages || initialMessages.length === 0) && typeof window !== 'undefined') {
        const saved = localStorage.getItem('chat_model_' + activeChatId);
        if (!saved) {
          fetch('/api/sync')
            .then(res => res.json())
            .then(data => {
              if (data.falbor_default_model) {
                const targetModel = data.falbor_default_model;
                const correctProvider = PROVIDER_LIST.find((p) => p.staticModels?.some(m => m.name === targetModel));
                if (correctProvider) {
                  setModel(targetModel);
                  setProvider(correctProvider as unknown as ProviderInfo);
                }
              }
            })
            .catch(console.error);
        }
      }

      const handleModelChange = (e: Event) => {
        const targetModel = (e as CustomEvent).detail;
        const correctProvider = PROVIDER_LIST.find((p) => p.staticModels?.some(m => m.name === targetModel));
        if (correctProvider) {
          setModel(targetModel);
          setProvider(correctProvider as unknown as ProviderInfo);
          toast.success('Model changed to: ' + targetModel);
        } else {
          toast.error('Failed to change model: Provider not found');
        }
      };

      window.addEventListener('falbor_default_model_changed', handleModelChange);
      return () => {
        window.removeEventListener('falbor_default_model_changed', handleModelChange);
      };
    }, [activeChatId, initialMessages]);

    const { showChat } = useStore(chatStore);
    const [animationScope, animate] = useAnimate();
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [chatMode, setChatMode] = useState<'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research' | 'mvp_research'>('idea');
    const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
    const mcpSettings = useMCPStore((state) => state.settings);
    const selectedMCPs = useMCPStore((state) => state.selectedMCPs);
    const isSlidesMode = useStore(workbenchStore.isSlidesMode);
    const isGameMode = useStore(workbenchStore.isGameMode);

    const chatBody = useMemo(() => ({
      apiKeys,
      files,
      promptId,
      contextOptimization: contextOptimizationEnabled,
      chatMode,
      isSlidesMode,
      isGameMode,
      designScheme: applyDesignScheme ? designScheme : undefined,
      supabase: {
        isConnected: supabaseConn.isConnected,
        hasSelectedProject: !!selectedProject,
        credentials: {
          supabaseUrl: supabaseConn?.credentials?.supabaseUrl,
          anonKey: supabaseConn?.credentials?.anonKey,
        },
      },
      databaseProvider: activeDb,
      maxLLMSteps: mcpSettings.maxLLMSteps,
      mcpEnabled: mcpSettings.mcpEnabled || selectedMCPs.length > 0,
      selectedMCPs: selectedMCPs,
      chatId: currentChatId || (initialMessages.length > 0 ? initialMessages[0].id : localChatId),
    }), [
      apiKeys,
      files,
      promptId,
      contextOptimizationEnabled,
      chatMode,
      isSlidesMode,
      isGameMode,
      applyDesignScheme,
      designScheme,
      supabaseConn.isConnected,
      selectedProject,
      supabaseConn?.credentials?.supabaseUrl,
      supabaseConn?.credentials?.anonKey,
      activeDb,
      mcpSettings.maxLLMSteps,
      mcpSettings.mcpEnabled,
      selectedMCPs,
      currentChatId,
      initialMessages,
      localChatId
    ]);

    const handleChatError = useCallback((error: any) => handleError(error, 'chat'), []);
    const handleChatFinish = useCallback((message: Message, response: { usage?: any }) => {
      const usage = response.usage;
      setData(undefined);

      
      

      if (usage) {
        console.log('Token usage:', usage);
        logStore.logProvider('Chat response completed', {
          component: 'Chat',
          action: 'response',
          model,
          provider: provider.name,
          usage,
          messageLength: message.content.length,
        });
      }

      logger.debug('Finished streaming');
    }, [model, provider.name]);

    const {
      messages,
      isLoading,
      input,
      handleInputChange,
      setInput,
      stop,
      append,
      setMessages,
      reload,
      error,
      data: chatData,
      setData,
      addToolResult,
    } = useChat({
      api: '/api/chat',
      body: chatBody,
      experimental_throttle: 50,
      sendExtraMessageFields: true,
      onError: handleChatError,
      onFinish: handleChatFinish,
      
      
      
      initialInput: Cookies.get(PROMPT_COOKIE_KEY) || '',
    });

    
    
    const _messagesInjected = useRef(false);
    useEffect(() => {
      if (_messagesInjected.current) return;
      _messagesInjected.current = true;

      let msgs = [...initialMessages];
      let inputFromLastMsg = '';

      const meta = chatMetadata.get();
      const rewindId = (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('rewindTo') : null) || meta?.rewindId;
      
      if (rewindId) {
          const idx = msgs.findIndex(m => m.id === rewindId);
          if (idx !== -1) {
              msgs = msgs.slice(0, idx + 1);
          }
      }

      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.role === 'user') {
          msgs.pop();
          if (typeof lastMsg.content === 'string' && !lastMsg.annotations?.includes('hidden')) {
            const cleaned = lastMsg.content.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '').trim();
            if (cleaned) inputFromLastMsg = cleaned;
          }
        }
      }

      if (msgs.length > 0) {
        setMessages(msgs);
      }
      if (inputFromLastMsg) {
        setInput(inputFromLastMsg);
      }
      
    }, []); 

    useEffect(() => {
      const prompt = searchParams.get('prompt');

      

      if (prompt) {
        window.history.replaceState(null, '', window.location.pathname);
        runAnimation();
        append({
          role: 'user',
          content: `[Model: ${DEFAULT_MODEL}]\n\n[Provider: ${DEFAULT_PROVIDER.name}]\n\n${prompt}`,
        });
      }
    }, [model, provider, searchParams]);

    const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
    const { parsedMessages, parseMessages } = useMessageParser();

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    useEffect(() => {
      chatStore.setKey('started', initialMessages.length > 0);

      
      if (initialMessages.length === 1 && initialMessages[0].role === 'user' && initialMessages[0].content.includes('Import and analyze the repository')) {
        const timer = setTimeout(() => {
          reload();
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [initialMessages]);

    useEffect(() => {
      processSampledMessages({
        messages,
        initialMessages,
        isLoading,
        parseMessages,
        storeMessageHistory,
      });
    }, [messages, isLoading, parseMessages]);

    useEffect(() => {
      const handleAutoFix = async (e: Event) => {
        const customEvent = e as CustomEvent;
        const { command, error } = customEvent.detail;

        try {
          const response = await fetch('/api/chat/auto-fix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ failedCommand: command, errorOutput: error }),
          });

          if (!response.ok || !response.body) {
            console.error('Auto-fix request failed');
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          let done = false;
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value, { stream: true });

            if (chunkValue) {
              setMessages((currentMessages) => {
                if (currentMessages.length === 0) return currentMessages;
                const lastMsg = currentMessages[currentMessages.length - 1];
                if (lastMsg.role !== 'assistant') return currentMessages;

                return [
                  ...currentMessages.slice(0, -1),
                  { ...lastMsg, content: lastMsg.content + chunkValue },
                ];
              });
            }
          }
        } catch (err) {
          console.error('Auto-fix streaming error:', err);
        }
      };

      window.addEventListener('falbor:auto-fix-error', handleAutoFix);
      return () => {
        window.removeEventListener('falbor:auto-fix-error', handleAutoFix);
      };
    }, [setMessages]);

    
    const [descriptionTriggered, setDescriptionTriggered] = useState(false);
    useEffect(() => {
      if (!descriptionTriggered && messages.length === 2 && !isLoading) {
        if (messages[0].role === 'user' && messages[1].role === 'assistant') {
          setDescriptionTriggered(true);
          const idToUse = currentChatId || activeChatId;
          if (idToUse) {
            fetch(`/api/data/chats/${idToUse}/description`, { method: 'POST' })
              .then(res => res.json())
              .then(data => {
                if (data && data.title) {
                  descriptionStore.set(data.title);
                }
              })
              .catch(console.error);
          }
        }
      }
    }, [messages, isLoading, descriptionTriggered, currentChatId, activeChatId]);

    const scrollTextArea = () => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    };

    const abort = () => {
      stop();
      chatStore.setKey('aborted', true);
      workbenchStore.abortAllActions();

      logStore.logProvider('Chat response aborted', {
        component: 'Chat',
        action: 'abort',
        model,
        provider: provider.name,
      });
    };

    const handleError = useCallback(
      (error: any, context: 'chat' | 'template' | 'llmcall' = 'chat') => {
        logger.error(`${context} request failed`, error);

        stop();
        setFakeLoading(false);

        let errorInfo = {
          message: 'An unexpected error occurred',
          isRetryable: true,
          statusCode: 500,
          provider: provider.name,
          type: 'unknown' as const,
          retryDelay: 0,
        };

        if (error.message) {
          try {
            const parsed = JSON.parse(error.message);

            if (parsed.error || parsed.message) {
              errorInfo = { ...errorInfo, ...parsed };
            } else {
              errorInfo.message = error.message;
            }
          } catch {
            errorInfo.message = error.message;
          }
        }

        let errorType: LlmErrorAlertType['errorType'] = 'unknown';
        let title = 'Request Failed';

        if (errorInfo.statusCode === 401 || errorInfo.message.toLowerCase().includes('api key')) {
          errorType = 'authentication';
          title = 'Authentication Error';
        } else if (errorInfo.statusCode === 429 || errorInfo.message.toLowerCase().includes('rate limit')) {
          errorType = 'rate_limit';
          title = 'Rate Limit Exceeded';
        } else if (errorInfo.message.toLowerCase().includes('quota')) {
          errorType = 'quota';
          title = 'Quota Exceeded';
        } else if (errorInfo.statusCode >= 500) {
          errorType = 'network';
          title = 'Server Error';
        }

        logStore.logError(`${context} request failed`, error, {
          component: 'Chat',
          action: 'request',
          error: errorInfo.message,
          context,
          retryable: errorInfo.isRetryable,
          errorType,
          provider: provider.name,
        });

        
        if (!errorInfo.message?.toLowerCase().includes('terminated')) {
          setLlmErrorAlert({
            type: 'error',
            title,
            description: errorInfo.message,
            provider: provider.name,
            errorType,
          });
        }
        setData([]);
      },
      [provider.name, stop],
    );

    const clearApiErrorAlert = useCallback(() => {
      setLlmErrorAlert(undefined);
    }, []);

    useEffect(() => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;

        textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
        textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
      }
    }, [input, textareaRef]);

    const runAnimation = async () => {
      if (chatStarted) {
        return;
      }

      const animations: any[] = [];

      if (document.querySelector('#examples')) {
        animations.push(animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }));
      }

      if (document.querySelector('#intro')) {
        animations.push(animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }));
      }

      await Promise.all(animations);

      chatStore.setKey('started', true);

      setChatStarted(true);
    };

    
    const createMessageParts = (text: string, images: string[] = []): Array<TextUIPart | FileUIPart> => {
      
      const parts: Array<TextUIPart | FileUIPart> = [
        {
          type: 'text',
          text,
        },
      ];

      
      images.forEach((imageData) => {
        
        const mimeType = imageData.split(';')[0].split(':')[1] || 'image/jpeg';

        
        parts.push({
          type: 'file',
          mimeType,
          data: imageData.replace(/^data:image\/[^;]+;base64,/, ''),
        });
      });

      return parts;
    };

    useEffect(() => {
      const payload = cloneWebsitePayload.get();
      if (payload) {
        cloneWebsitePayload.set(null);

        const attachments = payload.images.map((url, i) => {
          const isJpeg = url.startsWith('data:image/jpeg');
          return {
            url,
            name: `image-${i}.${isJpeg ? 'jpg' : 'png'}`,
            contentType: isJpeg ? 'image/jpeg' : 'image/png'
          };
        });

        const userMessageText = `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${payload.prompt}`;

        setMessages((prev) => [
          ...prev,
          {
            id: `${new Date().getTime()}`,
            role: 'user',
            content: userMessageText,
            parts: createMessageParts(userMessageText, payload.images),
            experimental_attachments: attachments,
          },
        ]);

        runAnimation();

        reload({
          ...(attachments.length > 0 ? { experimental_attachments: attachments } : {}),
          body: chatBody
        });
      }
    }, [model, provider, setMessages, reload, chatBody, runAnimation]);

    
    const filesToAttachments = async (files: File[]): Promise<Attachment[] | undefined> => {
      if (files.length === 0) {
        return undefined;
      }

      const attachments = await Promise.all(
        files.map(
          (file) =>
            new Promise<Attachment>((resolve) => {
              const reader = new FileReader();

              reader.onloadend = () => {
                resolve({
                  name: file.name,
                  contentType: file.type,
                  url: reader.result as string,
                });
              };
              reader.readAsDataURL(file);
            }),
        ),
      );

      return attachments;
    };

    const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
      const messageContent = messageInput || input;

      if (!messageContent?.trim()) {
        return;
      }

      if (isLoading) {
        abort();
        return;
      }

      let finalMessageContent = messageContent;

      if (typeof window !== 'undefined' && window.location.pathname.includes('/sources')) {
        finalMessageContent = `[SYSTEM CONTEXT: You are in Q&A mode on the Acquisition Sources page. Do NOT create code files, do NOT create falborArtifact or code tags, and do NOT open the Workbench. Reply strictly in conversational markdown text or standard markdown tables.]\n\n${finalMessageContent}`;
      }

      const dbContext = selectedDatabase.get();
      if (dbContext === 'neon') {
        finalMessageContent = `${finalMessageContent}\n\n[Requirement: Integrate Neon database for storage. Generate the code immediately.]`;
      } else if (dbContext === 'supabase') {
        finalMessageContent = `${finalMessageContent}\n\n[Requirement: Integrate Supabase database for storage. Generate the code immediately.]`;
      }

      if (cloneUrl) {
        finalMessageContent = `[Clone Website: ${cloneUrl}]\n\n${finalMessageContent}`;
      }

      if (selectedElement) {
        console.log('Selected Element:', selectedElement);

        const elementInfo = `<div class="__falborSelectedElement__" data-element='${JSON.stringify(selectedElement)}'>${JSON.stringify(`${selectedElement.displayText}`)}</div>`;
        finalMessageContent = messageContent + elementInfo;
      }

      if (uploadedFiles.length > 0) {
        try {
          const wc = await webcontainer;
          await wc.fs.mkdir('.falbor/uploads', { recursive: true });

          for (const file of uploadedFiles) {
            const arrayBuffer = await file.arrayBuffer();
            await wc.fs.writeFile(`.falbor/uploads/${file.name}`, new Uint8Array(arrayBuffer));
          }
        } catch (e) {
          console.error("Failed to write uploaded files to WebContainer", e);
        }
      }

      if (!chatStarted) {
        setFakeLoading(true);
        const newId = currentChatId || localChatId;
        if (!currentChatId) {
          chatId.set(newId);
        }
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/sources') && !window.location.pathname.includes(`/new/${newId}`) && !window.location.pathname.includes(`/vibe/${newId}`)) {
          const match = window.location.pathname.match(/\/workspace\/([^\/]+)/);
          const currentWorkspaceId = match ? match[1] : 'default';
          const isVibePath = window.location.pathname.includes('/vibe');
          const targetPath = isVibePath 
            ? `/workspace/${currentWorkspaceId}/vibe/${newId}` 
            : `/workspace/${currentWorkspaceId}/new/${newId}`;
          window.history.replaceState({}, '', targetPath);
        }

        const isSourcesPath = typeof window !== 'undefined' && window.location.pathname.includes('/sources');

        if (autoSelectTemplate && !isSourcesPath) {
          const { template, title } = await selectStarterTemplate({
            message: finalMessageContent,
            model,
            provider,
          });

          if (template !== 'blank') {
            const temResp = await getTemplates(template, title).catch((e) => {
              if (e.message.includes('rate limit')) {
                toast.warning('Rate limit exceeded. Skipping starter template\n Continuing with blank template');
              } else {
                toast.warning('Failed to import starter template\n Continuing with blank template');
              }

              return null;
            });

            if (temResp) {
              const { assistantMessage, userMessage } = temResp;
              const userMessageText = `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${finalMessageContent}`;

              const attachments = uploadedFiles.length > 0 ? await filesToAttachments(uploadedFiles) : undefined;
              setMessages([
                {
                  id: `1-${new Date().getTime()}`,
                  role: 'user',
                  content: userMessageText,
                  parts: createMessageParts(userMessageText, imageDataList),
                  experimental_attachments: attachments,
                },
                {
                  id: `2-${new Date().getTime()}`,
                  role: 'assistant',
                  content: assistantMessage,
                },
                {
                  id: `3-${new Date().getTime()}`,
                  role: 'user',
                  content: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userMessage}`,
                  annotations: ['hidden'],
                },
              ]);

              runAnimation();

              const reloadOptions = {
                ...(uploadedFiles.length > 0 ? { experimental_attachments: await filesToAttachments(uploadedFiles) } : {}),
                body: chatBody
              };

              reload(reloadOptions);
              setInput('');
              setCloneUrl(null);
              Cookies.remove(PROMPT_COOKIE_KEY);

              setUploadedFiles([]);
              setImageDataList([]);

              resetEnhancer();

              textareaRef.current?.blur();
              setFakeLoading(false);

              return;
            }
          }
        }

        
        const userMessageText = `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${finalMessageContent}`;
        const attachments = uploadedFiles.length > 0 ? await filesToAttachments(uploadedFiles) : undefined;

        setMessages([
          {
            id: `${new Date().getTime()}`,
            role: 'user',
            content: userMessageText,
            parts: createMessageParts(userMessageText, imageDataList),
            experimental_attachments: attachments,
          },
        ]);

        runAnimation();

        reload({
          ...(attachments ? { experimental_attachments: attachments } : {}),
          body: chatBody
        });
        setFakeLoading(false);
        setInput('');
        setCloneUrl(null);
        Cookies.remove(PROMPT_COOKIE_KEY);

        setUploadedFiles([]);
        setImageDataList([]);

        resetEnhancer();

        textareaRef.current?.blur();

        return;
      }

      if (error != null) {
        setMessages(messages.slice(0, -1));
      }

      runAnimation();

      const modifiedFiles = workbenchStore.getModifiedFiles();

      chatStore.setKey('aborted', false);

      const activeSkills = skillsStore.get().filter(s => s.isActive);
      let skillsContext = '';
      if (activeSkills.length > 0) {
        skillsContext = "\n\n[ACTIVE SKILLS - The following instructions MUST be followed for this request]:\n" +
          activeSkills.map(s => `=== Skill: ${s.name} ===\n${s.content}\n`).join('\n') +
          "\n[CRITICAL INSTRUCTION: You MUST start your final text response (AFTER any <think> or reasoning blocks) with a <skill_usage name=\"SkillName\">Brief confirmation that you are applying this skill</skill_usage> tag for EACH active skill. Do NOT place this inside your thinking block. The UI requires these exact XML tags to activate the skill features.]\n[END ACTIVE SKILLS]\n\n";
      }

      if (modifiedFiles !== undefined) {
        const userUpdateArtifact = filesToArtifacts(modifiedFiles, `${Date.now()}`);
        const messageText = `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userUpdateArtifact}${skillsContext}${finalMessageContent}`;

        const attachmentOptions =
          uploadedFiles.length > 0 ? { experimental_attachments: await filesToAttachments(uploadedFiles) } : {};

        append(
          {
            role: 'user',
            content: messageText,
            parts: createMessageParts(messageText, imageDataList),
          },
          {
            ...attachmentOptions,
            body: chatBody
          },
        );

        workbenchStore.resetAllFileModifications();
      } else {
        const messageText = `[Model: ${model}]\n\n[Provider: ${provider.name}]${skillsContext}\n\n${finalMessageContent}`;

        const attachmentOptions =
          uploadedFiles.length > 0 ? { experimental_attachments: await filesToAttachments(uploadedFiles) } : {};

        append(
          {
            role: 'user',
            content: messageText,
            parts: createMessageParts(messageText, imageDataList),
          },
          {
            ...attachmentOptions,
            body: chatBody
          },
        );
      }

      setInput('');
      setCloneUrl(null);
      Cookies.remove(PROMPT_COOKIE_KEY);

      setUploadedFiles([]);
      setImageDataList([]);

      resetEnhancer();

      textareaRef.current?.blur();
    };

    
    const onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleInputChange(event);
    };

    
    const debouncedCachePrompt = useCallback(
      debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const trimmedValue = event.target.value.trim();
        Cookies.set(PROMPT_COOKIE_KEY, trimmedValue, { expires: 30 });
      }, 1000),
      [],
    );

    useEffect(() => {
      const storedApiKeys = Cookies.get('apiKeys');

      if (storedApiKeys) {
        setApiKeys(JSON.parse(storedApiKeys));
      }
    }, []);

    const handleModelChange = (newModel: string) => {
      setModel(newModel);
      Cookies.set('selectedModel', newModel, { expires: 30 });
    };

    const handleProviderChange = (newProvider: ProviderInfo) => {
      setProvider(newProvider);
      Cookies.set('selectedProvider', newProvider.name, { expires: 30 });
    };

    const handleWebSearchResult = useCallback(
      (result: string) => {
        const currentInput = input || '';
        const newInput = currentInput.length > 0 ? `${result}\n\n${currentInput}` : result;

        
        const syntheticEvent = {
          target: { value: newInput },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        handleInputChange(syntheticEvent);
      },
      [input, handleInputChange],
    );

    useEffect(() => {
      const handleExternalMessage = (event: Event) => {
        const customEvent = event as CustomEvent<string>;
        if (customEvent.detail) {
          sendMessage(undefined as any, customEvent.detail);
        }
      };

      const handleExternalInputChange = (event: Event) => {
        const customEvent = event as CustomEvent<string>;
        if (customEvent.detail !== undefined) {
          const syntheticEvent = {
            target: { value: customEvent.detail },
          } as React.ChangeEvent<HTMLTextAreaElement>;
          handleInputChange(syntheticEvent);
        }
      };

      const handleExternalModelChange = (event: Event) => {
        const customEvent = event as CustomEvent<{ provider?: string; model: string }>;
        if (customEvent.detail?.model) {
          handleModelChange(customEvent.detail.model);
          if (customEvent.detail.provider) {
            const foundProvider = activeProviders.find(p => p.name === customEvent.detail.provider);
            if (foundProvider) {
              handleProviderChange(foundProvider);
            }
          }
        }
      };

      const handleExternalChatModeChange = (event: Event) => {
        const customEvent = event as CustomEvent<'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research'>;
        if (customEvent.detail) {
          setChatMode(customEvent.detail);
        }
      };

      window.addEventListener('falbor:externalChatMessage', handleExternalMessage);
      window.addEventListener('falbor:externalChatInputChange', handleExternalInputChange);
      window.addEventListener('falbor:externalModelChange', handleExternalModelChange);
      window.addEventListener('falbor:externalChatModeChange', handleExternalChatModeChange);
      return () => {
        window.removeEventListener('falbor:externalChatMessage', handleExternalMessage);
        window.removeEventListener('falbor:externalChatInputChange', handleExternalInputChange);
        window.removeEventListener('falbor:externalModelChange', handleExternalModelChange);
        window.removeEventListener('falbor:externalChatModeChange', handleExternalChatModeChange);
      };
    }, [sendMessage, handleInputChange, activeProviders]);

    return (
      <BaseChat
        ref={animationScope}
        textareaRef={textareaRef}
        input={input}
        showChat={showChat}
        chatStarted={chatStarted}
        isStreaming={isLoading || fakeLoading}
        onStreamingChange={(streaming) => {
          streamingState.set(streaming);
        }}
        enhancingPrompt={enhancingPrompt}
        promptEnhanced={promptEnhanced}
        sendMessage={sendMessage}
        model={model}
        setModel={handleModelChange}
        provider={provider}
        setProvider={handleProviderChange}
        providerList={activeProviders}
        handleInputChange={(e) => {
          onTextareaChange(e);
          debouncedCachePrompt(e);
        }}
        handleStop={abort}
        description={description}
        importChat={importChat}
        exportChat={exportChat}
        messages={messages.map((message, i) => {
          const initMsg = initialMessages.find(m => m.id === message.id);
          const annotations = message.annotations || initMsg?.annotations;

          if (message.role === 'user') {
            return { ...message, annotations };
          }

          return {
            ...message,
            annotations,
            content: parsedMessages[message.id] || '',
          };
        })}
        enhancePrompt={() => {
          enhancePrompt(
            input,
            (input) => {
              setInput(input);
              scrollTextArea();
            },
            model,
            provider,
            apiKeys,
          );
        }}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        imageDataList={imageDataList}
        setImageDataList={setImageDataList}
        actionAlert={actionAlert}
        clearAlert={() => workbenchStore.clearAlert()}
        supabaseAlert={supabaseAlert}
        clearSupabaseAlert={() => workbenchStore.clearSupabaseAlert()}
        deployAlert={deployAlert}
        clearDeployAlert={() => workbenchStore.clearDeployAlert()}
        llmErrorAlert={llmErrorAlert}
        clearLlmErrorAlert={clearApiErrorAlert}
        data={chatData}
        chatMode={chatMode}
        setChatMode={setChatMode}
        append={append}
        designScheme={designScheme}
        setDesignScheme={setDesignScheme}
        selectedElement={selectedElement}
        setSelectedElement={setSelectedElement}
        hideSlider={hideSlider}
        isCompact={isCompact}
        cloneUrl={cloneUrl}
        setCloneUrl={setCloneUrl}
        addToolResult={addToolResult}
        onWebSearchResult={handleWebSearchResult}
        fullMessages={initialMessages}
        onRewind={async (id) => {
          const idToUse = chatId.get();
          if (idToUse) {
            await setRewindId(idToUse, id);
            window.location.reload();
          }
        }}
        hideIntro={hideIntro}
      />
    );
  },
);
