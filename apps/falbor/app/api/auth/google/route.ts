import { db } from "~/lib/db";
import { users, workspaces } from "~/lib/db/schema";
import { v4 } from "uuid";
import { createToken, SESSION_DURATION_DAYS } from "~/lib/auth";
import { eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    let credential = "";
    let accessToken = "";
    let role = "";
    let isFormData = false;

    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { credential?: string; accessToken?: string; role?: string };
      credential = body.credential || "";
      accessToken = body.accessToken || "";
      role = body.role || "";
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      credential = formData.get("credential")?.toString() || "";
      accessToken = formData.get("accessToken")?.toString() || "";
      role = formData.get("role")?.toString() || "";
      isFormData = true;
    }

    if (!role) {
      const url = new URL(request.url);
      role = url.searchParams.get("role") || "";
    }

    if (!credential && !accessToken) {
      return new Response(JSON.stringify({ error: "No credentials provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let payload: any = null;

    if (accessToken) {
      // Fetch user profile using access token (Implicit flow from custom button)
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Invalid Google access token" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      payload = await res.json();
    } else {
      // Verify the Google ID token (Redirect flow from official button)
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: [
          process.env.GOOGLE_CLIENT_ID || "",
          process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        ].filter(Boolean), 
      });
      payload = ticket.getPayload();
    }

    if (!payload || !payload.email) {
      return new Response(JSON.stringify({ error: "Invalid Google token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email, name, picture } = payload;

    // Check if user exists
    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      // Create new user if they don't exist
      const baseUsername = (name || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueUsername = `${baseUsername}${Math.floor(Math.random() * 10000)}`;

      const [newUser] = await db.insert(users).values({
        email,
        username: uniqueUsername,
        displayName: name || email.split("@")[0],
        avatarUrl: picture || null,
        role: role === "marketer" ? "marketer" : "SUBACCOUNT_USER",
      }).returning();
      
      user = newUser;

      // Create a default workspace for the new user if they are not a marketer
      if (role !== "marketer") {
        await db.insert(workspaces).values({
          id: v4(),
          userId: user.id,
          name: "Untitled Workspace",
        });
      }
    } else if (user.passwordHash) {
      // User exists but has a password (they signed up with email/password)
      return new Response(JSON.stringify({ error: "This email is registered with a password. Please log in with your email and password." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate session token
    const token = await createToken(user.id, user.role || undefined);
    const maxAge = SESSION_DURATION_DAYS * 24 * 60 * 60;
    const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
    const isProduction = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

    const cookieFlags = isProduction
      ? `HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${maxAge}; Expires=${expires}`
      : `HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}; Expires=${expires}`;

    const cookieString = `session=${token}; ${cookieFlags}`;

    if (isFormData) {
      // If it was a form post (Google redirect flow), redirect the browser to home
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/",
          "Set-Cookie": cookieString,
        },
      });
    }

    // Otherwise (JSON API call like One Tap), return JSON
    const body = JSON.stringify({
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieString,
      },
    });
  } catch (error: any) {
    console.error("Google Login error:", error);
    
    // Return the actual error message for debugging
    return new Response(JSON.stringify({ 
      error: "Internal server error during Google Login",
      details: error?.message || String(error)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
