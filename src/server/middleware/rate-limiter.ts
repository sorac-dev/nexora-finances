import { prisma } from "@/src/lib/prisma";
import { RATE_LIMIT_WINDOW_MS } from "@/src/lib/constants";

const LIMITS: Record<string, number> = {
  login: 5,
  register: 3,
  "forgot-password": 3,
  "reset-password": 5,
  admin: 15,
  "api-critical": 30,
  default: 100,
};

/**
 * Token bucket rate limiter stored in MySQL.
 * Returns true if the request should be allowed.
 */
export async function checkRateLimit(
  key: string,
  action: string = "default"
): Promise<boolean> {
  const limit = LIMITS[action] ?? LIMITS.default;
  const now = new Date();

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    if (!existing || existing.expiresAt < now) {
      await prisma.rateLimit.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          expiresAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
        },
        update: {
          count: 1,
          expiresAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
        },
      });
      return true;
    }

    if (existing.count >= limit) {
      return false;
    }

    await prisma.rateLimit.update({
      where: { key },
      data: { count: existing.count + 1 },
    });

    return true;
  } catch {
    // If DB fails, allow the request (fail open with logging)
    console.error("[RateLimiter] DB error — allowing request");
    return true;
  }
}

export function getRateLimitKey(
  ip: string,
  action: string,
  identifier?: string
): string {
  return `rl:${action}:${identifier ?? ip}`;
}
