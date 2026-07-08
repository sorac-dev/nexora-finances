import type { NextRequest, NextResponse } from "next/server";

/**
 * Apply security headers to the response.
 * Must be called at the end of the middleware chain.
 */
export function applySecurityHeaders(
  response: NextResponse,
  _request: NextRequest
): NextResponse {
  // CSP
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-src 'self' https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // HSTS
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // Clickjacking protection
  response.headers.set("X-Frame-Options", "DENY");

  // MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // XSS protection (legacy)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}
