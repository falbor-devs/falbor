import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai'; // using openai for the backend processing, can be configured
import { z } from 'zod';
import { OPERATOR_SYSTEM_PROMPT } from '../../lib/operator/prompts';

export async function POST(req: Request) {
  try {
    const { context, message } = await req.json();

    const result = await generateObject({
      model: openai('gpt-5.6-luna', {
        reasoningEffort: 'none' as any, // Fix reasoning_effort error on custom proxy
      }),
      system: OPERATOR_SYSTEM_PROMPT,
      schema: z.object({
        message: z.string(),
        actions: z.array(z.object({
          type: z.enum([
            'SAY_MESSAGE',
            'ASK_USER',
            'WRITE_BUILDER_PROMPT',
            'SUBMIT_BUILDER_PROMPT',
            'OPEN_PAGE',
            'OPEN_SETTINGS',
            'OPEN_RESEARCH',
            'OPEN_PREVIEW',
            'READ_CURRENT_ERRORS',
            'SEND_FIX_PROMPT',
            'HIGHLIGHT_ELEMENT',
            'WAIT_FOR_BUILDER',
            'UPDATE_OPERATOR_MEMORY',
            'SWITCH_SETTINGS_TAB',
            'SWITCH_MODEL',
            'SWITCH_CHAT_MODE',
            'SIMULATE_CLICK'
          ]),
          payload: z.record(z.any()).optional(),
        }))
      }),
      prompt: `Operator Context:\n${JSON.stringify(context)}\n\nUser Message: ${message}`,
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error('Operator API Error:', error);
    return NextResponse.json({ error: 'Failed to process operator request' }, { status: 500 });
  }
}
