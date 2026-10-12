import { CoreMessage } from "ai";
import { Stack } from "../prompt_types";
import { SYSTEM_PROMPT } from "../system_prompt";
import { buildDesignSystemPromptBlock } from "../design_system";
import { buildSelectedStackPolicy, buildUserImagePolicy } from "../policies";

export function buildImagePromptMessages(
  imageDataUrls: string[],
  stack: Stack,
  textPrompt: string,
  imageGenerationEnabled: boolean,
  designSystem?: string | null
): CoreMessage[] {
  const imagePolicy = buildUserImagePolicy(imageGenerationEnabled);
  const selectedStack = buildSelectedStackPolicy(stack);
  const designSystemBlock = buildDesignSystemPromptBlock(designSystem);

  let userPrompt = `
Generate code for a web page that looks exactly like the provided screenshot(s).

${selectedStack}
${designSystemBlock}

## Replication instructions

- Make sure the web page looks exactly like the screenshot.
- Use the exact text from the screenshot.
- Since our goal is to make the web page look as close to the screenshot as possible, we need to extract the exact image assets where possible and generate images for the assets that are not extractable.
- Extracting assets can be done with the extract_assets tool. After extracting assets, make sure to inspect the extracted image closely to ensure that it is what we want.
- When available, use edit_images for asset edits such as removing unwanted elements, batching independent edits into one call.
- If an extracted or supplied asset is visibly low-resolution or pixelated and must render larger, upscale it with edit_images—not CSS stretching or generate_images.
- If an asset in the original screenshot is not extractable (for example, occluded by other objects or is the background), when available, use generate_images to create image URLs from prompts (you may pass multiple prompts).

- ${imagePolicy}

## Multiple screenshots

If multiple screenshots are provided, organize them meaningfully:

- If they appear to be different pages in a website, make them distinct pages and link them.
- If they look like different tabs or views in an app, connect them with appropriate navigation.
- If they appear unrelated, create a scaffold that separates them into "Screenshot 1", "Screenshot 2", "Screenshot 3", etc. so it is easy to navigate.
- For mobile screenshots, do not include the device frame or browser chrome; focus only on the actual UI mockups.
`;

  if (textPrompt.trim()) {
    userPrompt = `${userPrompt}\n\nAdditional instructions: ${textPrompt}`;
  }

  const userContent: any[] = [];
  for (const url of imageDataUrls) {
    userContent.push({
      type: "image",
      image: url,
    });
  }
  userContent.push({
    type: "text",
    text: userPrompt,
  });

  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: userContent,
    },
  ];
}
