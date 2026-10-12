import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "~/lib/db";
import { users } from "~/lib/db/schema";
import { eq } from "drizzle-orm";

const FREEMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "aol.com", "proton.me", "protonmail.com", "zoho.com", "gmx.com", "mail.com",
  "yandex.com", "live.com", "msn.com", "inbox.com"
]);

function isValidWorkEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return false;

  if (FREEMAIL_DOMAINS.has(domain)) return false;

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, workEmail, role, message } = body;

    if (!firstName || !lastName || !workEmail || !role || !message) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (!isValidWorkEmail(workEmail)) {
      return NextResponse.json({
        error: "Please enter a valid company work email address (free personal email providers like Gmail, Yahoo, etc. are not accepted)."
      }, { status: 400 });
    }

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      workEmail: workEmail.trim().toLowerCase(),
      role: role.trim(),
      message: message.trim(),
      submittedAt: new Date().toISOString(),
    };

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, payload.workEmail),
    });

    if (existingUser) {
      await db.update(users)
        .set({ enterpriseContent: payload })
        .where(eq(users.id, existingUser.id));
    } else {
      await db.insert(users).values({
        email: payload.workEmail,
        displayName: `${payload.firstName} ${payload.lastName}`,
        enterpriseContent: payload,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Enterprise submission error:", error);
    return NextResponse.json({ error: "Failed to submit request. Please try again later." }, { status: 500 });
  }
}
