import { CoreMessage } from "ai";
import { SYSTEM_PROMPT } from "../system_prompt";
import { buildDesignSystemPromptBlock } from "../design_system";
import { buildSelectedStackPolicy, buildUserImagePolicy } from "../policies";
import { Stack, UserTurnInput } from "../prompt_types";
import { buildHistoryMessage } from "../message_builder";

export function buildUpdatePromptFromFileSnapshot(
  stack: Stack,
  prompt: UserTurnInput,
  fileState: { path?: string; content: string },
  imageGenerationEnabled: boolean,
  designSystem?: string | null
): CoreMessage[] {
  const path = fileState.path || "index.html";
  const requestText =
    prompt.full_text?.trim() || prompt.text.trim() || "Apply the requested update.";

  const selectedStack = buildSelectedStackPolicy(stack);
  const imagePolicy = buildUserImagePolicy(imageGenerationEnabled);
  const designSystemBlock = buildDesignSystemPromptBlock(designSystem);

  const promptParts = [selectedStack, imagePolicy];
  if (designSystemBlock) {
    promptParts.push(designSystemBlock.trim());
  }
  const promptPrefix = promptParts.join("\n\n");

  const bootstrapText = `${promptPrefix}

You are editing an existing file.

<current_file path="${path}">
${fileState.content}
</current_file>

<change_request>
${requestText}
</change_request>`;

  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    buildHistoryMessage({
      role: "user",
      text: bootstrapText,
      images: prompt.images || [],
      videos: prompt.videos || [],
    }),
  ];
}
