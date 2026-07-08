import { auth } from "@/src/server/auth/better-auth-config";
import { type NextRequest, NextResponse } from "next/server";
import { verifyTurnstile } from "@/src/lib/turnstile";
import { checkEmailRateLimit, recordEmailSent } from "@/src/lib/email-rate-limit";

const PROTECTED_PATHS = [
  "/api/auth/sign-in/email",
  "/api/auth/sign-up/email",
  "/api/auth/request-password-reset",
];

export async function GET(request: NextRequest) {
  return auth.handler(request);
}

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.endsWith(p));

  if (!isProtected) return auth.handler(request);

  // Parse body once
  let body: Record<string, unknown> = {};
  try {
    body = await request.clone().json().catch(() => ({}));
  } catch {}

  // ── Turnstile ──────────────────────────────────────────────────
  const token = (body.turnstileToken || body.cfTurnstileResponse || "") as string;
  if (!token) {
    return NextResponse.json(
      { error: "Verificación de seguridad requerida", code: "turnstile_missing" },
      { status: 400 }
    );
  }
  const valid = await verifyTurnstile(token);
  if (!valid) {
    return NextResponse.json(
      { error: "Verificación de seguridad fallida. Intenta de nuevo.", code: "turnstile_failed" },
      { status: 400 }
    );
  }

  // ── Email rate limit (password reset) ──────────────────────────
  if (pathname.endsWith("/request-password-reset")) {
    const email = (body.email || "") as string;
    if (email) {
      const { allowed, retryAfter } = await checkEmailRateLimit(email, "reset");
      if (!allowed) {
        return NextResponse.json(
          { error: `Demasiados intentos. Espera ${retryAfter} segundos.`, retryAfter },
          { status: 429 }
        );
      }
      // Record BEFORE passing through (optimistic — prevents abuse even if SMTP fails)
      await recordEmailSent(email, "reset");
    }
  }

  return auth.handler(request);
}
