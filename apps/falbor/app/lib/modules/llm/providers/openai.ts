import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class OpenAIProvider extends BaseProvider {
  name = 'OpenAI';
  getApiKeyLink = 'https://platform.openai.com/api-keys';

  config = {
    apiTokenKey: 'OPENAI_API_KEY',
  };

  staticModels: ModelInfo[] = [
    { name: 'gpt-5.6-sol', label: 'GPT-5.6 Sol', provider: 'OpenAI', maxTokenAllowed: 128000, maxCompletionTokens: 32000, vision: true },
    { name: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'OpenAI', maxTokenAllowed: 128000, maxCompletionTokens: 32000, vision: true },
    { name: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', maxTokenAllowed: 128000, maxCompletionTokens: 4096 },
    {
      name: 'gpt-4o-mini',
      label: 'GPT-4o Mini',
      provider: 'OpenAI',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 4096,
    },
    {
      name: 'gpt-4.1-mini',
      label: 'GPT-4.1 Mini',
      provider: 'OpenAI',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 4096,
    },
    {
      name: 'gpt-3.5-turbo',
      label: 'GPT-3.5 Turbo',
      provider: 'OpenAI',
      maxTokenAllowed: 16000,
      maxCompletionTokens: 4096,
    },
    {
      name: 'o1-preview',
      label: 'o1-preview',
      provider: 'OpenAI',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 32000,
    },
    { name: 'o1-mini', label: 'o1-mini', provider: 'OpenAI', maxTokenAllowed: 128000, maxCompletionTokens: 65000 },
  ];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'OPENAI_API_KEY',
    });

    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }

    const response = await fetch(`https://api.openai.com/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const res = (await response.json()) as any;
    const staticModelIds = this.staticModels.map((m) => m.name);

    const data = res.data.filter(
      (model: any) =>
        model.object === 'model' &&
        (model.id.startsWith('gpt-') || model.id.startsWith('o') || model.id.startsWith('chatgpt-')) &&
        !staticModelIds.includes(model.id),
    );

    return data.map((m: any) => {
      let contextWindow = 32000;
      if (m.context_length) {
        contextWindow = m.context_length;
      } else if (m.id?.includes('gpt-4o')) {
        contextWindow = 128000;
      } else if (m.id?.includes('gpt-4-turbo') || m.id?.includes('gpt-4-1106')) {
        contextWindow = 128000;
      } else if (m.id?.includes('gpt-4')) {
        contextWindow = 8192;
      } else if (m.id?.includes('gpt-3.5-turbo')) {
        contextWindow = 16385;
      }
      let maxCompletionTokens = 4096;
      if (m.id?.startsWith('o1-preview')) {
        maxCompletionTokens = 32000;
      } else if (m.id?.startsWith('o1-mini')) {
        maxCompletionTokens = 65000;
      } else if (m.id?.startsWith('o1')) {
        maxCompletionTokens = 32000;
      } else if (m.id?.includes('o3') || m.id?.includes('o4')) {
        maxCompletionTokens = 100000;
      } else if (m.id?.includes('gpt-4o')) {
        maxCompletionTokens = 4096;
      } else if (m.id?.includes('gpt-4')) {
        maxCompletionTokens = 8192;
      } else if (m.id?.includes('gpt-3.5-turbo')) {
        maxCompletionTokens = 4096;
      }
      return {
        name: m.id,
        label: `${m.id} (${Math.floor(contextWindow / 1000)}k context)`,
        provider: this.name,
        maxTokenAllowed: Math.min(contextWindow, 128000), // Cap at 128k for safety
        maxCompletionTokens,
      };
    });
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'OPENAI_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openai = createOpenAI({
      apiKey,
    });

    const actualModel = model === 'gpt-4.1-mini' ? 'gpt-4o-mini' : model;

    if (actualModel.startsWith('gpt-5.6')) {
      return openai(actualModel, { reasoningEffort: 'none' } as any);
    }

    return openai(actualModel);
  }
}
