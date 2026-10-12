import { CoreMessage } from "ai";
import { PromptHistoryMessage, Stack, UserTurnInput } from "./prompt_types";
import { derivePromptConstructionPlan } from "./plan";
import { buildUpdatePromptFromHistory } from "./update/from_history";
import { buildUpdatePromptFromFileSnapshot } from "./update/from_file_snapshot";
import { buildImagePromptMessages } from "./create/image";
import { buildTextPromptMessages } from "./create/text";

export function buildPromptMessages(
  stack: Stack,
  inputMode: "image" | "video" | "text",
  generationType: "create" | "update",
  prompt: UserTurnInput,
  history: PromptHistoryMessage[],
  fileState: { path?: string; content: string } | null = null,
  imageGenerationEnabled: boolean = true,
  designSystem: string | null = null
): CoreMessage[] {
  const plan = derivePromptConstructionPlan(
    stack,
    inputMode,
    generationType,
    history,
    fileState
  );

  const strategy = (plan as any).constructionStrategy || plan.construction_strategy;

  if (strategy === "update_from_history") {
    return buildUpdatePromptFromHistory(
      stack,
      history,
      imageGenerationEnabled,
      designSystem
    );
  }

  if (strategy === "update_from_file_snapshot") {
    if (!fileState) {
      throw new Error("fileState must not be null for update_from_file_snapshot");
    }
    return buildUpdatePromptFromFileSnapshot(
      stack,
      prompt,
      fileState,
      imageGenerationEnabled,
      designSystem
    );
  }

  if (inputMode === "image") {
    const imageUrls = prompt.images || [];
    const textPrompt = prompt.text || "";
    return buildImagePromptMessages(
      imageUrls,
      stack,
      textPrompt,
      imageGenerationEnabled,
      designSystem
    );
  }

  if (inputMode === "text") {
    return buildTextPromptMessages(
      prompt.text,
      stack,
      imageGenerationEnabled,
      designSystem
    );
  }

  if (inputMode === "video") {
    // We treat videos as images right now for prompt purposes in the basic implementation
    const videoUrls = prompt.videos || [];
    if (!videoUrls.length) {
      throw new Error("Video mode requires a video to be provided");
    }
    return buildImagePromptMessages(
      videoUrls, // Send video frame as image URL
      stack,
      prompt.text || "",
      imageGenerationEnabled,
      designSystem
    );
  }

  throw new Error(`Unsupported input mode: ${inputMode}`);
}
