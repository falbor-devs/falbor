"use server";

import { db } from "~/lib/db";
import { pollVotes, communityMessages } from "~/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { verifyToken } from "~/lib/auth";

export async function submitPollVote(messageId: string, optionIndex: number) {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) return { success: false, error: "Unauthorized" };

    // Check existing vote
    const existing = await db
      .select()
      .from(pollVotes)
      .where(
        and(
          eq(pollVotes.messageId, messageId),
          eq(pollVotes.voterId, payload.userId)
        )
      );

    if (existing.length > 0) {
      await db
        .update(pollVotes)
        .set({ optionIndex })
        .where(eq(pollVotes.id, existing[0].id));
    } else {
      await db.insert(pollVotes).values({
        messageId,
        voterId: payload.userId,
        optionIndex,
      });
    }

    return { success: true };
  } catch (e) {
    console.error("Failed to submit poll vote:", e);
    return { success: false };
  }
}

export async function getPollVotes(messageIds: string[]) {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    const currentUserId = payload?.userId || null;

    if (!messageIds || messageIds.length === 0) return {};

    const results: Record<string, { totalVotes: number; votesByOption: Record<number, number>; userVote: number | null }> = {};

    for (const msgId of messageIds) {
      const votes = await db
        .select()
        .from(pollVotes)
        .where(eq(pollVotes.messageId, msgId));

      const votesByOption: Record<number, number> = {};
      let userVote: number | null = null;

      for (const v of votes) {
        votesByOption[v.optionIndex] = (votesByOption[v.optionIndex] || 0) + 1;
        if (currentUserId && v.voterId === currentUserId) {
          userVote = v.optionIndex;
        }
      }

      results[msgId] = {
        totalVotes: votes.length,
        votesByOption,
        userVote,
      };
    }

    return results;
  } catch (e) {
    console.error("Failed to get poll votes:", e);
    return {};
  }
}
