import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/server/auth/better-auth-config";
import { prisma } from "@/src/lib/prisma";

/**
 * POST /api/auth/extend-session
 * Extends the current session to 1 year (365 days).
 * Called after login when "Mantener sesión abierta" is checked.
 */
export async function POST(request: NextRequest) {
  try {
    // Use Better Auth's server-side API to get the current session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
    }

    // Extend all sessions for this user to 1 year from now
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    await prisma.session.updateMany({
      where: { userId: session.user.id },
      data: { expiresAt: oneYearFromNow },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al extender sesión" }, { status: 500 });
  }
}
