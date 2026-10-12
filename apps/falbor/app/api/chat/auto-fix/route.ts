import { NextResponse } from 'next/server';
import { streamText } from '~/lib/.server/llm/stream-text';
import type { IProviderSetting } from '~/types/model';

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const items = cookieHeader.split(';').map((cookie) => cookie.trim());
  items.forEach((item) => {
    const [name, ...rest] = item.split('=');
    if (name && rest) {
      cookies[decodeURIComponent(name.trim())] = decodeURIComponent(rest.join('=').trim());
    }
  });
  return cookies;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { failedCommand, errorOutput } = body;

    if (!failedCommand || !errorOutput) {
      return NextResponse.json({ error: 'failedCommand and errorOutput are required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert developer assistant. 
The user ran a terminal command that failed with an error.
Your ONLY job is to provide the exact shell commands needed to fix the error and/or run the intended action successfully.

Failed command:
\`\`\`bash
${failedCommand}
\`\`\`

Error Output:
\`\`\`
${errorOutput}
\`\`\`

Rules:
1. ONLY output a valid <falborArtifact id="auto-fix" title="Fixing Terminal Error"> tag containing your <falborAction type="shell"> commands.
2. DO NOT output any explanation, markdown formatting outside the tags, or conversational text.
3. Keep the commands concise and direct to fix the issue.
4. Example output:
<falborArtifact id="auto-fix" title="Fixing Terminal Error">
  <falborAction type="shell">
    npm install missing-package
    npm run build
  </falborAction>
</falborArtifact>`;

    const cookieHeader = request.headers.get('cookie');
    const parsedCookies = parseCookies(cookieHeader || '');
    const apiKeys = JSON.parse(parsedCookies.apiKeys || '{}');
    const providerSettings: Record<string, IProviderSetting> = JSON.parse(parsedCookies.providers || '{}');
    const selectedModel = parsedCookies.lastSelectedModel || '';
    const selectedProvider = parsedCookies.lastSelectedProvider || '';
    const messageContent = `[Model: ${selectedModel}]\n[Provider: ${selectedProvider}]\n${systemPrompt}`;

    // We send a single system message using streamText to generate the response
    const result = await streamText({
      messages: [{ role: 'user', content: messageContent }],
      apiKeys,
      providerSettings,
      env: process.env as Record<string, string>,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('Auto-fix API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
