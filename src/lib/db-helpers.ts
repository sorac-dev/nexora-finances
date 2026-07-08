import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { auth } from "@/src/server/auth/better-auth-config";

/**
 * Extract userId from the validated session using Better Auth's server-side API.
 * Better Auth signs session cookies with HMAC (token.signature), so the raw
 * cookie value NEVER matches the stored DB token directly. We MUST delegate
 * to Better Auth's own session validation which handles cookie un-signing.
 *
 * In demo mode, falls back to demo user for development convenience.
 */
export async function getUserIdSafe(req: NextRequest): Promise<string | null> {
  // Use Better Auth's server-side session validation (handles signed cookies)
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { disabledAt: true } });
      if (user?.disabledAt) return null; // disabled users treated as unauthenticated
      return session.user.id;
    }
  } catch {
    // Session validation failed — fall through to demo mode check
  }

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  if (demoMode) {
    const devUserId = req.headers.get("x-user-id");
    if (devUserId) return devUserId;
    await ensureUser("demo-user-001");
    return "demo-user-001";
  }

  return null;
}

export async function getUserId(req: NextRequest): Promise<string> {
  // Use Better Auth's server-side session validation (handles signed cookies)
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    if (session?.user?.id) {
      // Check if account is disabled
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { disabledAt: true } });
      if (user?.disabledAt) {
        throw new Error("Cuenta deshabilitada. Contacta al soporte.");
      }
      return session.user.id;
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("deshabilitada")) throw e;
    // Session validation failed — fall through to demo mode check
  }

  // 2. Si DEMO_MODE está desactivado, sin sesión válida = error
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  // 3. Fallback solo si demo mode está activo
  if (demoMode) {
    const devUserId = req.headers.get("x-user-id");
    if (devUserId) return devUserId;
    await ensureUser("demo-user-001");
    return "demo-user-001";
  }

  throw new Error("No autorizado: inicia sesión para continuar");
}

/** Require auth — returns userId or a 401 Response. Use in route handlers. */
export async function requireAuth(req: NextRequest): Promise<string | NextResponse> {
  const userId = await getUserIdSafe(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return userId;
}

/** Convert Prisma Decimal to plain number */
export function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  return Number(val) || 0;
}

const DEFAULT_CATEGORIES = [
  { name: "Comida", icon: "Utensils", color: "#FF9F43", type: "expense" },
  { name: "Transporte", icon: "Bus", color: "#5AC8FA", type: "expense" },
  { name: "Entretenimiento", icon: "Bus", color: "#BF5AF2", type: "expense" },
  { name: "Compras", icon: "ShoppingCart", color: "#FF6B81", type: "expense" },
  { name: "Salud", icon: "Hospital", color: "#34C759", type: "expense" },
  { name: "Servicios", icon: "FileText", color: "#FFD60A", type: "expense" },
  { name: "Educación", icon: "GraduationCap", color: "#0A84FF", type: "expense" },
  { name: "Viajes", icon: "Plane", color: "#8B5CF6", type: "expense" },
  { name: "Hogar", icon: "House", color: "#30D5C8", type: "expense" },
  { name: "Otros", icon: "WalletCards", color: "#8E8E93", type: "expense" },
  { name: "Salario", icon: "DollarSign", color: "#34C759", type: "income" },
  { name: "Extras", icon: "Plus", color: "#0A84FF", type: "income" },
];

export async function ensureUser(userId: string) {
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: { id: userId, name: "Usuario", email: `${userId}@nexora.app`, emailVerified: true, currency: "COP", country: "Colombia" },
    });
  }
  return user;
}

export async function ensureCategories(userId: string) {
  await ensureUser(userId);
  const count = await prisma.category.count({ where: { userId, isDefault: true } });
  if (count === 0) {
    await prisma.category.createMany({
      data: (DEFAULT_CATEGORIES as { name: string; icon: string; color: string; type: string }[]).map((c: { name: string; icon: string; color: string; type: string }) => ({ ...c, userId, isDefault: true })),
    });
  }
}
