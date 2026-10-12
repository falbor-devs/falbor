import { convertToCoreMessages, streamText as _streamText, wrapLanguageModel, type Message, tool } from 'ai';
import { z } from 'zod';
import { MAX_TOKENS, PROVIDER_COMPLETION_LIMITS, isReasoningModel, type FileMap } from './constants';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, MODIFICATIONS_TAG_NAME, PROVIDER_LIST, WORK_DIR } from '~/utils/constants';
import type { IProviderSetting } from '~/types/model';
import { PromptLibrary } from '~/lib/common/prompt-library';
import { allowedHTMLElements } from '~/utils/markdown';
import { LLMManager } from '~/lib/modules/llm/manager';
import { createScopedLogger } from '~/utils/logger';
import { createFilesContext, extractPropertiesFromMessage } from './utils';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';
import type { DesignScheme } from '~/types/design-scheme';

export type Messages = Message[];

export interface StreamingOptions extends Omit<Parameters<typeof _streamText>[0], 'model'> {
  supabaseConnection?: {
    isConnected: boolean;
    hasSelectedProject: boolean;
    credentials?: {
      anonKey?: string;
      supabaseUrl?: string;
    };
  };
}

const logger = createScopedLogger('stream-text');

function getCompletionTokenLimit(modelDetails: any): number {
  if (modelDetails.maxCompletionTokens && modelDetails.maxCompletionTokens > 0) {
    return modelDetails.maxCompletionTokens;
  }

  const providerDefault = PROVIDER_COMPLETION_LIMITS[modelDetails.provider];

  if (providerDefault) {
    return providerDefault;
  }

  return Math.min(MAX_TOKENS, 16384);
}

function sanitizeText(text: string | any[] | undefined | null): any {
  if (!text) return text || '';
  if (Array.isArray(text)) {
    return text.map((item) => {
      if (item && typeof item === 'object') {
        if (!item.type || typeof item.type !== 'string') {
          return { type: 'text', text: JSON.stringify(item) };
        }
        if (item.type === 'text' && typeof item.text === 'string') {
          return { ...item, text: sanitizeText(item.text) };
        }
      }
      return item;
    });
  }
  if (typeof text !== 'string') return text;

  let sanitized = text;
  if (typeof text === 'string') {
    sanitized = text.replace(/<falborAction type="file" filePath="package-lock\.json">[\s\S]*?<\/falborAction>/g, '');
  }

  const result = sanitized.trim();
  return result === '' ? ' ' : result;
}

const VISION_MODEL_PATTERNS = [
  /^gpt-4/i,
  /^gpt-5/i,
  /^o1/i,
  /^o3/i,
  /^claude-/i,
  /^gemini/i,
  /^grok/i,
  /vision/i,
];

function supportsVision(modelName: string, modelInfo?: any): boolean {
  if (modelInfo?.vision === true) return true;
  if (modelInfo?.vision === false) return false;

  return VISION_MODEL_PATTERNS.some((pattern) => pattern.test(modelName));
}

function stripImagesFromMessages(messages: any[], modelDetails: any): any[] {
  const isVisionCapable = supportsVision(modelDetails.name, modelDetails);

  if (isVisionCapable) {
    return messages;
  }

  logger.info(`Model ${modelDetails.name} is not vision-capable. Stripping image parts.`);

  const strippedImageNotice = (message: any) => {
    const hadImage =
      (Array.isArray(message?.content) && message.content.some((p: any) => p?.type === 'image' || p?.type === 'image_url')) ||
      Array.isArray(message?.parts) ||
      Array.isArray(message?.experimental_attachments);

    if (!hadImage) {
      return message;
    }

    const notice =
      '[NOTE: The user attached an image, but the currently selected model does not support image input, so you cannot see it. Briefly acknowledge that you received an image but cannot view it with this model, then proceed with the request using text only — do NOT refuse the request.]';

    if (typeof message.content === 'string') {
      return { ...message, content: `${message.content}\n\n${notice}` };
    }

    if (Array.isArray(message.content)) {
      return { ...message, content: [...message.content, { type: 'text', text: notice }] };
    }

    return { ...message, content: notice };
  };

  return messages.map((message) => {
    let newContent = message.content;
    let newParts = message.parts;
    let newAttachments = message.experimental_attachments;
    let hadImage = false;

    if (Array.isArray(newContent)) {
      const filtered = newContent.filter(
        (part: any) => {
          const isImage = part && typeof part === 'object' && (part.type === 'image' || part.type === 'image_url');
          if (isImage) hadImage = true;
          return !isImage;
        }
      );
      newContent = filtered;
      if (newContent.length === 0) newContent = '';
    }

    if (Array.isArray(newParts)) {
      const filtered = newParts.filter(
        (part: any) => {
          const isImage = part && typeof part === 'object' && (part.type === 'image' || part.type === 'image_url');
          if (isImage) hadImage = true;
          return !isImage;
        }
      );
      newParts = filtered;
      if (newParts.length === 0) newParts = undefined;
    }

    if (Array.isArray(newAttachments)) {
      const filtered = newAttachments.filter(
        (attachment: any) => {
          const isImage = attachment.contentType?.startsWith('image/');
          if (isImage) hadImage = true;
          return !isImage;
        }
      );
      newAttachments = filtered;
      if (newAttachments.length === 0) newAttachments = undefined;
    }

    let result = {
      ...message,
      content: newContent,
      parts: newParts,
      experimental_attachments: newAttachments,
    };

    if (hadImage && (message.role === 'user' || message.role === 'assistant')) {
      result = strippedImageNotice(result);
    }

    return result;
  });
}

export async function streamText(props: {
  messages: Omit<Message, 'id'>[];
  env?: Env;
  options?: StreamingOptions;
  apiKeys?: Record<string, string>;
  files?: FileMap;
  providerSettings?: Record<string, IProviderSetting>;
  promptId?: string;
  contextOptimization?: boolean;
  contextFiles?: FileMap;
  summary?: string;
  messageSliceId?: number;
  chatMode?: 'discuss' | 'build' | 'troubleshoot' | 'idea';
  isSlidesMode?: boolean;
  isGameMode?: boolean;
  designScheme?: DesignScheme;
  supabaseProjectData?: any;
  neonProjectData?: any;
  allowBuild?: boolean;
  workspaceData?: any;
  onImageGenerated?: (filePath: string, base64: string) => void;
}) {
  const {
    messages,
    env: serverEnv,
    options,
    apiKeys,
    files,
    providerSettings,
    promptId,
    contextOptimization,
    contextFiles,
    summary,
    chatMode,
    isSlidesMode,
    isGameMode,
    designScheme,
    supabaseProjectData,
    neonProjectData,
    allowBuild,
    workspaceData,
    onImageGenerated,
  } = props;
  let currentModel = DEFAULT_MODEL;
  let currentProvider = DEFAULT_PROVIDER.name;
  let processedMessages = messages.map((message) => {
    const newMessage = { ...message };

    if (message.role === 'user') {
      const { model, provider, content } = extractPropertiesFromMessage(message);
      currentModel = model;
      currentProvider = provider;
      newMessage.content = sanitizeText(content);
    } else if (message.role == 'assistant') {
      newMessage.content = sanitizeText(message.content);
    }

    if (Array.isArray(message.parts)) {
      newMessage.parts = message.parts
        .filter((part: any) => part && typeof part === 'object')
        .map((part: any) => {
          if (!part.type || typeof part.type !== 'string') {
            return { type: 'text', text: JSON.stringify(part) };
          }
          if (part.type === 'text') {
            return { ...part, text: sanitizeText(part.text) };
          }
          return part;
        })
        .filter((part: any) => {
          const supported = ['text', 'tool-invocation', 'file', 'reasoning'];
          if (!supported.includes(part.type)) {
            logger.warn(`Stripping unsupported UI part type: ${part.type}`);
            return false;
          }
          return true;
        });
    }

    return newMessage;
  });

  const provider = PROVIDER_LIST.find((p) => p.name === currentProvider) || DEFAULT_PROVIDER;
  const staticModels = LLMManager.getInstance().getStaticModelListFromProvider(provider);
  let modelDetails = staticModels.find((m) => m.name === currentModel);

  if (!modelDetails) {
    const modelsList = [
      ...(provider.staticModels || []),
      ...(await LLMManager.getInstance().getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv: serverEnv as any,
      })),
    ];

    if (!modelsList.length) {
      throw new Error(`No models found for provider ${provider.name}`);
    }

    modelDetails = modelsList.find((m) => m.name === currentModel);

    if (!modelDetails) {
      if (provider.name === 'Google' && currentModel.includes('2.5')) {
        throw new Error(
          `Model "${currentModel}" not found. Gemini 2.5 Pro doesn't exist. Available Gemini models include: gemini-1.5-pro, gemini-2.0-flash, gemini-1.5-flash. Please select a valid model.`,
        );
      }

      logger.warn(
        `MODEL [${currentModel}] not found in provider [${provider.name}]. Falling back to first model. ${modelsList[0].name}`,
      );
      modelDetails = modelsList[0];
    }
  }

  const dynamicMaxTokens = modelDetails ? getCompletionTokenLimit(modelDetails) : Math.min(MAX_TOKENS, 16384);

  const safeMaxTokens = dynamicMaxTokens;

  logger.info(
    `Token limits for model ${modelDetails.name}: maxTokens=${safeMaxTokens}, maxTokenAllowed=${modelDetails.maxTokenAllowed}, maxCompletionTokens=${modelDetails.maxCompletionTokens}`,
  );

  let systemPrompt =
    PromptLibrary.getPropmtFromLibrary(promptId || 'default', {
      cwd: WORK_DIR,
      allowedHtmlElements: allowedHTMLElements,
      modificationTagName: MODIFICATIONS_TAG_NAME,
      designScheme,
      supabase: {
        isConnected: options?.supabaseConnection?.isConnected || false,
        hasSelectedProject: options?.supabaseConnection?.hasSelectedProject || false,
        credentials: options?.supabaseConnection?.credentials || undefined,
      },
      supabaseProjectData,
      neonProjectData,
      chatMode,
      allowBuild,
      workspaceData,
    }) ?? getSystemPrompt(WORK_DIR, options?.supabaseConnection, designScheme, supabaseProjectData, undefined, neonProjectData, allowBuild, workspaceData);

  if (allowBuild) {
    const FILE_WRITING_ENFORCEMENT = `
<CRITICAL_ENFORCEMENT_RULES>
  THESE ARE THE MOST IMPORTANT RULES FOR GENERATING ARTIFACTS AND CODE. YOU MUST FOLLOW THEM EXACTLY OR YOUR OUTPUT WILL BREAK.


  1. WRAP EVERYTHING IN AN ARTIFACT: ALL code files, shell commands, and questions MUST be placed inside a single \`<falborArtifact>\` block. NEVER output raw JSON or code outside of an artifact, UNLESS you are calling an available JSON tool/function. You are fully allowed to use the provided tools (like gmail_search_emails, slack_post_message, etc.) as needed.
  2. CONVERSATIONAL CONTEXT: ALWAYS provide a brief, friendly explanation or summary in plain text BEFORE the \`<falborArtifact>\` block. NEVER output just an artifact with no conversational context above it.
  3. EXACTLY ONE ARTIFACT PER MESSAGE: You must use exactly one \`<falborArtifact>\` per response. NEVER create multiple artifacts.
  4. FULL FILES ONLY (NO LAZY UPDATES): When writing or updating files using \`<falborAction type="file">\`, you MUST provide the COMPLETE, unmodified file content from the very first line to the very last line. 
     - NO placeholders like "// rest of code here"
     - NO diffs or partial updates
     - YOU MUST REWRITE THE ENTIRE FILE EVERY TIME. If you omit code or styles, you will break the application!
  5. EMPTY ARTIFACTS ARE FORBIDDEN: When the user asks you to add a feature or update the code, you MUST actually output the updated files using \`<falborAction type="file">\` inside your artifact. DO NOT just output an empty artifact box with a title and no files!
  6. PRESERVE EXISTING DESIGN: When the user asks you to add a new feature or page to an existing project, DO NOT rewrite the entire application's design, layout, or color scheme unless explicitly asked. ONLY make the changes necessary to fulfill the request. If asked to create a new page, actually create a new file/route for it.
  7. MODULAR ARCHITECTURE (NO MONOLITHIC FILES): Do NOT dump all your CSS or components into massive, monolithic files (like one giant 'styles.css' or 'App.jsx'). You MUST break down your code into small, modular files (e.g., separate CSS files or module files for each specific section/component). When adding a new section, create new dedicated files for it instead of bloating existing ones. This prevents accidental redesigns!
  8. NO INSPECTION-ONLY MESSAGES: Do NOT start by only running terminal commands to inspect the directory (like \`ls\`, \`pwd\`, or \`find\`) without generating code. You MUST write and output the actual files for the landing page or application in your very first response alongside any setup commands inside your single artifact. The user expects to see the application built immediately!
  9. VITE CONFIGURATION (CRITICAL FOR LIVE RECONNECTS): When creating or editing a 'vite.config.js' or 'vite.config.ts' file, you MUST configure the development server's watcher to use polling so hot-reloading works in the browser WebContainer.
     Example config:
     // ...
     export default defineConfig({
       server: {
         watch: {
           usePolling: true
         }
       }
     });
     // ...
  10. INTERACTIVE QUESTIONS ONLY: You must NEVER use markdown lists for choices/questions (e.g. "1. Option A"). You must ALWAYS use the \`<falborAction type="question">\` block.


  CORRECT FORMAT EXAMPLE (HOW TO WRITE FILES AND ASK QUESTIONS):
  Here is the portfolio MVP you requested! I have set up the main page and included a question to finalize the design.
  <falborArtifact id="portfolio-mvp-setup" title="Portfolio MVP Setup">
    <falborAction type="file" filePath="app/page.tsx">
      import React from 'react';
      export default function Page() {
        return (
          <div className="min-h-screen bg-black text-white">
            <h1>My Portfolio</h1>
            <p>This is the full, complete file content. No code is omitted.</p>
          </div>
        );
      }
    </falborAction>
    <falborAction type="question" title="Design Choice">
    {
      "question": "Which visual style do you prefer?",
      "options": ["Dark mode", "Light mode"]
    }
    </falborAction>
  </falborArtifact>
</CRITICAL_ENFORCEMENT_RULES>
`;
    systemPrompt = FILE_WRITING_ENFORCEMENT + systemPrompt;
  }

  if (isSlidesMode) {
    systemPrompt += `


================================================================================
You are in SLIDES PRESENTATION MODE.
The user wants you to generate a full-screen presentation using React and Tailwind CSS.
IMPORTANT REQUIREMENTS FOR SLIDES MODE:
1. ALWAYS start your verbal response with exactly: "I'm going to create a presentation for you..."
2. Build a single-page React application that acts as a presentation with multiple slides.
3. DO NOT include a visual navigation toolbar or UI controls in your code. The IDE environment will automatically overlay a native toolbar on top of your presentation.
4. To integrate with the native toolbar, your React application MUST listen for window messages to navigate:
   - \`window.addEventListener('message', (e) => { if (e.data.type === 'SLIDE_NEXT') { ... } else if (e.data.type === 'SLIDE_PREV') { ... } else if (e.data.type === 'SLIDE_GOTO') { ... } else if (e.data.type === 'SLIDE_TOGGLE_GRID') { ... } })\`
5. You MUST send messages to the parent window whenever the slide changes so the native toolbar can update its state:
   - \`window.parent.postMessage({ type: 'SLIDES_STATE', currentSlide: 0, totalSlides: 5, slides: [{title: 'Slide 1'}, {title: 'Slide 2'}] }, '*')\`
6. Ensure the presentation is highly professional with modern typography, colors, and dynamic Canva-like animations.
7. Support the 'SLIDE_TOGGLE_GRID' message by displaying all slides in a grid view when active.
================================================================================
`;
  }

  if (modelDetails.name === 'claude-haiku-4-5') {
    systemPrompt = `CRITICAL RULES (MUST FOLLOW):
1. Never output code or JSON directly in the chat response, EXCEPT when natively calling provided tools like webSearch or gmail_search_emails.
2. ALWAYS use the <falborArtifact> format for writing code.
3. NEVER use <function_calls>, <invoke>, or <parameter> tags. Output the <falborArtifact> DIRECTLY in your response.
4. Separate every file using its own <falborAction type="file" filePath="path/to/file"> block. Do not combine multiple files into one.


CORRECT EXAMPLE FORMAT:
<falborArtifact id="my-project" title="My Project">
  <falborAction type="file" filePath="package.json">
{
  "name": "my-project"
}
  </falborAction>
  <falborAction type="file" filePath="src/index.js">
console.log("Hello");
  </falborAction>
</falborArtifact>


${systemPrompt}`;
  }

  if (contextFiles && contextOptimization) {
    const codeContext = createFilesContext(contextFiles, true);

    systemPrompt = `${systemPrompt}


    Below is the artifact containing the context loaded into context buffer for you to have knowledge of and might need changes to fullfill current user request.
    CONTEXT BUFFER:
    ---
${codeContext}
    ---
    `;

    if (summary) {
      systemPrompt = `${systemPrompt}
      below is the chat history till now
      CHAT SUMMARY:
      ---
${props.summary}
      ---
      `;

      if (props.messageSliceId) {
        processedMessages = processedMessages.slice(props.messageSliceId);
      } else {
        const lastMessage = processedMessages.pop();

        if (lastMessage) {
          processedMessages = [lastMessage];
        }
      }
    }
  }

  const effectiveLockedFilePaths = new Set<string>();

  if (files) {
    for (const [filePath, fileDetails] of Object.entries(files)) {
      if (fileDetails?.isLocked) {
        effectiveLockedFilePaths.add(filePath);
      }
    }
  }

  if (effectiveLockedFilePaths.size > 0) {
    const lockedFilesListString = Array.from(effectiveLockedFilePaths)
      .map((filePath) => `- ${filePath}`)
      .join('\n');
    systemPrompt = `${systemPrompt}


    IMPORTANT: The following files are locked and MUST NOT be modified in any way. Do not suggest or make any changes to these files. You can proceed with the request but DO NOT make any changes to these files specifically:
${lockedFilesListString}
    ---
    `;
  } else {
    console.log('No locked files found from any source for prompt.');
  }

  logger.info(`Sending llm call to ${provider.name} with model ${modelDetails.name}`);
  const isReasoning = isReasoningModel(modelDetails.name);
  logger.info(
    `Model "${modelDetails.name}" is reasoning model: ${isReasoning}, using ${isReasoning ? 'maxCompletionTokens' : 'maxTokens'}: ${safeMaxTokens}`,
  );

  if (safeMaxTokens > (modelDetails.maxTokenAllowed || 128000)) {
    logger.warn(
      `Token limit warning: requesting ${safeMaxTokens} tokens but model supports max ${modelDetails.maxTokenAllowed || 128000}`,
    );
  }

  const tokenParams = isReasoning ? { maxCompletionTokens: safeMaxTokens } : { maxTokens: safeMaxTokens };

  const filteredOptions =
    isReasoning && options
      ? Object.fromEntries(
        Object.entries(options).filter(
          ([key]) =>
            ![
              'temperature',
              'topP',
              'presencePenalty',
              'frequencyPenalty',
              'logprobs',
              'topLogprobs',
              'logitBias',
            ].includes(key),
        ),
      )
      : options || {};

  logger.info(
    `DEBUG STREAM: Options filtering for model "${modelDetails.name}":`,
    JSON.stringify(
      {
        isReasoning,
        originalOptions: options || {},
        filteredOptions,
        originalOptionsKeys: options ? Object.keys(options) : [],
        filteredOptionsKeys: Object.keys(filteredOptions),
        removedParams: options ? Object.keys(options).filter((key) => !(key in filteredOptions)) : [],
      },
      null,
      2,
    ),
  );

  const visionSafeMessages = stripImagesFromMessages(processedMessages, modelDetails);

  function sanitizeCoreMessages(msgs: any[]): any[] {
    return msgs.map((msg: any) => {
      if (!msg || typeof msg !== 'object') return msg;

      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        return {
          ...msg,
          content: msg.content.filter((part: any) => {
            const supported = ['text', 'tool-call'];
            return part && typeof part === 'object' && supported.includes(part.type);
          }),
        };
      }

      if (msg.role === 'user' && Array.isArray(msg.content)) {
        return {
          ...msg,
          content: msg.content.filter((part: any) => {
            const supported = ['text', 'image'];
            return part && typeof part === 'object' && supported.includes(part.type);
          }),
        };
      }

      return msg;
    });
  }

  const streamParams = {
    model: wrapLanguageModel({
      model: provider.getModelInstance({
        model: modelDetails.name,
        serverEnv,
        apiKeys,
        providerSettings,
      }),
      middleware: {
        wrapStream: async ({ doStream, params }) => {
          const rawTools = (params as any).tools;
          let availableToolNames: Set<string>;
          if (Array.isArray(rawTools)) {
            availableToolNames = new Set(rawTools.map((t: any) => t.name || t.id).filter(Boolean));
          } else if (rawTools && typeof rawTools === 'object') {
            availableToolNames = new Set(Object.keys(rawTools));
          } else {
            availableToolNames = new Set();
          }

          const strippedToolCallIds = new Set<string>();

          const promptAfterStrip = params.prompt.map((msg) => {
            if (msg.role === 'assistant' && Array.isArray(msg.content)) {
              const filtered = msg.content.filter((part: any) => {
                if (part.type === 'tool-call') {
                  if (availableToolNames.size > 0 && !availableToolNames.has(part.toolName)) {
                    console.warn(`[stream-text] Stripping unavailable tool call: ${part.toolName} (id: ${part.toolCallId})`);
                    if (part.toolCallId) strippedToolCallIds.add(part.toolCallId);
                    return false;
                  }
                }
                return part.type === 'text' || part.type === 'tool-call';
              });
              return { ...msg, content: filtered };
            }
            return msg;
          });

          params.prompt = promptAfterStrip.map((msg) => {
            if (msg.role === 'user' && Array.isArray(msg.content) && strippedToolCallIds.size > 0) {
              const filtered = msg.content.filter((part: any) => {
                if (part.type === 'tool-result' && strippedToolCallIds.has(part.toolCallId)) {
                  console.warn(`[stream-text] Removing orphaned tool-result for stripped call: ${part.toolCallId}`);
                  return false;
                }
                return true;
              });
              if (filtered.length === 0) return null;
              return { ...msg, content: filtered };
            }
            if ((msg as any).role === 'tool') {
              const toolCallId = (msg as any).tool_call_id || (msg as any).toolCallId;
              if (toolCallId && strippedToolCallIds.has(toolCallId)) {
                console.warn(`[stream-text] Removing orphaned role:tool message: ${toolCallId}`);
                return null;
              }
            }
            return msg;
          }).filter(Boolean) as typeof params.prompt;

          const lastMsg = params.prompt[params.prompt.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            params.prompt.push({
              role: 'user',
              content: [{ type: 'text', text: 'Please continue exactly from where you left off. Do not repeat anything you have already written. Start your response directly with the very next character.' }]
            });
          }

          try {
            return await doStream();
          } catch (e) {
            console.error("doStream error:", e);
            throw e;
          }
        },
        wrapGenerate: async ({ doGenerate, params }) => {
          params.prompt = params.prompt.map((msg) => {
            if (msg.role === 'assistant' && Array.isArray(msg.content)) {
              return {
                ...msg,
                content: msg.content.filter((part: any) => part.type === 'text' || part.type === 'tool-call'),
              };
            }
            return msg;
          });
          return doGenerate();
        },
      },
    }),
    system: (() => {
      let finalPrompt = isGameMode
        ? `${systemPrompt}\n\nAdditionally, you are an expert 2D Game Developer AI. Your goal is to build an entire fully-functional 2D web game based on the user's request.
CRITICAL RULES:
- When building the game for the FIRST time, you must create all graphical assets required (characters, backgrounds, items, UI) using the \`generate_image_asset\` tool.
- ONLY generate images during the initial game creation or if the user explicitly asks for new images/assets.
- DO NOT generate or regenerate images when making code-only updates, fixing bugs, or modifying features.
- If an image generation tool call fails, use a colored rectangle or basic shape placeholder in the game canvas instead, and DO NOT retry generating that image.
- You must always request images with a transparent background where appropriate (e.g., characters, items) in the prompt.
- Place all generated images inside the \`public/\` folder.
- The game should be built using React (HTML5 Canvas or DOM elements) and standard web technologies.
- Write a highly polished, fully complete game. It should be visually impressive and fun to play.`
        : (chatMode === 'build' || chatMode === 'idea') ? systemPrompt : discussPrompt();

      if (modelDetails && modelDetails.name && modelDetails.name.toLowerCase().includes('qwen')) {
        finalPrompt = `CRITICAL FOR QWEN MODEL: You MUST present all market research and validation reports inside a <falborArtifact id="validation" title="Market Research"><falborAction type="analyzer" title="Market Research & Validation">...</falborAction></falborArtifact> block. NEVER output plain text research directly in the chat. You MUST use these XML tags to open the side panel.\n\n${finalPrompt}`;
      }

      if (modelDetails && modelDetails.name && modelDetails.name.toLowerCase().includes('gpt')) {
        finalPrompt = `CRITICAL INSTRUCTIONS FOR OPENAI MODELS:
1. NEVER output raw markdown code blocks like \`\`\`javascript\n...\`\`\` for source code files.
2. ALL code files MUST be generated inside the exact XML format:
<falborArtifact id="some-id" title="Some Title">
  <falborAction type="file" filePath="path/to/file.js">
    [CODE GOES HERE]
  </falborAction>
</falborArtifact>
3. If you fail to use the XML tags, the UI will break and the code will leak into the chat. You MUST USE the XML format for EVERY code file you write.\n\n${finalPrompt}`;
      }

      return finalPrompt;
    })(),
    ...tokenParams,
    messages: (() => {
      let coreMsgs = sanitizeCoreMessages(convertToCoreMessages(visionSafeMessages as any));

      coreMsgs = coreMsgs.map(msg => {
        if (msg.role === 'assistant') {
          const replacePatternArtifact = /<falborArtifact[^>]*>[\s\S]*?(?:<\/falborArtifact>|$)/gi;
          const replacePatternAction = /<falborAction[^>]*type="file"[^>]*>[\s\S]*?(?:<\/falborAction>|$)/gi;
          const replacePatternMarkdown = /```(?:jsx?|tsx?|typescript|javascript|html?|css|python|py|json|vue|svelte|php|ruby|go|rust|java|kotlin|swift|c|cpp|csharp)\n([\s\S]{200,}?)(?:```|$)/gi;

          const replaceFn = (match: string) => {
            const idMatch = match.match(/id="([^"]+)"/i) || match.match(/filePath="([^"]+)"/i);
            const titleMatch = match.match(/title="([^"]+)"/i);
            return `<falborArtifact id="${idMatch?.[1] || 'code'}" title="${titleMatch?.[1] || 'Code'}">\n[Content omitted to save tokens. The files are actively running in the workspace. Do NOT repeat this content unless you are explicitly making changes to it.]\n</falborArtifact>`;
          };

          if (typeof msg.content === 'string') {
            let optimizedContent = msg.content
              .replace(replacePatternArtifact, replaceFn)
              .replace(replacePatternAction, replaceFn)
              .replace(replacePatternMarkdown, replaceFn);
            return { ...msg, content: optimizedContent };
          } else if (Array.isArray(msg.content)) {
            return {
              ...msg,
              content: msg.content.map((part: any) => {
                if (part.type === 'text') {
                  let optimizedText = part.text
                    .replace(replacePatternArtifact, replaceFn)
                    .replace(replacePatternAction, replaceFn)
                    .replace(replacePatternMarkdown, replaceFn);
                  return { ...part, text: optimizedText };
                }
                return part;
              })
            };
          }
        }
        return msg;
      });
      if (modelDetails && modelDetails.name && modelDetails.name.toLowerCase().includes('qwen')) {
        const lastUserMsg = [...coreMsgs].reverse().find((m) => m.role === 'user');
        if (lastUserMsg) {
          if (typeof lastUserMsg.content === 'string') {
            lastUserMsg.content += `\n\n[CRITICAL REMINDER: You MUST present all market research and validation reports inside a <falborArtifact id="validation" title="Market Research"><falborAction type="analyzer" title="Market Research & Validation">...</falborAction></falborArtifact> block. NEVER output plain text research in the chat. You MUST use these XML tags to open the side panel.]`;
          } else if (Array.isArray(lastUserMsg.content)) {
            lastUserMsg.content.push({
              type: 'text',
              text: `\n\n[CRITICAL REMINDER: You MUST present all market research and validation reports inside a <falborArtifact id="validation" title="Market Research"><falborAction type="analyzer" title="Market Research & Validation">...</falborAction></falborArtifact> block. NEVER output plain text research in the chat. You MUST use these XML tags to open the side panel.]`
            });
          }
        }
      }
      return coreMsgs;
    })(),
    ...filteredOptions,

    ...(isReasoning ? { temperature: 1 } : {}),

    ...(isGameMode ? {
      tools: {
        generate_image_asset: tool({
          description: 'Generate a 2D game asset image. Use this tool for all characters, items, and backgrounds.',
          parameters: z.object({
            prompt: z.string().describe('The detailed visual description of the game asset to generate. Always specify if it needs a transparent background (e.g., "A 16-bit pixel art sword, transparent background").'),
            fileName: z.string().describe('The exact file name to save the image as, e.g., "hero.png".'),
          }),
          execute: async ({ prompt, fileName }) => {
            let lastError = '';
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                const openaiKey = apiKeys?.['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY;
                if (!openaiKey) {
                  return 'Failed: OpenAI API key is missing. Cannot generate image.';
                }

                const response = await fetch('https://api.openai.com/v1/images/generations', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`,
                  },
                  body: JSON.stringify({
                    model: attempt > 1 && lastError.includes('model_not_found') ? 'dall-e-3' : 'gpt-image-2',
                    prompt,
                    n: 1,
                    size: '1024x1024',
                  }),
                });

                if (!response.ok) {
                  const errText = await response.text();
                  lastError = `${response.statusText} - ${errText}`;

                  if (response.status === 400 && errText.includes('content_policy_violation')) {
                    return `Failed: The prompt violated safety policies. DO NOT RETRY. Use a placeholder instead.`;
                  }

                  await new Promise(r => setTimeout(r, 1500 * attempt));
                  continue;
                }

                const data = await response.json();
                const b64Json = data.data?.[0]?.b64_json;
                let base64 = b64Json;

                if (!base64) {
                  const imageUrl = data.data?.[0]?.url;

                  if (!imageUrl) {
                    lastError = 'No image url or b64_json returned from OpenAI.';
                    continue;
                  }

                  const imageResponse = await fetch(imageUrl);
                  if (!imageResponse.ok) {
                    lastError = `Failed to download generated image: ${imageResponse.statusText}`;
                    continue;
                  }
                  const imageBuffer = await imageResponse.arrayBuffer();
                  base64 = Buffer.from(imageBuffer).toString('base64');
                }

                if (onImageGenerated) {
                  onImageGenerated(`public/${fileName}`, base64);
                  return `Successfully generated and saved image to public/${fileName}`;
                }
                return `Failed: onImageGenerated callback missing.`;
              } catch (err: any) {
                lastError = err.message;
                await new Promise(r => setTimeout(r, 1500 * attempt));
              }
            }
            return `Failed to generate image after 3 attempts. Error: ${lastError}. DO NOT RETRY. Use a fallback placeholder in code instead.`;
          }
        })
      }
    } : {}),
  };

  logger.info(
    `DEBUG STREAM: Final streaming params for model "${modelDetails.name}":`,
    JSON.stringify(
      {
        hasTemperature: 'temperature' in streamParams,
        hasMaxTokens: 'maxTokens' in streamParams,
        hasMaxCompletionTokens: 'maxCompletionTokens' in streamParams,
        paramKeys: Object.keys(streamParams).filter((key) => !['model', 'messages', 'system'].includes(key)),
        streamParams: Object.fromEntries(
          Object.entries(streamParams).filter(([key]) => !['model', 'messages', 'system'].includes(key)),
        ),
      },
      null,
      2,
    ),
  );

  return await _streamText(streamParams as any);
}