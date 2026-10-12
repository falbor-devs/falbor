import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

const SYSTEM_PROMPT = `You are a coding agent that's an expert at building front-ends.

Your goal is to generate a SINGLE complete HTML file that implements the UI described by the user.
The output must be ONLY valid HTML — no markdown, no explanation, no code fences.
The file must be self-contained (inline CSS and JS, CDN links allowed).

Code quality rules:
- Use Tailwind CSS via CDN for styling (https://cdn.tailwindcss.com)
- Make the UI look beautiful, modern, and polished
- Add smooth hover effects and transitions
- Make it responsive
- For placeholder images use https://picsum.photos/

Output ONLY the raw HTML. Start with <!DOCTYPE html> and end with </html>.
Do not wrap in markdown code fences. Do not explain anything before or after the HTML.`;

export async function POST(request: Request) {
  const { prompt, imageDataUrl, stack } = await request.json();

  if (!prompt) {
    return new Response('Missing prompt', { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 });
  }

  const anthropic = createAnthropic({
    apiKey,
    headers: { 'anthropic-beta': 'output-128k-2025-02-19' },
  });

  type TextPart = { type: 'text'; text: string };
  type ImagePart = { type: 'image'; image: URL | string; mimeType?: string };
  const userContent: (TextPart | ImagePart)[] = [];

  if (imageDataUrl) {
    const [, base64Data] = imageDataUrl.split(',');
    const mimeType = imageDataUrl.match(/data:([^;]+)/)?.[1] || 'image/png';
    userContent.push({
      type: 'image',
      image: base64Data,
      mimeType,
    });
    userContent.push({
      type: 'text',
      text: `Build a UI that looks like this screenshot. Additional instructions: ${prompt}`,
    });
  } else {
    userContent.push({ type: 'text', text: prompt });
  }

  const result = await streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
    maxTokens: 8096,
  });

  return result.toTextStreamResponse();
}
