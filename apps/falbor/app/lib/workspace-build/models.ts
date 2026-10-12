import { generateObject, generateText, type LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import type { z } from 'zod';

export type ProviderId = 'openai' | 'anthropic' | 'deepseek';

interface ProviderConfig {
  id: ProviderId;
  model: string;
  create: (apiKey: string) => LanguageModelV1;
  envKey: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    model: 'gpt-4o-mini',
    envKey: 'OPENAI_API_KEY',
    create: (apiKey) => createOpenAI({ apiKey })('gpt-4o-mini'),
  },
  {
    id: 'anthropic',
    model: 'claude-haiku-4-5',
    envKey: 'ANTHROPIC_API_KEY',
    create: (apiKey) => createAnthropic({ apiKey })('claude-haiku-4-5'),
  },
  {
    id: 'deepseek',
    model: 'deepseek-chat',
    envKey: 'DEEPSEEK_API_KEY',
    create: (apiKey) => createDeepSeek({ apiKey })('deepseek-chat'),
  },
];

const REQUEST_TIMEOUT_MS = 60_000;

export function getAvailableProviders() {
  return PROVIDERS.filter((p) => Boolean(process.env[p.envKey])).map((p) => ({ id: p.id, model: p.model }));
}

function getModel(id: ProviderId) {
  const provider = PROVIDERS.find((p) => p.id === id);
  const apiKey = provider ? process.env[provider.envKey] : undefined;

  if (!provider || !apiKey) {
    throw new Error(`Provider ${id} is not configured`);
  }

  return provider.create(apiKey);
}

export async function askModel(id: ProviderId, prompt: string) {
  const startedAt = Date.now();
  const { text } = await generateText({
    model: getModel(id),
    prompt,
    abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    maxRetries: 0,
  });

  return { text, latencyMs: Date.now() - startedAt };
}

export async function orchestrate<T>(schema: z.ZodType<T>, prompt: string): Promise<T> {
  const { object } = await generateObject({
    model: getModel('openai'),
    mode: 'json',
    schema,
    prompt,
    abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    maxRetries: 1,
  });

  return object;
}
