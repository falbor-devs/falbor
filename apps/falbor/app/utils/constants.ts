import { LLMManager } from '~/lib/modules/llm/manager';
import type { Template } from '~/types/template';

export const WORK_DIR_NAME = 'project';
export const WORK_DIR = `/home/${WORK_DIR_NAME}`;
export const MODIFICATIONS_TAG_NAME = 'falbor_file_modifications';
export const MODEL_REGEX = /\[Model: (.*?)\]/;
export const PROVIDER_REGEX = /\[Provider: (.*?)\]/;
export const DEFAULT_MODEL = 'gpt-5.6-luna';
export const PROMPT_COOKIE_KEY = 'cachedPrompt';
export const TOOL_EXECUTION_APPROVAL = {
  APPROVE: 'Yes, approved.',
  REJECT: 'No, rejected.',
} as const;
export const TOOL_NO_EXECUTE_FUNCTION = 'Error: No execute function found on tool';
export const TOOL_EXECUTION_DENIED = 'Error: User denied access to tool execution';
export const TOOL_EXECUTION_ERROR = 'Error: An error occured while calling tool';

const llmManager = LLMManager.getInstance(process.env as Record<string, string>);

export const PROVIDER_LIST = llmManager.getAllProviders();
export const DEFAULT_PROVIDER = llmManager.getDefaultProvider();

export const providerBaseUrlEnvKeys: Record<string, { baseUrlKey?: string; apiTokenKey?: string }> = {};
PROVIDER_LIST.forEach((provider) => {
  providerBaseUrlEnvKeys[provider.name] = {
    baseUrlKey: provider.config.baseUrlKey,
    apiTokenKey: provider.config.apiTokenKey,
  };
});
export const STARTER_TEMPLATES: Template[] = [
  {
    name: 'Vite React TS',
    label: 'React + Vite + TS',
    description: 'Modern React starter with Vite and TypeScript — fast HMR and type safety',
    githubRepo: 'henrikvilhelmberglund/react-vite-generouted-unocss-typescript-vitest-template',
    tags: ['react', 'vite', 'typescript', 'frontend'],
    icon: 'i-falbor:react',
  },
  {
    name: 'Vite Vue TS',
    label: 'Vue 3 + Vite + TS',
    description: 'Vue 3 with Vite and TypeScript — composition API and fast reloads',
    githubRepo: 'DCLangX/vite-vue-ts-template',
    tags: ['vue', 'vite', 'typescript'],
    icon: 'i-falbor:vue',
  },
  {
    name: 'Astro Minimal',
    label: 'Astro Minimal',
    description: 'Minimal Astro starter — ultra-fast static sites with zero JS by default',
    githubRepo: 'astrostarters/astro-blank',
    tags: ['astro', 'performance', 'static'],
    icon: 'i-falbor:astro',
  },
  {
    name: 'SvelteKit',
    label: 'SvelteKit',
    description: 'Official SvelteKit starter for building fast, server-rendered Svelte apps',
    githubRepo: 'sveltejs/kit-template-default',
    tags: ['svelte', 'sveltekit', 'typescript'],
    icon: 'i-falbor:svelte',
  },
  {
    name: 'Remix',
    label: 'Remix',
    description: 'Remix fullstack web framework with nested routes and server rendering',
    githubRepo: 'remix-run/remix-website',
    tags: ['remix', 'typescript', 'fullstack', 'react'],
    icon: 'i-falbor:remix',
  },
  {
    name: 'Qwik',
    label: 'Qwik City',
    description: 'Qwik City starter for resumable, instant-load web applications',
    githubRepo: 'thejackshelton/qwik-react-astro-template',
    tags: ['qwik', 'typescript', 'performance'],
    icon: 'i-falbor:qwik',
  },
  {
    name: 'SolidJS',
    label: 'SolidJS',
    description: 'SolidJS starter — fine-grained reactivity without a virtual DOM',
    githubRepo: 'solidjs/templates',
    tags: ['solidjs', 'typescript'],
    icon: 'i-falbor:solidjs',
  },
  {
    name: 'Angular',
    label: 'Angular',
    description: 'Angular standalone starter with TypeScript and modern best practices',
    githubRepo: 'asadnobi/angular-17-standalone-example',
    tags: ['angular', 'typescript', 'spa'],
    icon: 'i-falbor:angular',
  },
];

