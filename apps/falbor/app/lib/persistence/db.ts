import type { Message } from 'ai';
import { createScopedLogger } from '~/utils/logger';
import type { ChatHistoryItem } from './useChatHistory';
import type { Snapshot } from './types';
import * as chatApi from '~/lib/api/data/chat';

export interface IChatMetadata {
  gitUrl: string;
  gitBranch?: string;
  netlifySiteId?: string;
  rewindId?: string;
}

const logger = createScopedLogger('ChatHistory');

const dummyDb = { name: 'api' } as IDBDatabase;

export async function openDatabase(): Promise<IDBDatabase> {
  return dummyDb;
}

export async function getAll(_db?: IDBDatabase): Promise<ChatHistoryItem[]> {
  const list = await chatApi.getAllChats();
  return list.map((c) => ({
    id: c.id,
    urlId: c.urlId ?? c.id,
    description: c.description || 'New Chat',
    messages: c.messages as Message[],
    timestamp: c.timestamp ?? new Date().toISOString(),
    metadata: c.metadata as IChatMetadata | undefined,
  }));
}

export async function setMessages(
  _db: IDBDatabase,
  id: string,
  messages: Message[],
  urlId?: string,
  description?: string,
  timestamp?: string,
  metadata?: IChatMetadata,
): Promise<void> {
  await chatApi.saveChat({
    id,
    messages,
    urlId,
    description,
    timestamp: timestamp ?? new Date().toISOString(),
    metadata: metadata as Record<string, any> | undefined,
  });
}

export async function getMessages(_db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  const fromApi = await chatApi.getChat(id);
  if (fromApi) {
    return {
      id: fromApi.id,
      urlId: fromApi.urlId ?? fromApi.id,
      description: fromApi.description,
      messages: fromApi.messages as Message[],
      timestamp: fromApi.timestamp ?? new Date().toISOString(),
      metadata: fromApi.metadata as IChatMetadata | undefined,
    };
  }
  throw new Error('Chat not found');
}

export async function deleteById(_db: IDBDatabase, id: string): Promise<void> {
  await chatApi.deleteChat(id);
}

export async function getNextId(_db: IDBDatabase): Promise<string> {
  return chatApi.getNextId();
}

export async function getUrlId(_db: IDBDatabase, id: string): Promise<string> {
  return chatApi.getUrlId(id);
}

export async function forkChat(_db: IDBDatabase, chatId: string, messageId: string): Promise<string> {
  return chatApi.forkChat(chatId, messageId);
}

export async function duplicateChat(_db: IDBDatabase, id: string): Promise<string> {
  return chatApi.duplicateChat(id);
}

export async function createChatFromMessages(
  _db: IDBDatabase,
  description: string,
  messages: Message[],
  metadata?: IChatMetadata,
): Promise<string> {
  return chatApi.createChatFromMessages(description, messages, metadata as Record<string, any> | undefined);
}

export async function getSnapshot(_db: IDBDatabase, chatId: string): Promise<Snapshot | undefined> {
  return (await chatApi.getSnapshot(chatId)) as Snapshot | undefined;
}

export async function setSnapshot(_db: IDBDatabase, chatId: string, snapshot: Snapshot): Promise<void> {
  await chatApi.setSnapshot(chatId, snapshot);
}

export async function deleteSnapshot(_db: IDBDatabase, chatId: string): Promise<void> {
  await chatApi.deleteSnapshot(chatId);
}

export async function updateChatDescription(_db: IDBDatabase, id: string, description: string): Promise<void> {
  const existing = await chatApi.getChat(id);
  await chatApi.saveChat({
    id,
    messages: existing?.messages ?? [],
    urlId: existing?.urlId,
    description,
    timestamp: existing?.timestamp ?? new Date().toISOString(),
    metadata: existing?.metadata,
  });
}
