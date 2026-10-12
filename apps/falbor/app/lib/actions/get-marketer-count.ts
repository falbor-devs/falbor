"use server";

import { db } from "~/lib/db";
import { marketerProfiles } from "~/lib/db/schema";
import { sql } from "drizzle-orm";

export async function getMarketerCount() {
  try {
    const result = await db.select({ count: sql<number>`count(*)` }).from(marketerProfiles);
    return Number(result[0]?.count || 0);
  } catch (e) {
    console.error("Failed to get marketer count:", e);
    return 0;
  }
}
