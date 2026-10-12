import { CoreMessage } from "ai";
import { PromptHistoryMessage } from "./prompt_types";

function wrapAssistantFileContent(content: string, path: string = "index.html"): string {
  const stripped = content.trim();
  if (stripped.startsWith("<file ") && stripped.endsWith("</file>")) {
    return stripped;
  }
  return `<file path="${path}">\n${stripped}\n</file>`;
}

export function buildHistoryMessage(item: PromptHistoryMessage): CoreMessage {
  const role = item.role;
  const imageUrls = item.images || [];
  const videoUrls = item.videos || [];
  const mediaUrls = [...imageUrls, ...videoUrls];

  if (role === "user" && mediaUrls.length > 0) {
    const userContent: any[] = [];
    for (const url of mediaUrls) {
      userContent.push({
        type: "image",
        image: url,
      });
    }
    userContent.push({
      type: "text",
      text: item.text || "",
    });
    return {
      role,
      content: userContent,
    };
  }

  return {
    role,
    content: role === "assistant" ? wrapAssistantFileContent(item.text || "") : (item.text || ""),
  } as CoreMessage;
}
