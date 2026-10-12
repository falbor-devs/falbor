import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { users, memories } from '~/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export const maxDuration = 60; // Extend duration for Next.js serverless functions

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, frames, testOnly } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return NextResponse.json({ error: 'OpenAI API Key is missing or invalid in the .env file.' }, { status: 500 });
    }

    if (testOnly) {
      const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });

      if (!testResponse.ok) {
        const err = await testResponse.json();
        return NextResponse.json({ error: err.error?.message || 'API key invalid or out of quota' }, { status: testResponse.status });
      }
      return NextResponse.json({ success: true });
    }

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json({ error: 'No frames provided' }, { status: 400 });
    }

    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    // Check balance
    const userRows = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
    if (userRows.length === 0 || userRows[0].balance < 5) {
      return NextResponse.json({ error: 'Insufficient credits. Please top up your balance.' }, { status: 402 });
    }

    // Construct OpenAI vision payload
    const content: any[] = [{ type: 'text', text: prompt || 'Analyze this screen recording.' }];

    // Add frames (cap at 100 to prevent payload limits)
    const maxFrames = Math.min(frames.length, 100);
    for (let i = 0; i < maxFrames; i++) {
      content.push({
        type: 'image_url',
        image_url: {
          url: frames[i], // Expecting base64 data URI: data:image/jpeg;base64,...
          detail: 'low',
        },
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('OpenAI API Error:', err);
      return NextResponse.json({ error: err.error?.message || 'Failed to call OpenAI' }, { status: response.status });
    }

    const data = await response.json();

    // Billing
    if (data.usage) {
      const inputTokens = data.usage.prompt_tokens || 0;
      const outputTokens = data.usage.completion_tokens || 0;

      // Calculate cost in cents with markup
      // e.g., GPT-4o cost: $5 / 1M input, $15 / 1M output = 0.0005 cents / input, 0.0015 cents / output
      // With markup (x4) = 0.002 cents/input, 0.006 cents/output
      const costCents = Math.ceil((inputTokens * 0.002) + (outputTokens * 0.006));
      if (costCents > 0) {
        await db.update(users).set({ balance: sql`${users.balance} - ${costCents}` }).where(eq(users.id, userId));
      }
    }

    const rawContent = data.choices[0]?.message?.content;
    let parsed: { prompt?: string; memory?: string } = {};

    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      // Fallback if AI fails to return JSON
      parsed = { prompt: rawContent };
    }

    if (parsed.memory && parsed.memory.trim().length > 5) {
      await db.insert(memories).values({
        userId,
        content: parsed.memory.trim(),
      });
    }

    return NextResponse.json({ generated_prompt: parsed.prompt || rawContent });
  } catch (error: any) {
    console.error('Error analyzing screen:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}