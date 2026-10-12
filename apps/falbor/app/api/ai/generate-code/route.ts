import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { buildPromptMessages } from "./prompts/pipeline";
import { getTools } from "./tools";

type EventType =
  | "chunk"
  | "status"
  | "setCode"
  | "error"
  | "variantComplete"
  | "variantError"
  | "variantCount"
  | "variantModels"
  | "thinking"
  | "assistant"
  | "toolStart"
  | "toolResult";

function sseEvent(
  type: EventType,
  value?: string,
  variantIndex = 0,
  data?: unknown,
  eventId?: string
) {
  const payload = JSON.stringify({ type, value, variantIndex, data, eventId });
  return `data: ${payload}\n\n`;
}

function getModel(stack: string, settings: any, req: Request) {
  const anthropicKey = settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  const openaiKey = settings.openAiApiKey || process.env.OPENAI_API_KEY;
  const geminiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/selectedModel=([^;]+)/);
  const cookieModelId = match ? decodeURIComponent(match[1]) : null;

  const modelId = cookieModelId || settings.codeGenerationModel || "claude-3-5-sonnet-latest";

  if (modelId.includes("gpt") || modelId.includes("o1") || modelId.includes("luna")) {
    const keyToUse = openaiKey || (settings.openAiBaseURL ? "dummy-key" : null);
    if (!keyToUse) throw new Error("OpenAI API key not configured");
    const openai = createOpenAI({
      apiKey: keyToUse,
      baseURL: settings.openAiBaseURL || undefined,
    });
    return { model: openai(modelId), modelId };
  }

  if (modelId.includes("gemini")) {
    if (!geminiKey) throw new Error("Gemini API key not configured");
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return { model: google(modelId), modelId };
  }

  // Default to anthropic
  if (!anthropicKey) throw new Error("Anthropic API key not configured");
  const anthropic = createAnthropic({
    apiKey: anthropicKey,
    headers: { "anthropic-beta": "output-128k-2025-02-19" },
  });
  const resolvedModelId = modelId === "claude-sonnet-4-5" ? "claude-3-5-sonnet-latest" : modelId;
  return { model: anthropic(resolvedModelId), modelId: resolvedModelId };
}

export async function POST(request: Request) {
  let params: any;
  try {
    params = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  let model;
  let modelId: string;
  try {
    const res = getModel(params.generatedCodeConfig, params, request);
    model = res.model;
    modelId = res.modelId;
  } catch (err: any) {
    return new Response(err.message || "No AI API key configured", { status: 500 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const enqueue = (s: string) => controller.enqueue(encoder.encode(s));
      try {
        enqueue(sseEvent("variantCount", "1", 0));
        enqueue(sseEvent("status", "Generating code...", 0));

        const stack = params.generatedCodeConfig || "html_tailwind";
        const prompt = params.prompt || { text: "", images: [], videos: [] };
        const history = params.history || [];
        const fileState = { content: params.fileState?.content || "" };
        const inputMode = prompt.images?.length > 0 ? "image" : prompt.videos?.length > 0 ? "video" : "text";
        const generationType = history.length > 0 || fileState.content ? "update" : "create";

        const messages = buildPromptMessages(
          stack,
          inputMode,
          generationType,
          prompt,
          history,
          fileState,
          true, // Image generation enabled
          null  // Design system
        );

        const tools = getTools(fileState);

        const isLuna = modelId.includes("luna") || modelId.includes("sol");
        const result = await streamText({
          model,
          messages,
          tools,
          maxSteps: 30, // Loop up to 30 times just like python agent
          ...(isLuna ? {
            providerOptions: {
              openai: { reasoningEffort: "none" },
            }
          } : {})
        });

        let currentToolCallId = "";

        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            // Provide a static eventId per assistant chunk stream
            if (!currentToolCallId) currentToolCallId = crypto.randomUUID();
            enqueue(sseEvent("assistant", part.textDelta, 0, undefined, currentToolCallId));
          } else if (part.type === "tool-call") {
            currentToolCallId = part.toolCallId;
            enqueue(
              sseEvent(
                "toolStart",
                undefined,
                0,
                {
                  name: part.toolName,
                  input: part.args,
                },
                part.toolCallId
              )
            );
          } else if (part.type === "tool-result") {
            const toolResult = part.result as any;
            if (toolResult?.updated_content) {
              enqueue(sseEvent("setCode", toolResult.updated_content, 0));
            }
            enqueue(
              sseEvent(
                "toolResult",
                undefined,
                0,
                {
                  name: part.toolName,
                  output: toolResult?.summary || "Tool completed",
                  ok: toolResult?.ok ?? true,
                },
                part.toolCallId
              )
            );
          } else if (part.type === "error") {
            console.error("AI Generation Stream Error:", part.error);
            const errorMsg = part.error instanceof Error ? part.error.message : String(part.error);
            enqueue(sseEvent("variantError", errorMsg, 0));
            return;
          }
        }

        // Just in case no tool was called but the model generated raw code
        if (fileState.content) {
            enqueue(sseEvent("setCode", fileState.content, 0));
        }

        enqueue(sseEvent("variantComplete", undefined, 0));
        enqueue(`data: [DONE]\n\n`);
      } catch (err: any) {
        console.error("AI Generation Error:", err);
        enqueue(sseEvent("variantError", err.message || "Generation failed", 0));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
