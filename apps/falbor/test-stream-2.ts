import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

async function main() {
  try {
    const openai = createOpenAI({ apiKey: "sk-proj-invalid" });
    const result = await streamText({
      model: openai("gpt-4o"),
      messages: [{ role: "user", content: "hello" }],
      providerOptions: {
        openai: { reasoningEffort: "none" },
      }
    });

    for await (const chunk of result.fullStream) {
      console.log("Chunk:", chunk);
    }
  } catch (err) {
    console.error("Error caught:", err);
  }
}

main();
