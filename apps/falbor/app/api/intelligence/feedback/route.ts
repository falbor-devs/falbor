import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { agentMessageFeedback } from '~/lib/db/schema';

export async function POST(req: Request) {
  try {
    const { messageId, workspaceId, rating, feedbackText } = await req.json();

    if (!messageId || !rating) {
      return NextResponse.json(
        { error: 'messageId and rating are required' },
        { status: 400 }
      );
    }

    await db.insert(agentMessageFeedback).values({
      messageId,
      workspaceId: workspaceId || null,
      rating,
      feedbackText: feedbackText || null,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Feedback API Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record feedback' },
      { status: 500 }
    );
  }
}
