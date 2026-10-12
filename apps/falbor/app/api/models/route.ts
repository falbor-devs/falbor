import { NextResponse } from "next/server";
const json = NextResponse.json;
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { ProviderInfo } from '~/types/model';
import { getProviderSettingsFromCookie } from '~/lib/api/cookies';

interface ModelsResponse {
  modelList: ModelInfo[];
  providers: ProviderInfo[];
  defaultProvider: ProviderInfo;
}

function getProviderInfo(llmManager: LLMManager) {
  const providers = llmManager.getAllProviders().map((provider) => ({
    name: provider.name,
    staticModels: provider.staticModels,
    getApiKeyLink: provider.getApiKeyLink,
    labelForGetApiKey: provider.labelForGetApiKey,
    icon: provider.icon,
  }));

  const defaultProvider = llmManager.getDefaultProvider();
  const defaultProviderInfo = {
    name: defaultProvider.name,
    staticModels: defaultProvider.staticModels,
    getApiKeyLink: defaultProvider.getApiKeyLink,
    labelForGetApiKey: defaultProvider.labelForGetApiKey,
    icon: defaultProvider.icon,
  };

  return { providers, defaultProvider: defaultProviderInfo };
}

export async function GET(
  request: Request,
  { params = {} }: { params?: { provider?: string } } = {},
): Promise<Response> {
  const serverEnv = process.env as Record<string, string>;
  const llmManager = LLMManager.getInstance(serverEnv);

  // Get client side maintained API keys and provider settings from cookies
  const cookieHeader = request.headers.get('Cookie');
  const apiKeys: Record<string, string> = {};
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  const { providers, defaultProvider } = getProviderInfo(llmManager);

  let modelList: ModelInfo[] = [];

  if (params.provider) {
    // Only update models for the specific provider
    const provider = llmManager.getProvider(params.provider);

    if (provider) {
      modelList = await llmManager.getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv,
      });
    }
  } else {
    // Update all models
    modelList = await llmManager.updateModelList({
      apiKeys,
      providerSettings,
      serverEnv,
    });
  }

  return json<ModelsResponse>({
    modelList,
    providers,
    defaultProvider,
  });
}
