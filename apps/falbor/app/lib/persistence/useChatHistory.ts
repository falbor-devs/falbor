import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { atom } from 'nanostores';
import { generateId, type JSONValue, type Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { logStore } from '~/lib/stores/logs';
import * as chatApi from '~/lib/api/data/chat';
import type { IChatMetadata } from './db';
import type { FileMap } from '~/lib/stores/files';
import type { Snapshot } from './types';
import { webcontainer } from '~/lib/webcontainer';
import { detectProjectCommands, createCommandActionsString } from '~/utils/projectCommands';
import type { ContextAnnotation } from '~/types/context';

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

export const db = {} as IDBDatabase;

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);
export const chatMetadata = atom<IChatMetadata | undefined>(undefined);

export function useChatHistory() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const mixedId = (params?.chatId || params?.id) as string | undefined;

  const [archivedMessages, setArchivedMessages] = useState<Message[]>([]);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();

  useEffect(() => {
    if (mixedId) {
      if (mixedId.startsWith('hacking-')) return;
      let cancelled = false;

      const load = () =>
        Promise.all([chatApi.getChat(mixedId), chatApi.getSnapshot(mixedId)])
          .then(async ([storedMessages, snapshot]) => {
            if (cancelled) return;
            if (storedMessages && storedMessages.messages.length > 0) {
              const loadedMetadata = (storedMessages.metadata || {}) as Record<string, any>;
              const snapshotData = snapshot as any;
              let rewindId = searchParams.get('rewindTo') || (snapshotData?.type === 'multi' ? snapshotData.rewindId : null);

              let validSnapshot: Snapshot | undefined;

              if (snapshotData?.type === 'multi') {
                const snapshots = snapshotData.snapshots || {};
                if (rewindId && snapshots[rewindId]) {
                  validSnapshot = snapshots[rewindId];
                } else {

                  const keys = Object.keys(snapshots);
                  if (keys.length > 0) {

                    let found = false;
                    for (let i = storedMessages.messages.length - 1; i >= 0; i--) {
                      if (snapshots[storedMessages.messages[i].id]) {
                        validSnapshot = snapshots[storedMessages.messages[i].id];
                        found = true;
                        break;
                      }
                    }
                    if (!found) {
                      validSnapshot = snapshots[keys[keys.length - 1]];
                    }
                  }
                }
              } else {
                validSnapshot = (snapshotData || { chatIndex: '', files: {} }) as Snapshot;
              }

              let filteredMessages = storedMessages.messages;
              let archivedMessages: Message[] = [];

              setArchivedMessages(archivedMessages);

              let hasSnapshot = false;

              if (validSnapshot && Object.keys(validSnapshot.files || {}).length > 0) {
                restoreSnapshot(mixedId, validSnapshot);
                hasSnapshot = true;

                workbenchStore.showWorkbench.set(true);
              }

              workbenchStore.setHasSnapshot(hasSnapshot);
              workbenchStore.setReloadedMessages(filteredMessages.map((m) => m.id));
              setInitialMessages(filteredMessages);
              setUrlId(storedMessages.urlId ?? storedMessages.id);
              description.set((storedMessages as any).title || storedMessages.description);
              chatId.set(storedMessages.id);
              const currentWorkspaceId = params?.id as string | undefined;
              const chatWorkspaceId = (storedMessages as any)?.workspaceId;
              if (chatWorkspaceId && currentWorkspaceId && chatWorkspaceId !== currentWorkspaceId) {
                toast.warning(`This chat belongs to another workspace (${chatWorkspaceId}).`);
              }

              const savedDeployUrl = typeof window !== 'undefined' ? localStorage.getItem(`deploy-url-${storedMessages.id}`) : null;
              if (savedDeployUrl && !loadedMetadata.deployUrl) {
                loadedMetadata.deployUrl = savedDeployUrl;
              }
              if (rewindId) {
                loadedMetadata.rewindId = rewindId;
              }
              chatMetadata.set(loadedMetadata as IChatMetadata | undefined);
            } else if (!storedMessages) {
              toast.error('Chat does not exist (404)');
            }
          })
          .catch((error) => {
            if (cancelled) return;
            console.error(error);
            logStore.logError('Failed to load chat messages or snapshot', error);
            toast.error('Failed to load chat: ' + error.message);
          })
          .finally(() => {
            if (!cancelled) setReady(true);
          });

      load();

      return () => {
        cancelled = true;
      };
    } else {
      setReady(true);
    }
  }, [mixedId, router, searchParams]);

  const takeSnapshot = useCallback(
    async (chatIdx: string, files: FileMap, _chatId?: string | undefined, chatSummary?: string) => {
      const id = chatId.get();
      if (!id) return;

      const snapshot: Snapshot = {
        chatIndex: chatIdx,
        files,
        summary: chatSummary,
      };

      try {
        await chatApi.setSnapshot(id, snapshot);
      } catch (error) {
        console.error('Failed to save snapshot:', error);
        toast.error('Failed to save chat snapshot.');
      }
    },
    [],
  );

  const restoreSnapshot = useCallback(async (id: string, snapshot?: Snapshot) => {
    const container = await webcontainer;
    const validSnapshot = snapshot || { chatIndex: '', files: {} };

    if (!validSnapshot?.files) return;

    workbenchStore.files.set(validSnapshot.files);

    await Promise.all(Object.entries(validSnapshot.files).map(async ([key, value]) => {
      if (key.startsWith(container.workdir)) {
        key = key.replace(container.workdir, '');
      }
      if (value?.type === 'folder') {
        await container.fs.mkdir(key, { recursive: true });
      }
    }));
    await Promise.all(Object.entries(validSnapshot.files).map(async ([key, value]) => {
      if (value?.type === 'file') {
        if (key.startsWith(container.workdir)) {
          key = key.replace(container.workdir, '');
        }
        await container.fs.writeFile(key, value.content, { encoding: value.isBinary ? undefined : 'utf8' });
      }
    }));
  }, []);

  return {
    ready: !mixedId || ready,
    initialMessages,
    updateChatMestaData: async (metadata: IChatMetadata) => {
      const id = chatId.get();
      if (!id) return;

      try {
        await chatApi.saveChat({
          id,
          messages: initialMessages,
          urlId,
          description: description.get(),
          metadata: metadata as Record<string, any>,
        });
        chatMetadata.set(metadata);
      } catch (error) {
        toast.error('Failed to update chat metadata');
        console.error(error);
      }
    },
    storeMessageHistory: async (messages: Message[]) => {
      if (messages.length === 0) return;

      const { firstArtifact } = workbenchStore;
      messages = messages.filter((m) => !m.annotations?.includes('no-store'));

      let _urlId = urlId;

      if (!urlId && firstArtifact?.id) {
        const resolvedUrlId = await chatApi.getUrlId(firstArtifact.id);
        _urlId = resolvedUrlId;
        navigateChat(resolvedUrlId);
        setUrlId(resolvedUrlId);
      }

      let chatSummary: string | undefined = undefined;
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.role === 'assistant') {
        const annotations = lastMessage.annotations as JSONValue[];
        const filteredAnnotations = (annotations?.filter(
          (annotation: JSONValue) =>
            annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
        ) || []) as { type: string; value: any } & { [key: string]: any }[];

        if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
          chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
        }
      }

      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title);
      }

      if (initialMessages.length === 0) {
        if (!chatId.get()) {
          const nextId = await chatApi.getNextId();
          chatId.set(nextId);
        }
        if (!urlId && chatId.get()) {
          navigateChat(chatId.get()!);
          setUrlId(chatId.get());
        }
      }

      const finalChatId = chatId.get();

      if (!finalChatId) {
        console.error('Cannot save messages, chat ID is not set.');
        toast.error('Failed to save chat messages: Chat ID missing.');
        return;
      }

      await chatApi.saveChat({
        id: finalChatId,
        messages: [...archivedMessages, ...messages],
        urlId,
        description: description.get(),
        timestamp: new Date().toISOString(),
        metadata: chatMetadata.get() as Record<string, any>,
      });

      takeSnapshot(messages[messages.length - 1].id, workbenchStore.files.get(), _urlId, chatSummary);
    },
    duplicateCurrentChat: async (listItemId: string) => {
      if (!mixedId && !listItemId) return;

      try {
        const newId = await chatApi.duplicateChat(mixedId || listItemId);
        const match = window.location.pathname.match(/\/workspace\/([^\/]+)/);
        const workspaceId = match ? match[1] : 'default';
        router.push(`/workspace/${workspaceId}/new/${newId}`);
        toast.success('Chat duplicated successfully');
      } catch (error) {
        toast.error('Failed to duplicate chat');
        console.log(error);
      }
    },
    importChat: async (description: string, messages: Message[], metadata?: IChatMetadata) => {
      try {
        const newId = await chatApi.createChatFromMessages(
          description,
          messages,
          metadata as Record<string, any> | undefined,
        );
        const match = window.location.pathname.match(/\/workspace\/([^\/]+)/);
        const workspaceId = match ? match[1] : 'default';
        window.location.href = `/workspace/${workspaceId}/new/${newId}`;
        toast.success('Chat imported successfully');
      } catch (error) {
        if (error instanceof Error) {
          toast.error('Failed to import chat: ' + error.message);
        } else {
          toast.error('Failed to import chat');
        }
      }
    },
    exportChat: async (id = urlId) => {
      if (!id) return;

      const chat = await chatApi.getChat(id);
      const chatData = {
        messages: chat?.messages || [],
        description: chat?.description,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}

function navigateChat(nextId: string) {
  if (typeof window !== 'undefined' && window.location.pathname.includes('/sources')) {
    return;
  }
  const url = new URL(window.location.href);
  const match = url.pathname.match(/\/workspace\/([^\/]+)/);
  const workspaceId = match ? match[1] : 'default';
  url.pathname = `/workspace/${workspaceId}/new/${nextId}`;
  window.history.replaceState({}, '', url);
}
