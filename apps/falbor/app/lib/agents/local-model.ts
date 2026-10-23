import 'server-only';

export const LOCAL_AGENT_MODEL = 'falbor-local:smolvlm-500m';
export const LOCAL_AGENT_MODEL_NAME = 'SmolVLM 500M Instruct';
const LEGACY_LOCAL_AGENT_MODELS = new Set(['falbor-local:qwen2.5-vl-3b', 'falbor-local:qwen2-vl-2b']);
export const LOCAL_AGENT_BASE_URL = process.env.FALBOR_LOCAL_AGENT_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:8000/v1');

export function isLocalAgentModel(model: string | null | undefined) {
  return model === LOCAL_AGENT_MODEL || LEGACY_LOCAL_AGENT_MODELS.has(model || '');
}

export function isLocalAgentRuntimeAvailable() {
  return Boolean(LOCAL_AGENT_BASE_URL);
}

export function getDefaultAgentModel() {
  return isLocalAgentRuntimeAvailable() ? LOCAL_AGENT_MODEL : 'gpt-4o-mini';
}
