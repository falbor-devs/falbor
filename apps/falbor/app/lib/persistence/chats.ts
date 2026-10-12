import type { Message } from 'ai';
import type { IChatMetadata } from './db';
import * as chatApi from '~/lib/api/data/chat';
import type { ServerChat } from '~/lib/api/data/chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  urlId?: string;
  metadata?: IChatMetadata;
}

function toChat(c: ServerChat): Chat {
  return {
    id: c.id,
    urlId: c.urlId ?? c.id,
    description: c.description,
    messages: (c.messages ?? []) as Message[],
    timestamp: c.timestamp ?? new Date().toISOString(),
    metadata: c.metadata as IChatMetadata | undefined,
  };
}

export async function getAllChats(_db?: IDBDatabase): Promise<Chat[]> {
  const list = await chatApi.getAllChats();
  return list.map(toChat);
}

export async function getChatById(_db: IDBDatabase | undefined, id: string): Promise<Chat | null> {
  const c = await chatApi.getChat(id);
  return c ? toChat(c) : null;
}

export async function saveChat(_db: IDBDatabase | undefined, chat: Chat): Promise<void> {
  await chatApi.saveChat({
    id: chat.id,
    messages: chat.messages,
    urlId: chat.urlId,
    description: chat.description,
    timestamp: chat.timestamp,
    metadata: chat.metadata as Record<string, any> | undefined,
  });
}

export async function deleteChat(_db: IDBDatabase | undefined, id: string): Promise<void> {
  await chatApi.deleteChat(id);
}

export async function deleteAllChats(_db?: IDBDatabase): Promise<void> {
  await chatApi.deleteAllChats();
}
