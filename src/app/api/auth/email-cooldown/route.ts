import { NextRequest, NextResponse } from "next/server";
import { checkEmailRateLimit } from "@/src/lib/email-rate-limit";

/**
 * Public endpoint: check if an email is in cooldown.
 * No auth required — rate limiting is done by email, not session.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") || "";
  const type = request.nextUrl.searchParams.get("type") || "reset";

  if (!email || !["verify", "reset"].includes(type)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 422 });
  }

  const { allowed, retryAfter, count } = await checkEmailRateLimit(email, type as "verify" | "reset");

  return NextResponse.json({ allowed, retryAfter, count });
}
