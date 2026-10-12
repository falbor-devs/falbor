import { db } from "~/lib/db";
import { users, workspaces } from "~/lib/db/schema";
import { v4 } from "uuid";
import { hashPassword } from "~/lib/auth";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { email, password, role } = (await request.json()) as {
      email: string;
      password: string;
      role?: string;
    };

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({
          error: "Password must be at least 6 characters",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      if (!existingUser[0].passwordHash) {
        return new Response(
          JSON.stringify({
            error:
              "This email is associated with a Google account. Please sign in with Google.",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "An account with this email already exists. Please log in.",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const passwordHash = await hashPassword(password);

    const baseUsername = email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const uniqueUsername = `${baseUsername}${Math.floor(
      Math.random() * 10000
    )}`;

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        username: uniqueUsername,
        displayName: email.split("@")[0],
        isVerified: false,
        verificationCode,
        role: role === "marketer" ? "marketer" : "SUBACCOUNT_USER",
      })
      .returning();

    // Create a default workspace for the new user if they are not a marketer
    if (role !== "marketer") {
      await db.insert(workspaces).values({
        id: v4(),
        userId: user.id,
        name: "Untitled Workspace",
      });
    }

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
          from: "Falbor <noreply@falbor.xyz>",
          to: email,
          subject: "Verify your Falbor account",
          html: `
            <div style="font-family:sans-serif;padding:20px;max-width:600px;margin:0 auto;border:1px solid #eaeaea;border-radius:8px;">
              <h2 style="color:#6b21a8;text-align:center;">
                Verify your Email
              </h2>

              <p>
                Thank you for signing up for Falbor!
                Please use the following 6-digit verification code:
              </p>

              <div style="font-size:32px;font-weight:bold;text-align:center;letter-spacing:4px;padding:15px 0;color:#111;">
                ${verificationCode}
              </div>

              <p style="color:#666;font-size:14px;">
                If you did not request this, please ignore this email.
              </p>
            </div>
          `,
        });

        if (error) {
          console.error("Resend error:", error);
        } else {
          console.log("Email sent:", data);
        }
      } catch (err) {
        console.error("Failed to send verification email:", err);
      }
    }

    console.log(
      `[EMAIL VERIFICATION] Generated code for ${email}: ${verificationCode}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        requiresVerification: true,
        email: user.email,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Registration error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}