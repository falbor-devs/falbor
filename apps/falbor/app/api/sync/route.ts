import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import {
  userPreferences,
  providerSettings,
  serviceConnections,
  mcpSettings as mcpSettingsTable,
  tabConfigurations,
  eventLogs,
  gitCredentials,
} from "~/lib/db/schema";
import { getUserId } from "~/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  try {
    if (key) {
      const [pref] = await db
        .select()
        .from(userPreferences)
        .where(and(eq(userPreferences.userId, userId), eq(userPreferences.key, key)))
        .limit(1);

      return NextResponse.json({ key, value: pref?.value ?? null });
    }

    const prefs = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    const providers = await db.select().from(providerSettings).where(eq(providerSettings.userId, userId));
    const connections = await db.select().from(serviceConnections).where(eq(serviceConnections.userId, userId));
    const [mcp] = await db.select().from(mcpSettingsTable).where(eq(mcpSettingsTable.userId, userId)).limit(1);
    const [tabConfig] = await db.select().from(tabConfigurations).where(eq(tabConfigurations.userId, userId)).limit(1);
    const logs = await db.select().from(eventLogs).where(eq(eventLogs.userId, userId)).limit(100);
    const creds = await db.select().from(gitCredentials).where(eq(gitCredentials.userId, userId));

    const response: Record<string, any> = {};

    for (const pref of prefs) {
      response[pref.key] = pref.value;
    }

    response.__providers = providers;
    response.__connections = connections;
    response.__mcp = mcp ?? null;
    response.__tabConfig = tabConfig ?? null;
    response.__eventLogs = logs;
    response.__gitCredentials = creds;

    return NextResponse.json(response);
  } catch (error) {
    console.error("Sync GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { key, value } = (await request.json()) as { key: string; value: any };

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(and(eq(userPreferences.userId, userId), eq(userPreferences.key, key)))
      .limit(1);

    if (existing) {
      await db
        .update(userPreferences)
        .set({ value, updatedAt: new Date() })
        .where(eq(userPreferences.id, existing.id));
    } else {
      await db.insert(userPreferences).values({ userId, key, value });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      await db
        .delete(userPreferences)
        .where(and(eq(userPreferences.userId, userId), eq(userPreferences.key, key)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
