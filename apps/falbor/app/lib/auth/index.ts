import "server-only";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is not defined");
    }
    return new TextEncoder().encode("development-fallback-secret-key-32-chars-min!");
  }
  return new TextEncoder().encode(secret);
}

const COOKIE_NAME = "session";
export const SESSION_DURATION_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: string, role?: string): Promise<string> {
  return new SignJWT({ userId, role: role || "SUBACCOUNT_USER" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .setIssuedAt()
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<{ userId: string; role?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    return null;
  }
}

export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export async function getUserId(request: NextRequest): Promise<string | null> {
  const cookieVal = request.cookies.get(COOKIE_NAME)?.value ?? null;
  if (cookieVal) {
    const payload = await verifyToken(cookieVal);
    if (payload?.userId) return payload.userId;
  }
  const rawCookie = request.headers.get("cookie");
  if (rawCookie) {
    const match = rawCookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (match) {
      const payload = await verifyToken(match[1]);
      if (payload?.userId) return payload.userId;
    }
  }

  return null;
}
export function getTokenFromHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export { COOKIE_NAME };
