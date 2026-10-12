import { Stack } from "./prompt_types";

export function buildSelectedStackPolicy(stack: Stack): string {
  return `Selected stack: ${stack}.`;
}

export function buildUserImagePolicy(imageGenerationEnabled: boolean): string {
  if (imageGenerationEnabled) {
    return "Image generation is enabled for this request. Use generate_images for missing assets when needed.";
  }
  return "Image generation is disabled for this request. Do not call generate_images. Use provided media, CSS effects, or placeholder URLs (https://placehold.co).";
}
