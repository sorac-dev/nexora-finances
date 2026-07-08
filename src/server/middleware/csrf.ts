import { type NextRequest, NextResponse } from "next/server";

/**
 * CSRF protection for state-changing requests.
 * Uses Origin/Referer header validation (double-submit pattern).
 */
export function validateCSRF(request: NextRequest): boolean {
  const method = request.method.toUpperCase();

  // Only validate state-changing methods
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host") || request.nextUrl.host;

  // If origin is present, it must match
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        console.warn(`[CSRF] Origin mismatch: ${originHost} !== ${host}`);
        return false;
      }
    } catch {
      console.warn("[CSRF] Invalid origin URL");
      return false;
    }
    return true;
  }

  // Fallback to referer
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        console.warn(`[CSRF] Referer mismatch: ${refererHost} !== ${host}`);
        return false;
      }
    } catch {
      console.warn("[CSRF] Invalid referer URL");
      return false;
    }
    return true;
  }

  // No origin/referer — allow API requests (they use Bearer tokens)
  return true;
}

export function csrfErrorResponse(): NextResponse {
  return NextResponse.json(
    { error: "CSRF validation failed" },
    { status: 403 }
  );
}
