"use server";

import { db } from "~/lib/db";
import { marketerProducts, marketerProfiles } from "~/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { verifyToken } from "~/lib/auth";

export async function getMarketerProducts(userId?: string) {
  try {
    let targetUserId = userId;

    if (!targetUserId) {
      const token = cookies().get("session")?.value;
      const payload = token ? await verifyToken(token) : null;
      if (!payload?.userId) return [];
      targetUserId = payload.userId;
    }

    const products = await db
      .select()
      .from(marketerProducts)
      .where(eq(marketerProducts.userId, targetUserId));

    return products;
  } catch (e) {
    console.error("Failed to fetch marketer products:", e);
    return [];
  }
}

export async function createMarketerProduct(data: {
  name: string;
  service: string;
  price: number;
  originalPrice?: number | null;
  portfolioImages?: string[];
}) {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) return { error: "Unauthorized" };

    const existing = await db
      .select()
      .from(marketerProducts)
      .where(eq(marketerProducts.userId, payload.userId));

    if (existing.length >= 3) {
      return { error: "You can create up to 3 products maximum." };
    }

    const [product] = await db
      .insert(marketerProducts)
      .values({
        userId: payload.userId,
        name: data.name.trim(),
        service: data.service.trim(),
        price: Number(data.price),
        originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
        portfolioImages: data.portfolioImages || [],
      })
      .returning();

    return { success: true, product };
  } catch (e) {
    console.error("Failed to create marketer product:", e);
    return { error: "Failed to create product" };
  }
}

export async function getMarketerOnboardingStatus() {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) return { profileComplete: false, productsCount: 0 };

    const [profile] = await db
      .select()
      .from(marketerProfiles)
      .where(eq(marketerProfiles.userId, payload.userId))
      .limit(1);

    const products = await db
      .select()
      .from(marketerProducts)
      .where(eq(marketerProducts.userId, payload.userId));

    const profileComplete = Boolean(profile && profile.fullName && profile.bio && profile.yearsOfExperience);

    return {
      profileComplete,
      productsCount: products.length,
    };
  } catch (e) {
    console.error("Failed to fetch marketer onboarding status:", e);
    return { profileComplete: false, productsCount: 0 };
  }
}
