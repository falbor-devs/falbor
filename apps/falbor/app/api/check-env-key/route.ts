import { NextResponse } from "next/server";
import { LLMManager } from "~/lib/modules/llm/manager";
import { getUserId } from "~/lib/auth";
import { db } from "~/lib/db";
import { providerSettings as providerSettingsTable } from "~/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const context = { cloudflare: { env: process.env as Record<string, string> } };
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');

  if (!provider) {
    return Response.json({ isSet: false });
  }

  const userId = await getUserId(request as any);
  let isSetInDb = false;

  if (userId) {
    try {
      const [setting] = await db
        .select()
        .from(providerSettingsTable)
        .where(and(eq(providerSettingsTable.userId, userId), eq(providerSettingsTable.providerName, provider)))
        .limit(1);

      if (setting && setting.apiKey) {
        isSetInDb = true;
      }
    } catch (err) {
      console.error("Error checking DB for provider key:", err);
    }
  }

  const llmManager = LLMManager.getInstance(context?.cloudflare?.env as any);
  const providerInstance = llmManager.getProvider(provider);

  if (!providerInstance || !providerInstance.config.apiTokenKey) {
    return Response.json({ isSet: isSetInDb });
  }

  const envVarName = providerInstance.config.apiTokenKey;

  const isSet = !!(
    isSetInDb ||
    (context?.cloudflare?.env as Record<string, any>)?.[envVarName] ||
    process.env[envVarName] ||
    llmManager.env[envVarName]
  );

  return Response.json({ isSet });
}

