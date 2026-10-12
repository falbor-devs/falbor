export async function POST() {
  const isProduction = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  const cookieFlags = isProduction
    ? `HttpOnly; Secure; Path=/; SameSite=None; Max-Age=0; Expires=${new Date(0).toUTCString()}`
    : `HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Expires=${new Date(0).toUTCString()}`;

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `session=; ${cookieFlags}`,
    },
  });
}