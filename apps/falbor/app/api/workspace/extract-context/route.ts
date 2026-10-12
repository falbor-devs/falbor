import { streamText } from 'ai';
import { LLMManager } from '~/lib/modules/llm/manager';
import { readPageContent, webSearch, searchReddit } from '~/lib/services/searchTools';
import { NextResponse } from 'next/server';

// Max duration for the edge/serverless function
export const maxDuration = 300; 

export async function POST(req: Request) {
  try {
    const { url, githubRepo } = await req.json();

    const manager = LLMManager.getInstance(process.env as any);
    const provider = manager.getProvider('OpenAI');
    if (!provider) {
      throw new Error('OpenAI provider not found');
    }
    const model = provider.getModelInstance({
      model: 'gpt-5.6-luna',
      serverEnv: process.env as any,
    });

    const targetInfo = url ? `this URL: ${url}` : githubRepo ? `this GitHub repository: ${githubRepo}` : 'this product';

    const systemPrompt = `You are an expert AI agent designed to extract product context from a website or codebase.
The user has provided ${targetInfo}.

CRITICAL INSTRUCTIONS:
1. Use your tools (readPageContent, webSearch, searchReddit) to actively scan this website, read its content, and search the web (e.g. reddit, news, competitors) to find comprehensive information about this product.
2. DO NOT just guess. You MUST use the tools to find real information.
3. Once you have enough information, generate a rich HTML document exactly structured with the following sections (use <h2> for headers and <p> or <ul>/<li> for paragraphs and lists):

<h2>Product Overview</h2>
<h2>Target Audience</h2>
<h2>Problem & Solution</h2>
<h2>Call to Action</h2>
<h2>Business Model</h2>
<h2>Current Stage</h2>
<h2>Missing Information</h2>

Provide ONLY the raw HTML string for the editor. Do not use Markdown blocks (\`\`\`html) around the response. Do not output anything before or after the HTML.`;

    const result = await streamText({
      model,
      system: systemPrompt,
      prompt: `Please scan the internet and extract context for: ${url || githubRepo || 'the product'}`,
      tools: {
        readPageContent,
        webSearch,
        searchReddit
      },
      maxSteps: 7, // Allow it to call tools multiple times
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('Error extracting context:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
