import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";
import { verifyPin } from "@/src/lib/pin";

/**
 * Verify a PIN for protected actions (delete card, delete transaction, etc.).
 * Returns { valid: true } if the PIN is correct or if the user has no PIN configured.
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json().catch(() => ({}));
  const { pin } = body;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { securityPin: true } });

  // No PIN configured → always allow
  if (!user?.securityPin) {
    return NextResponse.json({ valid: true, hasPin: false });
  }

  // PIN configured but not provided
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ valid: false, hasPin: true, error: "PIN requerido" }, { status: 401 });
  }

  // Verify PIN
  const valid = verifyPin(pin, user.securityPin);
  if (!valid) {
    return NextResponse.json({ valid: false, hasPin: true, error: "PIN incorrecto" }, { status: 401 });
  }

  return NextResponse.json({ valid: true, hasPin: true });
}
