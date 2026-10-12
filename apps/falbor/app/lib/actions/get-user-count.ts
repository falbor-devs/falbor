"use server";

import { db } from "~/lib/db";
import { users } from "~/lib/db/schema";
import { sql } from "drizzle-orm";

export async function getUserCount() {
  try {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result[0]?.count || 0);
  } catch (e) {
    console.error("Failed to get user count:", e);
    return 0;
  }
}
