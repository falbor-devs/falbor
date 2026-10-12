import { PromptConstructionPlan, PromptHistoryMessage, Stack } from "./prompt_types";

export function derivePromptConstructionPlan(
  stack: Stack,
  inputMode: "image" | "video" | "text",
  generationType: "create" | "update",
  history: PromptHistoryMessage[],
  fileState: { path?: string; content: string } | null
): PromptConstructionPlan {
  if (generationType === "update") {
    let strategy: "update_from_history" | "update_from_file_snapshot";
    if (history.length > 0) {
      strategy = "update_from_history";
    } else if (fileState && fileState.content.trim()) {
      strategy = "update_from_file_snapshot";
    } else {
      throw new Error("Update requests require history or fileState.content");
    }
    return {
      generationType: "update",
      inputMode,
      stack,
      constructionStrategy: strategy,
    } as any; // Need to map case manually as PromptConstructionPlan uses snake_case, let's just export it properly mapped.
  }

  return {
    generation_type: "create",
    input_mode: inputMode,
    stack,
    construction_strategy: "create_from_input",
  };
}
