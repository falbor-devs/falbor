import { NextResponse } from "next/server";
const json = NextResponse.json;
import { LLMManager } from '~/lib/modules/llm/manager';
import { LOCAL_PROVIDERS } from '~/lib/stores/settings';

export async function GET(request: Request) {
  try {
    const llmManager = LLMManager.getInstance(process.env as any);
    const configuredProviders = [];
    
    // Add local providers first
    for (const provider of LOCAL_PROVIDERS) {
      configuredProviders.push({
        name: provider,
        isConfigured: true,
        configMethod: 'none'
      });
    }

    const envKeys = {
      Anthropic: 'ANTHROPIC_API_KEY',
      OpenAI: 'OPENAI_API_KEY',
      Google: 'GOOGLE_GENERATIVE_AI_API_KEY',
      Groq: 'GROQ_API_KEY',
      HuggingFace: 'HuggingFace_API_KEY',
      Deepseek: 'DEEPSEEK_API_KEY',
      Mistral: 'MISTRAL_API_KEY',
      OpenRouter: 'OPEN_ROUTER_API_KEY',
      Cohere: 'COHERE_API_KEY',
      Perplexity: 'PERPLEXITY_API_KEY',
      XAI: 'XAI_API_KEY',
      'Z.ai': 'ZAI_API_KEY'
    };

    for (const [provider, envKey] of Object.entries(envKeys)) {
      if (process.env[envKey]) {
        configuredProviders.push({
          name: provider,
          isConfigured: true,
          configMethod: 'environment'
        });
      }
    }

    return json({ providers: configuredProviders });
  } catch (error) {
    console.error('Error fetching configured providers:', error);
    return json({ providers: LOCAL_PROVIDERS.map(p => ({ name: p, isConfigured: true, configMethod: 'none' })) });
  }
}
