import { CoreMessage } from "ai";
import { SYSTEM_PROMPT } from "../system_prompt";
import { buildDesignSystemPromptBlock } from "../design_system";
import { buildSelectedStackPolicy, buildUserImagePolicy } from "../policies";
import { PromptHistoryMessage, Stack } from "../prompt_types";
import { buildHistoryMessage } from "../message_builder";

export function buildUpdatePromptFromHistory(
  stack: Stack,
  history: PromptHistoryMessage[],
  imageGenerationEnabled: boolean,
  designSystem?: string | null
): CoreMessage[] {
  const firstUserIndex = history.findIndex((item) => item.role === "user");
  if (firstUserIndex === -1) {
    throw new Error("Update history must include at least one user message");
  }

  const promptMessages: CoreMessage[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
  ];

  const selectedStack = buildSelectedStackPolicy(stack);
  const imagePolicy = buildUserImagePolicy(imageGenerationEnabled);
  const designSystemBlock = buildDesignSystemPromptBlock(designSystem);

  for (let index = 0; index < history.length; index++) {
    const item = history[index];
    if (index === firstUserIndex) {
      const stackPrefixParts = [selectedStack, imagePolicy];
      if (designSystemBlock) {
        stackPrefixParts.push(designSystemBlock.trim());
      }
      const stackPrefix = stackPrefixParts.join("\n\n");
      const userText = item.text || "";
      const prefixedText = userText.trim() ? `${stackPrefix}\n\n${userText}` : stackPrefix;
      
      promptMessages.push(
        buildHistoryMessage({
          role: "user",
          text: prefixedText,
          images: item.images || [],
          videos: item.videos || [],
        })
      );
      continue;
    }

    promptMessages.push(buildHistoryMessage(item));
  }

  return promptMessages;
}
