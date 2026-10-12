import { type Message } from 'ai';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';
import { IGNORE_PATTERNS, type FileMap } from './constants';
import ignore from 'ignore';
import type { ContextAnnotation } from '~/types/context';
import { LLMManager } from '~/lib/modules/llm/manager';

export function extractPropertiesFromMessage(message: Omit<Message, 'id'> & { parts?: any[] }): {
  model: string;
  provider: string;
  content: string;
} {
  let textContent = Array.isArray(message.content)
    ? message.content.find((item: any) => item.type === 'text')?.text || ''
    : message.content || '';

  if (!textContent && message.parts && Array.isArray(message.parts)) {
    textContent = (message.parts.find((item: any) => item.type === 'text') as any)?.text || '';
  }
  const modelMatch = textContent.match(MODEL_REGEX);
  const providerMatch = textContent.match(PROVIDER_REGEX);
  let model = modelMatch ? modelMatch[1] : DEFAULT_MODEL;
  let provider = providerMatch ? providerMatch[1] : DEFAULT_PROVIDER.name;
  const allProviders = LLMManager.getInstance().getAllProviders();
  const selectedProvider = allProviders.find(p => p.name === provider);
  const providerHasModel = selectedProvider?.staticModels?.some(m => m.name === model);
  if (!providerHasModel) {
    const correctProvider = allProviders.find(p => p.staticModels?.some(m => m.name === model));
    if (correctProvider) {
      provider = correctProvider.name;
    } else if (selectedProvider?.staticModels?.length) {
      model = selectedProvider.staticModels[0].name;
    } else {
      model = DEFAULT_MODEL;
      provider = DEFAULT_PROVIDER.name;
    }
  }
  const cleanedContent = Array.isArray(message.content)
    ? message.content.map((item) => {
      if (item.type === 'text') {
        return {
          type: 'text',
          text: (item.text || '').replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, ''),
        };
      }

      return item;
    })
    : (textContent || '').replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '');

  return { model, provider, content: cleanedContent };
}

export function simplifyFalborActions(input: string | any[] | undefined | null): any {
  if (typeof input !== 'string') return input || '';
  const regex = /(<falborAction[^>]*type="file"[^>]*>)([\s\S]*?)(<\/falborAction>)/g;
  return input.replace(regex, (_0, openingTag, _2, closingTag) => {
    return `${openingTag}\n<!-- [SYSTEM NOTE: The file content has been truncated from your conversation history to save tokens. However, in your own responses, YOU MUST STILL OUTPUT THE FULL FILE CONTENT without omitting anything. NEVER USE PLACEHOLDERS.] -->\n${closingTag}`;
  });
}

export function createFilesContext(files: FileMap, useRelativePath?: boolean) {
  const ig = ignore().add(IGNORE_PATTERNS);
  let filePaths = Object.keys(files);
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace('/home/project/', '');
    return !ig.ignores(relPath);
  });

  const fileContexts = filePaths
    .filter((x) => files[x] && files[x].type == 'file')
    .map((path) => {
      const dirent = files[path];

      if (!dirent || dirent.type == 'folder') {
        return '';
      }

      const codeWithLinesNumbers = dirent.content
        .split('\n')
        .join('\n');

      let filePath = path;

      if (useRelativePath) {
        filePath = path.replace('/home/project/', '');
      }

      return `<falborAction type="file" filePath="${filePath}">${codeWithLinesNumbers}</falborAction>`;
    });

  return `<falborArtifact id="code-content" title="Code Content" >\n${fileContexts.join('\n')}\n</falborArtifact>`;
}

export function extractCurrentContext(messages: Message[]) {
  const lastAssistantMessage = messages.filter((x) => x.role == 'assistant').slice(-1)[0];

  if (!lastAssistantMessage) {
    return { summary: undefined, codeContext: undefined };
  }

  let summary: ContextAnnotation | undefined;
  let codeContext: ContextAnnotation | undefined;

  if (!lastAssistantMessage.annotations?.length) {
    return { summary: undefined, codeContext: undefined };
  }

  for (let i = 0; i < lastAssistantMessage.annotations.length; i++) {
    const annotation = lastAssistantMessage.annotations[i];

    if (!annotation || typeof annotation !== 'object') {
      continue;
    }

    if (!(annotation as any).type) {
      continue;
    }

    const annotationObject = annotation as any;

    if (annotationObject.type === 'codeContext') {
      codeContext = annotationObject;
      break;
    } else if (annotationObject.type === 'chatSummary') {
      summary = annotationObject;
      break;
    }
  }

  return { summary, codeContext };
}
