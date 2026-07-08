import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";
import { hashPin, verifyPin } from "@/src/lib/pin";

const LOCKOUT_MINUTES = 30;
const MAX_ATTEMPTS = 5;

async function checkPinLockout(userId: string): Promise<NextResponse | null> {
  const lockKey = `pin-lockout:${userId}`;
  const lockout = await prisma.rateLimit.findUnique({ where: { key: lockKey } });
  if (lockout && lockout.count >= MAX_ATTEMPTS && lockout.expiresAt > new Date()) {
    // Force logout — too many failed attempts
    await prisma.session.deleteMany({ where: { userId } });
    const remaining = Math.ceil((lockout.expiresAt.getTime() - Date.now()) / 1000 / 60);
    return NextResponse.json(
      { error: `Cuenta bloqueada por ${remaining} minutos.`, forceLogout: true },
      { status: 423 }
    );
  }
  return null;
}

// ─── GET — check if user has a PIN configured ─────────────────────────

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { securityPin: true, lockTimeout: true } });
  return NextResponse.json({ hasPin: !!user?.securityPin, lockTimeout: user?.lockTimeout ?? 0 });
}

// ─── PUT — set or change PIN ──────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const userId = await getUserId(request);

  // Check brute-force lockout
  const locked = await checkPinLockout(userId);
  if (locked) return locked;

  const body = await request.json().catch(() => ({}));
  const { pin, currentPin } = body;

  // Validate PIN format
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "El PIN debe ser exactamente 4 dígitos" }, { status: 422 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { securityPin: true } });

  // If user already has a PIN, require the current PIN to change it
  if (user?.securityPin) {
    if (!currentPin || !/^\d{4}$/.test(currentPin)) {
      return NextResponse.json({ error: "Se requiere el PIN actual para cambiarlo" }, { status: 422 });
    }
    if (!verifyPin(currentPin, user.securityPin)) {
      return NextResponse.json({ error: "PIN actual incorrecto" }, { status: 401 });
    }
  }

  // Hash and store the new PIN
  await prisma.user.update({
    where: { id: userId },
    data: { securityPin: hashPin(pin) },
  });

  return NextResponse.json({ success: true, hasPin: true });
}

// ─── PATCH — update lock timeout (no PIN needed) ──────────────────────

export async function PATCH(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json().catch(() => ({}));
  const { lockTimeout } = body;

  if (lockTimeout !== undefined && ![-1, 0, 1, 5, 10].includes(lockTimeout)) {
    return NextResponse.json({ error: "Valor de bloqueo inválido" }, { status: 422 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lockTimeout: lockTimeout ?? -1 },
  });

  return NextResponse.json({ success: true, lockTimeout: lockTimeout ?? -1 });
}

// ─── DELETE — disable PIN ─────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);

  // Check brute-force lockout
  const locked = await checkPinLockout(userId);
  if (locked) return locked;

  const body = await request.json().catch(() => ({}));
  const { pin } = body;

  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Se requiere el PIN para desactivarlo" }, { status: 422 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { securityPin: true } });

  if (!user?.securityPin) {
    return NextResponse.json({ error: "No tienes un PIN configurado" }, { status: 400 });
  }

  if (!verifyPin(pin, user.securityPin)) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { securityPin: null },
  });

  return NextResponse.json({ success: true, hasPin: false });
}
