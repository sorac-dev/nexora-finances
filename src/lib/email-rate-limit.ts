import { prisma } from "@/src/lib/prisma";

// Strict cooldown delays: 1min, 5min, 10min, 30min, 1h, 24h
const DELAYS = [60_000, 300_000, 600_000, 1_800_000, 3_600_000, 86_400_000];
const WINDOW_MS = 7 * 86_400_000; // 7 day window before resetting

/**
 * Check if an email can be sent. Returns cooldown state.
 * Persisted in DB (RateLimit table) — survives browser changes and server restarts.
 */
export async function checkEmailRateLimit(
  email: string,
  type: "verify" | "reset"
): Promise<{ allowed: boolean; retryAfter: number; count: number }> {
  const key = `email-${type}:${email.toLowerCase().trim()}`;
  const now = Date.now();

  const existing = await prisma.rateLimit.findUnique({ where: { key } });

  // No record or window expired → allowed
  if (!existing || existing.expiresAt.getTime() - WINDOW_MS > now || existing.count === 0) {
    return { allowed: true, retryAfter: 0, count: existing?.count || 0 };
  }

  const count = existing.count;
  const cooldownEnds = existing.expiresAt.getTime();

  if (now >= cooldownEnds) {
    return { allowed: true, retryAfter: 0, count };
  }

  const retryAfter = Math.ceil((cooldownEnds - now) / 1000);
  return { allowed: false, retryAfter, count };
}

/**
 * Record a successful email send and set the cooldown for the next one.
 * Returns the new send count.
 */
export async function recordEmailSent(
  email: string,
  type: "verify" | "reset"
): Promise<number> {
  const key = `email-${type}:${email.toLowerCase().trim()}`;
  const now = Date.now();

  const existing = await prisma.rateLimit.findUnique({ where: { key } });
  const count = existing?.expiresAt && (existing.expiresAt.getTime() - WINDOW_MS) <= now
    ? existing.count
    : 0;

  const delay = DELAYS[Math.min(count, DELAYS.length - 1)];
  const cooldownEnds = new Date(now + delay);
  const windowEnds = new Date(now + WINDOW_MS);

  await prisma.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, expiresAt: cooldownEnds },
    update: { count: count + 1, expiresAt: cooldownEnds },
  });

  return count + 1;
}
