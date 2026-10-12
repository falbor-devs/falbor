import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

async function main() {
  try {
    const openai = createOpenAI({ apiKey: "sk-proj-invalid" });
    const result = await streamText({
      model: openai("gpt-5.6-luna"),
      messages: [{ role: "user", content: "hello" }],
      providerOptions: {
        openai: { reasoningEffort: "none" },
      }
    });

    console.log("Stream initiated successfully");
    for await (const chunk of result.fullStream) {
      console.log("Chunk:", chunk);
    }
    console.log("Stream finished");
  } catch (err) {
    console.error("Error caught:", err);
  }
}

main();
