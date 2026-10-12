import toast from "react-hot-toast";
import { FullGenerationSettings } from "./_types";

const ERROR_MESSAGE =
  "Error generating code. Check the Developer Console for details.";

const CANCEL_MESSAGE = "Code generation cancelled";

type StreamEvent = {
  type:
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
  value?: string;
  data?: any;
  eventId?: string;
  variantIndex: number;
};

interface CodeGenerationCallbacks {
  onChange: (chunk: string, variantIndex: number) => void;
  onSetCode: (code: string, variantIndex: number) => void;
  onStatusUpdate: (status: string, variantIndex: number) => void;
  onVariantComplete: (variantIndex: number) => void;
  onVariantError: (variantIndex: number, error: string) => void;
  onVariantCount: (count: number) => void;
  onVariantModels: (models: string[]) => void;
  onThinking: (content: string, variantIndex: number, eventId?: string) => void;
  onAssistant: (content: string, variantIndex: number, eventId?: string) => void;
  onToolStart: (data: any, variantIndex: number, eventId?: string) => void;
  onToolResult: (data: any, variantIndex: number, eventId?: string) => void;
  onCancel: (
    reason: "user_cancelled" | "request_failed" | "connection_error",
    errorMessage?: string
  ) => void;
  onComplete: () => void;
}

export function generateCode(
  wsRef: React.MutableRefObject<AbortController | null>,
  params: FullGenerationSettings,
  callbacks: CodeGenerationCallbacks
) {
  const controller = new AbortController();
  wsRef.current = controller;

  (async () => {
    try {
      callbacks.onVariantCount(1);
      callbacks.onStatusUpdate("Connecting...", 0);

      const response = await fetch("/api/ai/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(errorText || ERROR_MESSAGE);
        callbacks.onCancel("request_failed", errorText || ERROR_MESSAGE);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const event = JSON.parse(jsonStr) as StreamEvent;
            if (event.type === "chunk") {
              callbacks.onChange(event.value || "", event.variantIndex);
            } else if (event.type === "status") {
              callbacks.onStatusUpdate(event.value || "", event.variantIndex);
            } else if (event.type === "setCode") {
              callbacks.onSetCode(event.value || "", event.variantIndex);
            } else if (event.type === "variantComplete") {
              callbacks.onVariantComplete(event.variantIndex);
            } else if (event.type === "variantError") {
              callbacks.onVariantError(event.variantIndex, event.value || "");
            } else if (event.type === "variantCount") {
              callbacks.onVariantCount(parseInt(event.value || "1"));
            } else if (event.type === "variantModels") {
              callbacks.onVariantModels(event.data?.models || []);
            } else if (event.type === "thinking") {
              callbacks.onThinking(event.value || "", event.variantIndex, event.eventId);
            } else if (event.type === "assistant") {
              callbacks.onAssistant(event.value || "", event.variantIndex, event.eventId);
            } else if (event.type === "toolStart") {
              callbacks.onToolStart(event.data, event.variantIndex, event.eventId);
            } else if (event.type === "toolResult") {
              callbacks.onToolResult(event.data, event.variantIndex, event.eventId);
            } else if (event.type === "error") {
              toast.error(event.value || ERROR_MESSAGE);
            }
          } catch {
            // skip unparseable line
          }
        }
      }

      callbacks.onComplete();
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast.success(CANCEL_MESSAGE);
        callbacks.onCancel("user_cancelled");
      } else {
        console.error("Code generation error", err);
        toast.error(ERROR_MESSAGE);
        callbacks.onCancel("connection_error", err.message || ERROR_MESSAGE);
      }
    }
  })();
}
