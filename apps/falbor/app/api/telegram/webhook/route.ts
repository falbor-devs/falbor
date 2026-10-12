import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { agentSessions } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is missing in .env');
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  return NextResponse.json(
    { status: 'ok', service: 'Falbor Telegram Webhook Service' },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('🤖 Telegram Webhook POST received:', JSON.stringify(body, null, 2));

    const message = body?.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // Ignore old backlog messages sent before 2 minutes ago
    const messageTime = message.date ? message.date * 1000 : Date.now();
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    if (messageTime < twoMinutesAgo) {
      console.log(`⏩ Skipping old queued Telegram message (${message.text}) from ${new Date(messageTime).toLocaleTimeString()}`);
      return NextResponse.json({ ok: true }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const telegramChatId = message.chat.id;
    const text = message.text.trim();

    // 1. Try to find session by linked telegram agentId
    let [session] = await db
      .select()
      .from(agentSessions)
      .where(eq(agentSessions.agentId, `telegram_${telegramChatId}`));

    // 2. If start command with explicit sessionId parameter
    if (!session && text.startsWith('/start')) {
      const parts = text.split(' ');
      const explicitSessionId = parts.length > 1 ? parts[1].trim() : null;
      if (explicitSessionId && explicitSessionId.length > 5) {
        const [found] = await db.select().from(agentSessions).where(eq(agentSessions.id, explicitSessionId));
        if (found) {
          session = found;
        }
      }
    }

    // 3. Fallback: If still no session linked, pick latest session from DB
    if (!session) {
      const allSessions = await db.select().from(agentSessions);
      if (allSessions.length > 0) {
        session = allSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      }
    }

    if (!session) {
      await sendTelegramMessage(
        telegramChatId,
        '⚠️ No active chat session found. Please open Falbor in your browser first.'
      );
      return NextResponse.json({ ok: true }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // Ensure session is linked to this telegramChatId
    const sessionId = session.id;
    if (session.agentId !== `telegram_${telegramChatId}`) {
      await db
        .update(agentSessions)
        .set({ agentId: `telegram_${telegramChatId}` })
        .where(eq(agentSessions.id, sessionId));
    }

    const existingEvents = Array.isArray(session.events) ? [...session.events] : [];

    const userEvent = {
      id: `${Date.now()}-user-tg`,
      type: 'user',
      title: text,
      status: 'completed',
    };
    existingEvents.push(userEvent);

    await db
      .update(agentSessions)
      .set({ events: existingEvents, updatedAt: new Date() })
      .where(eq(agentSessions.id, sessionId));

    let aiResponseText = '';
    try {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        const openai = createOpenAI({ apiKey: openaiKey });

        // Build full conversation and context from all events in the web session
        const conversationHistory = existingEvents
          .map((e: any) => {
            if (e.type === 'user') {
              return { role: 'user' as const, content: e.title || '' };
            }
            if (e.type === 'chat') {
              return { role: 'assistant' as const, content: e.title || '' };
            }
            // Include details/context from thinking, planning, and web analysis events
            if (e.details && Array.isArray(e.details) && e.details.length > 0) {
              return { role: 'system' as const, content: `[Context ${e.type}]: ${e.title} - ${e.details.join(' ')}` };
            }
            return null;
          })
          .filter(Boolean) as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

        const sessionTitle = session.title || 'Connected Product';
        const systemPrompt = `You are Falbor AI Agent connected to the user's active session: "${sessionTitle}". 
You have full access to all session history, web chat context, user inputs, and project details in this session. 
Help the user analyze, answer questions about, and build their product directly through Telegram.
Provide concise, direct, helpful answers. Do not include raw markdown headers or JSON blocks.`;

        const { text: generatedText } = await generateText({
          model: openai('gpt-4o'),
          system: systemPrompt,
          messages: conversationHistory.length > 0 ? conversationHistory : [{ role: 'user', content: text }],
        });
        aiResponseText = generatedText;
      } else {
        aiResponseText = `Received your message: "${text}".`;
      }
    } catch (err: any) {
      console.error('Error generating Telegram AI response:', err);
      aiResponseText = `Processed your message: "${text}".`;
    }

    let cleanReply = aiResponseText
      .replace(/status\(\s*"[^"]*"\s*\)/gi, '')
      .replace(/button\(\s*"[^"]*"\s*\)/gi, '')
      .replace(/progress\(\s*\d+\s*\)/gi, '')
      .replace(/QUESTION:\s*"[^"]*"/gi, '')
      .replace(/OPTIONS:\s*\[[\s\S]*?\]/gi, '')
      .trim();

    const botEvent = {
      id: `${Date.now()}-bot-tg`,
      type: 'chat',
      title: cleanReply,
      status: 'completed',
    };
    existingEvents.push(botEvent);

    await db
      .update(agentSessions)
      .set({ events: existingEvents, updatedAt: new Date() })
      .where(eq(agentSessions.id, sessionId));

    await sendTelegramMessage(telegramChatId, cleanReply);

    return NextResponse.json({ ok: true }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
