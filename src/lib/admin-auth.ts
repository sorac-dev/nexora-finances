import { auth } from "@/src/server/auth/better-auth-config";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getClientIp(request?: NextRequest): string {
  if (!request) return "unknown";
  // Cloudflare: x-forwarded-for = "real-ip, cf-ip". First one is real.
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";
}

/**
 * Require ADMIN role for a request.
 * Verifies the session server-side against the DB on EVERY call.
 * Returns the userId if admin, or throws a 403/401 response.
 *
 * Usage in API routes:
 *   const userId = await requireAdmin(request);
 *   if (userId instanceof NextResponse) return userId;
 */
export async function requireAdmin(
  request: NextRequest
): Promise<string | NextResponse> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Re-validate role against DB — never trust the cookie/JWT alone
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    // user.role may be null for accounts created before the role column was added.
    if (!user || (user.role || "USER") !== "ADMIN") {
      // Log the denied access attempt
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "ADMIN_ACCESS_DENIED",
          entity: "admin",
          entityId: session.user.id,
          details: JSON.stringify({ reason: "not_admin", attemptedRole: user?.role || "unknown" }),
          ipAddress: getClientIp(request),
          userAgent: request.headers.get("user-agent") || "",
        },
      }).catch(() => {});

      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    return user.id;
  } catch {
    return NextResponse.json({ error: "Error de autenticación" }, { status: 500 });
  }
}

/**
 * Admin audit log helper. Call this after admin actions.
 * NEVER log passwords, PINs, tokens, or full card numbers.
 */
export async function adminAudit(
  adminUserId: string,
  action: string,
  entity: string,
  entityId: string | null,
  details?: Record<string, unknown>,
  request?: NextRequest
) {
  // Sanitize: never log sensitive fields
  const safe = details ? JSON.parse(JSON.stringify(details)) : undefined;
  if (safe) {
    delete safe.password;
    delete safe.pin;
    delete safe.token;
    delete safe.cardNumber;
    delete safe.secret;
    delete safe.cvv;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action,
        entity,
        entityId,
        details: safe ? JSON.stringify(safe) : null,
        ipAddress: getClientIp(request),
        userAgent: request?.headers.get("user-agent") || "",
      },
    });
  } catch {
    // Fail silently — audit log should never break the main flow
  }
}
