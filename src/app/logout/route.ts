import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server-side logout route.
 * Calls Better Auth's sign-out endpoint internally (which deletes the DB session
 * and clears cookies), then redirects to /login. Also clears cookies directly
 * as a fallback to handle __Secure- prefix mismatches when NODE_ENV=production.
 */
export async function GET(request: NextRequest) {
  const appUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  // Forward original cookies so Better Auth can identify and delete the session
  const cookieHeader = request.headers.get("cookie") || "";

  try {
    await fetch(`${appUrl}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        cookie: cookieHeader,
        origin: appUrl, // Required by Better Auth's originCheckMiddleware for POST
        "content-type": "application/json",
      },
    });
  } catch (e) {
    console.error("[LOGOUT] sign-out fetch failed:", e);
  }

  const response = NextResponse.redirect(new URL("/login", request.url));

  // Clear both possible cookie names — with and without __Secure- prefix.
  // When NODE_ENV=production, Better Auth adds __Secure-; the proxy reads
  // the unprefixed name. Clearing both ensures the session is gone.
  const secure = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  response.cookies.set("nexora.session_token", "", cookieOptions);
  response.cookies.set("__Secure-nexora.session_token", "", cookieOptions);

  return response;
}
