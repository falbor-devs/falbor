/*
 *!---------------------------------------------------------------------------------------------
 *  This feature is not implemented yet and its built for testing!
 *--------------------------------------------------------------------------------------------
 */
import { isTorAvailable, torFetch } from './tor-fetch';
import { generateText } from 'ai';
import { resolveModel, getAvailableModels } from './llm-pipeline';
import type { ProviderStatus } from './types';

export async function checkTor(): Promise<{ available: boolean; message: string }> {
  const available = await isTorAvailable();
  return {
    available,
    message: available
      ? 'Tor SOCKS5 proxy is reachable on port 9050'
      : 'Tor is not running. Install: sudo apt install tor && tor',
  };
}

export async function checkLLM(modelId?: string): Promise<{ ok: boolean; model: string; message: string }> {
  const models = getAvailableModels();
  const model = modelId || (models[0] ?? 'gpt-4o-mini');

  try {
    const m = resolveModel(model);
    await generateText({ model: m, prompt: 'Reply with just "ok"', maxTokens: 5 });
    return { ok: true, model, message: `${model} responded successfully` };
  } catch (err: any) {
    return { ok: false, model, message: err?.message?.slice(0, 200) ?? 'Unknown error' };
  }
}

export async function checkSearchEngines(): Promise<
  Array<{ name: string; reachable: boolean; message: string }>
> {
  const engines = [
    { name: 'Ahmia', url: 'http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion/' },
    { name: 'OnionLand', url: 'http://3bbad7fauom4d6sgppalyqddsqbf5u5p56b5k5uk2zxsy3d6ey2jobad.onion/' },
    { name: 'Torgle', url: 'http://iy3544gmoeclh5de6gez2256v6pjh4omhpqdh2wpeeppjtvqmjhkfwad.onion/' },
  ];

  const results = await Promise.allSettled(
    engines.map(async (e) => {
      const r = await torFetch(e.url, { timeoutMs: 15_000 });
      return { name: e.name, reachable: r.ok, message: r.ok ? 'Reachable' : (r.error ?? 'Failed') };
    })
  );

  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { name: engines[i].name, reachable: false, message: String(r.reason) }
  );
}

export function getProviderStatuses(): ProviderStatus[] {
  return [
    { name: 'OpenAI', configured: !!process.env.OPENAI_API_KEY },
    { name: 'Anthropic', configured: !!process.env.ANTHROPIC_API_KEY },
    { name: 'Google', configured: !!process.env.GOOGLE_API_KEY },
    { name: 'OpenRouter', configured: !!process.env.OPENROUTER_API_KEY },
    { name: 'Ollama', configured: false, optional: true },
    { name: 'llama.cpp', configured: false, optional: true },
  ];
}
