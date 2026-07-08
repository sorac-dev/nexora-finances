import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";
import { verifyPin } from "@/src/lib/pin";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

/**
 * Verify a PIN for protected actions.
 * Tracks failed attempts per user in the RateLimit table.
 * After 5 failures, locks the account and forces session logout.
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json().catch(() => ({}));
  const { pin } = body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { securityPin: true },
  });

  // No PIN configured — always allow
  if (!user?.securityPin) {
    return NextResponse.json({ valid: true, hasPin: false });
  }

  // PIN not provided or invalid format
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ valid: false, hasPin: true, error: "PIN requerido" }, { status: 401 });
  }

  const lockKey = `pin-lockout:${userId}`;

  // Verify PIN FIRST — correct PIN always clears the lockout
  const valid = verifyPin(pin, user.securityPin);

  if (valid) {
    await prisma.rateLimit.deleteMany({ where: { key: lockKey } });
    return NextResponse.json({ valid: true, hasPin: true });
  }

  // Wrong PIN — track failed attempt
  const now = new Date();
  const existing = await prisma.rateLimit.findUnique({ where: { key: lockKey } });

  if (!existing || existing.expiresAt < now) {
    await prisma.rateLimit.upsert({
      where: { key: lockKey },
      create: { key: lockKey, count: 1, expiresAt: new Date(now.getTime() + LOCKOUT_MINUTES * 60_000) },
      update: { count: 1, expiresAt: new Date(now.getTime() + LOCKOUT_MINUTES * 60_000) },
    });
  } else {
    await prisma.rateLimit.update({
      where: { key: lockKey },
      data: { count: existing.count + 1 },
    });
  }

  const newCount = existing && existing.expiresAt >= now ? existing.count + 1 : 1;
  const remaining = MAX_ATTEMPTS - newCount;

  // Max attempts reached — force logout
  if (remaining <= 0) {
    await prisma.session.deleteMany({ where: { userId } });
    return NextResponse.json(
      { valid: false, hasPin: true, locked: true, forceLogout: true, error: `Demasiados intentos. Cuenta bloqueada por ${LOCKOUT_MINUTES} minutos.` },
      { status: 423 }
    );
  }

  return NextResponse.json(
    { valid: false, hasPin: true, attemptsLeft: remaining, error: `PIN incorrecto. ${remaining} intento${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"}.` },
    { status: 401 }
  );
}
