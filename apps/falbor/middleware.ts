import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null;
const COOKIE_NAME = "session";

const PUBLIC_ROUTES = [
  "/api/test-tomba",
  "/login",
  "/signup",
  "/reset-password",
  "/verified",
  "/privacy",
  "/terms",
  "/about",
  "/templates",
  "/builder",
  "/pricing",
  "/enterprise",
  "/blog",
  "/marketers",
  "/api/enterprise",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify",
  "/api/auth/reset-password/send-code",
  "/api/auth/reset-password/verify-code",
  "/api/auth/reset-password/reset",
  "/api/auth/logout",
  "/api/health",
  "/api/telegram/webhook",
  "/api/auth/google",
  "/api/auth/discord",
  "/api/auth/discord/callback",
  "/api/auth/gmail",
  "/api/auth/gmail/callback",
  "/api/auth/slack",
  "/api/auth/slack/callback",
  "/api/auth/miro",
  "/api/auth/miro/callback",
  "/api/auth/stripe",
  "/api/auth/stripe/callback",
  "/visual-editor/api/stripe/webhook",
  "/api/cron/daily",
  "/api/cron/agents",
  "/api/cron/automation",
  "/docs"
];

const STATIC_PREFIXES = ["/_next", "/favicon", "/icons", "/logo", "/apple-touch-icon", "/social_preview", "/landing"];

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const hostname = request.headers.get("host") || "";
    const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");

    let subdomain: string | null = null;
    const parts = hostname.split('.');
    if (isLocalhost) {
      if (parts.length > 1) {
        const sub = parts[0];
        if (sub !== 'localhost' && sub !== '127') {
          subdomain = sub;
        }
      }
    } else {
      // Do not treat ngrok/trycloudflare or /api routes as tenant subdomains
      const isTunnel = hostname.includes("ngrok") || hostname.includes("trycloudflare");
      const isVercelHost = hostname.endsWith(".vercel.app") && parts.length <= 3;
      if (!isVercelHost && !isTunnel && !pathname.startsWith('/api/') && parts.length >= 3) {
        const sub = parts[0];
        if (sub !== 'www' && sub !== 'hacking' && sub !== 'docs' && sub !== 'api') {
          subdomain = sub;
        }
      }
    }

    if (subdomain) {
      if (pathname.startsWith('/api/site/')) {
        return NextResponse.next();
      }
      return NextResponse.rewrite(new URL(`/api/site/${subdomain}${pathname}`, request.url));
    }

    const isPublicRoute = (path: string) => {
      return (
        PUBLIC_ROUTES.some((r) => path === r) ||
        path.startsWith("/blog/") ||
        path.startsWith("/reset-password") ||
        path.startsWith("/api/auth/reset-password") ||
        path === "/templates" ||
        path.startsWith("/templates/") ||
        path === "/api/templates" ||
        path.startsWith("/api/templates/") ||
        path.startsWith("/marketers") ||
        path.startsWith("/b2b/") ||
        path.startsWith("/docs") ||
        path.startsWith("/api/automation/extension/")
      );
    };

    const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|eot|pdf)$/i;

    if (
      STATIC_EXTENSIONS.test(pathname) ||
      isPublicRoute(pathname) ||
      STATIC_PREFIXES.some((p) => pathname.startsWith(p))
    ) {
      return NextResponse.next();
    }

    if (!isLocalhost && pathname.startsWith("/hacking")) {
      const newUrl = new URL(request.url);
      newUrl.hostname = "hacking.falbor.xyz";
      newUrl.pathname = pathname.replace(/^\/hacking/, "") || "/";
      return NextResponse.redirect(newUrl);
    }
    if (pathname.startsWith('/site/')) {
      return NextResponse.rewrite(new URL(`${pathname === '/site/' ? pathname : pathname.replace(/\/$/, '')}/index.html`, request.url));
    }

    if (pathname === "/api/auth/me") {
    }

    const sessionCookie = request.cookies.get(COOKIE_NAME);
    const isApiRoute = pathname.startsWith("/api/") || pathname.includes("/api/");
    if (isApiRoute && !isPublicRoute(pathname)) {
      if (!sessionCookie) {
        return unauthorized();
      }

      // A missing signing secret must never turn authentication off.
      if (!JWT_SECRET) return unauthorized("Authentication unavailable");
      try {
        await jwtVerify(sessionCookie.value, JWT_SECRET);
      } catch {
        return unauthorized("Unauthorized: Invalid session");
      }
    }

    const handleSuccess = () => {
      const hostname = request.headers.get("host") || "";
      const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");

      if (!isLocalhost && (hostname === "docs.falbor.xyz" || hostname.startsWith("docs."))) {
        const rewritePath = pathname === "/" ? "/docs" : (pathname.startsWith("/docs") ? pathname : `/docs${pathname}`);
        return NextResponse.rewrite(new URL(rewritePath, request.url));
      }

      if (!isLocalhost && hostname === "hacking.falbor.xyz") {
        const rewritePath = pathname === "/" ? "/hacking" : `/hacking${pathname}`;
        return NextResponse.rewrite(new URL(rewritePath, request.url));
      }
      return NextResponse.next();
    };

    if (!sessionCookie) {
      if (pathname === "/" || pathname.startsWith("/chat/") || pathname.startsWith("/analyzed/") || pathname.startsWith("/docs") || isPublicRoute(pathname)) {
        return handleSuccess();
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (JWT_SECRET) {
      try {
        const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
        
        if (payload.role === "marketer" && pathname.startsWith("/workspace/")) {
           return NextResponse.redirect(new URL("/b2b", request.url));
        }

        if (payload.role !== "marketer" && pathname.startsWith("/b2b/")) {
           return NextResponse.redirect(new URL("/", request.url));
        }

        return handleSuccess();
      } catch {
      }
    }

    if (pathname === "/" || pathname.startsWith("/chat/") || pathname.startsWith("/analyzed/") || pathname.startsWith("/docs") || isPublicRoute(pathname)) {
      return handleSuccess();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  } catch {
    // Default deny for API routes if authentication middleware itself fails.
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
