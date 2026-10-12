import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { providerSettings } from "~/lib/db/schema";
import { getUserId } from "~/lib/auth";
import { encrypt } from "~/lib/crypto";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const list = await db.select().from(providerSettings).where(eq(providerSettings.userId, userId));
    const masked = list.map((p) => {
      let maskedKey = null;
      if (p.apiKey) {
        // Since we store encrypted key, we must decrypt first to check its length and mask it properly
        // wait! Actually we can decrypt it or just show that it is configured.
        // Wait, decrypting it is safe to do server-side to show a masked view.
        try {
          const { decrypt } = require("~/lib/crypto");
          const decrypted = decrypt(p.apiKey);
          maskedKey = decrypted.length > 8 
            ? decrypted.slice(0, 4) + '...' + decrypted.slice(-4)
            : '••••••••';
        } catch {
          maskedKey = '••••••••';
        }
      }
      return {
        ...p,
        apiKey: maskedKey,
      };
    });
    return NextResponse.json(masked);
  } catch (error) {
    console.error("Provider settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { providerName, apiKey, baseUrl, enabled, settings } = await request.json();

    if (!providerName) {
      return NextResponse.json({ error: "providerName is required" }, { status: 400 });
    }

    const encryptedKey = apiKey ? encrypt(apiKey) : null;

    // Check if exists
    const [existing] = await db
      .select()
      .from(providerSettings)
      .where(and(eq(providerSettings.userId, userId), eq(providerSettings.providerName, providerName)))
      .limit(1);

    if (existing) {
      const updateData: any = {
        updatedAt: new Date(),
      };
      if (apiKey !== undefined) updateData.apiKey = encryptedKey;
      if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
      if (enabled !== undefined) updateData.enabled = enabled;
      if (settings !== undefined) updateData.settings = settings;

      await db
        .update(providerSettings)
        .set(updateData)
        .where(eq(providerSettings.id, existing.id));
    } else {
      await db.insert(providerSettings).values({
        userId,
        providerName,
        apiKey: encryptedKey,
        baseUrl: baseUrl || null,
        enabled: enabled ?? true,
        settings: settings || {},
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Provider settings POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
