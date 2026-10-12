import { CoreMessage } from "ai";
import { Stack } from "../prompt_types";
import { SYSTEM_PROMPT } from "../system_prompt";
import { buildDesignSystemPromptBlock } from "../design_system";
import { buildSelectedStackPolicy, buildUserImagePolicy } from "../policies";

export function buildTextPromptMessages(
  textPrompt: string,
  stack: Stack,
  imageGenerationEnabled: boolean,
  designSystem?: string | null
): CoreMessage[] {
  const imagePolicy = buildUserImagePolicy(imageGenerationEnabled);
  const selectedStack = buildSelectedStackPolicy(stack);
  const designSystemBlock = buildDesignSystemPromptBlock(designSystem);

  const USER_PROMPT = `
Generate UI for ${textPrompt}.
${selectedStack}
${designSystemBlock}

# Instructions

- Make sure to make it look modern and sleek.
- Use modern, professional fonts and colors.
- Follow UX best practices.
- ${imagePolicy}`;

  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: USER_PROMPT,
    },
  ];
}
