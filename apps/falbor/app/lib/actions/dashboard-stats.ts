"use server";

import { db } from "~/lib/db";
import { communityMessages, marketerProducts, marketerEarnings } from "~/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { cookies } from "next/headers";
import { verifyToken } from "~/lib/auth";

export async function getDashboardStats() {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) {
      return { totalMessages: 0, newMessages: 0, totalProducts: 0, totalSales: 0 };
    }

    const userId = payload.userId;

    // Messages sent TO this user (received)
    const [recvCount] = await db
      .select({ value: count() })
      .from(communityMessages)
      .where(eq(communityMessages.receiverId, userId));

    // Messages sent BY this user (sent)
    const [sentCount] = await db
      .select({ value: count() })
      .from(communityMessages)
      .where(eq(communityMessages.senderId, userId));

    // Total products created by user
    const [prodCount] = await db
      .select({ value: count() })
      .from(marketerProducts)
      .where(eq(marketerProducts.userId, userId));

    // Total sales completed by user
    const [salesCount] = await db
      .select({ value: count() })
      .from(marketerEarnings)
      .where(eq(marketerEarnings.marketerUserId, userId));

    return {
      totalMessages: (sentCount?.value || 0) + (recvCount?.value || 0),
      newMessages: recvCount?.value || 0,
      totalProducts: prodCount?.value || 0,
      totalSales: salesCount?.value || 0,
    };
  } catch (e) {
    console.error("Failed to fetch dashboard stats:", e);
    return { totalMessages: 0, newMessages: 0, totalProducts: 0, totalSales: 0 };
  }
}
