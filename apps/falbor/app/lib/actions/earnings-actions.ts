"use server";

import { db } from "~/lib/db";
import { marketerEarnings, payoutRequests } from "~/lib/db/schema";
import { eq, sum, count, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { verifyToken } from "~/lib/auth";

export async function processProductPayment(data: {
  marketerUserId: string;
  productName: string;
  amount: number;
  transactionId: string;
}) {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) return { success: false, error: "Unauthorized" };

    const [record] = await db
      .insert(marketerEarnings)
      .values({
        marketerUserId: data.marketerUserId,
        payerUserId: payload.userId,
        productName: data.productName,
        amount: Math.round(data.amount),
        transactionId: data.transactionId,
        status: "completed",
      })
      .returning();

    return { success: true, record };
  } catch (e) {
    console.error("Failed to process product payment:", e);
    return { success: false, error: "Failed to record payment" };
  }
}

export async function getMarketerEarningsStats(marketerUserId?: string, year?: number, month?: number) {
  try {
    let targetUserId = marketerUserId;
    if (!targetUserId) {
      const token = cookies().get("session")?.value;
      const payload = token ? await verifyToken(token) : null;
      if (!payload?.userId) return { totalEarnings: 0, availableBalance: 0, totalSales: 0, transactions: [], payouts: [] };
      targetUserId = payload.userId;
    }

    const allTransactions = await db
      .select()
      .from(marketerEarnings)
      .where(eq(marketerEarnings.marketerUserId, targetUserId))
      .orderBy(desc(marketerEarnings.createdAt));

    const payouts = await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.marketerUserId, targetUserId))
      .orderBy(desc(payoutRequests.createdAt));

    // Filter transactions by period if year and month are provided
    const transactions = allTransactions.filter((tx) => {
      if (year === undefined || month === undefined) return true;
      const txDate = new Date(tx.createdAt);
      return txDate.getFullYear() === year && txDate.getMonth() === month;
    });

    const totalEarnings = transactions.reduce((acc, curr) => acc + curr.amount, 0);
    const lifetimeEarnings = allTransactions.reduce((acc, curr) => acc + curr.amount, 0);
    const totalWithdrawn = payouts
      .filter((p) => p.status === 'completed' || p.status === 'pending')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      totalEarnings,
      availableBalance: Math.max(0, lifetimeEarnings - totalWithdrawn),
      totalSales: transactions.length,
      transactions,
      payouts,
    };
  } catch (e) {
    console.error("Failed to fetch earnings stats:", e);
    return { totalEarnings: 0, availableBalance: 0, totalSales: 0, transactions: [], payouts: [] };
  }
}

export async function requestPayout(paypalEmail: string, amount: number) {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) return { success: false, error: "Unauthorized" };

    const stats = await getMarketerEarningsStats(payload.userId);
    if (amount > stats.availableBalance) {
      return { success: false, error: "Insufficient available balance" };
    }

    const [request] = await db
      .insert(payoutRequests)
      .values({
        marketerUserId: payload.userId,
        paypalEmail: paypalEmail.trim(),
        amount: Math.round(amount),
        status: "pending",
      })
      .returning();

    return { success: true, request };
  } catch (e) {
    console.error("Failed to request payout:", e);
    return { success: false, error: "Payout request failed" };
  }
}
