import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/src/server/middleware/security-headers";
import { checkRateLimit, getRateLimitKey } from "@/src/server/middleware/rate-limiter";

// ─── Route classification ───────────────────────────────────────────

const PUBLIC_PATHS = ["/manifest.json", "/icons", "/sw.js", "/workbox", "/terms", "/privacy", "/cookies", "/reset-password", "/logout"];
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/verify-email"];
const API_AUTH_PREFIX = "/api/auth";

// Rate-limited auth actions
const RATE_LIMITED_PATHS: Record<string, string> = {
  "/api/auth/sign-in/email": "login",
  "/api/auth/sign-up/email": "register",
  "/api/auth/request-password-reset": "forgot-password",
  "/api/auth/reset-password": "reset-password",
};

const RATE_LIMITED_MUTATIONS: Record<string, string> = {
  "/api/transactions": "api-critical",
  "/api/cards": "api-critical",
  "/api/goals": "api-critical",
  "/api/subscriptions": "api-critical",
  "/api/categories": "api-critical",
  "/api/user/profile": "api-critical",
  "/api/push-subscriptions": "api-critical",
};

// ─── Session helpers ────────────────────────────────────────────────

async function getSessionUserId(request: NextRequest): Promise<string | null> {
  // Better Auth uses SIGNED cookies (token.HMACsig). We must NOT read the raw
  // cookie value and query DB directly — the signature makes them not match.
  // Instead, delegate to Better Auth's own session endpoint which handles
  // signed cookies, cookie cache (JWT/JWE), and expiry correctly.
  try {
    const appUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/auth/get-session`, {
      headers: {
        // Forward the original cookies so Better Auth can read the session token
        cookie: request.headers.get("cookie") || "",
      },
      // Short timeout — this runs on every middleware call
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

// ─── Proxy ──────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  // 1. Rate limiting for auth endpoints
  for (const [path, action] of Object.entries(RATE_LIMITED_PATHS)) {
    if (pathname.includes(path)) {
      const key = getRateLimitKey(ip, action);
      const allowed = await checkRateLimit(key, action);
      if (!allowed) {
        return new NextResponse(JSON.stringify({ error: "Demasiados intentos." }), {
          status: 429, headers: { "Retry-After": "900", "Content-Type": "application/json" },
        });
      }
      break;
    }
  }

  // 1b. Rate limiting for mutation endpoints
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    for (const [path, action] of Object.entries(RATE_LIMITED_MUTATIONS)) {
      if (pathname.startsWith(path)) {
        const key = getRateLimitKey(ip, action);
        const allowed = await checkRateLimit(key, action);
        if (!allowed) {
          return new NextResponse(JSON.stringify({ error: "Demasiadas solicitudes." }), {
            status: 429, headers: { "Retry-After": "60", "Content-Type": "application/json" },
          });
        }
        break;
      }
    }
  }

  // 2. CORS preflight for API
  if (pathname.startsWith("/api/") && method === "OPTIONS") {
    const origin = request.headers.get("origin") || "";
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : allowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 3. Pass through without session check:
  //    - Public/static assets
  //    - All /api/* routes (route handlers do their own auth via getUserId())
  //    - Auth API routes (Better Auth handles them)
  const isPublic = PUBLIC_PATHS.some((p: string) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") || pathname === "/favicon.ico";
  const isApiRoute = pathname.startsWith("/api/");

  if (isPublic || isApiRoute) {
    const response = NextResponse.next();
    return applySecurityHeaders(response, request);
  }

  // 4. Validate session (only for page routes — API routes already passed through)
  const userId = await getSessionUserId(request);
  const isAuthRoute = AUTH_PATHS.some((p: string) => pathname.startsWith(p));

  // Only log when debug is enabled (avoids console.log overhead on every request)
  if (process.env.NEXT_PUBLIC_DEBUG_PROXY === "true") {
    const cookiePreview = request.cookies.get("nexora.session_token")?.value?.slice(0, 12) || "none";
    console.log(`[PROXY] ${method} ${pathname} | userId=${userId || "null"} | isAuth=${isAuthRoute} | cookie=${cookiePreview}...`);
  }

  // 4a. Auth pages (/login, /register) → redirect to home if already logged in
  if (isAuthRoute && userId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 4b. Protected page route without session → redirect to login
  if (!isAuthRoute && !userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Apply security headers
  const response = NextResponse.next();
  return applySecurityHeaders(response, request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
