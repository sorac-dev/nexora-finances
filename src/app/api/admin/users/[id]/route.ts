import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin, adminAudit } from "@/src/lib/admin-auth";

// ─── GET — user info (NO financial data) ────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await requireAdmin(request);
  if (adminId instanceof NextResponse) return adminId;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, emailVerified: true,
      disabledAt: true,
      currency: true, country: true, language: true,
      lockTimeout: true, createdAt: true, updatedAt: true,
      securityPin: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Active sessions (only metadata, no tokens)
  const sessions = await prisma.session.findMany({
    where: { userId: id, expiresAt: { gte: new Date() } },
    select: { id: true, ipAddress: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    disabledAt: user.disabledAt,
    isDisabled: !!user.disabledAt,
    hasPin: !!user.securityPin,
    lockTimeout: user.lockTimeout,
    currency: user.currency,
    country: user.country,
    language: user.language,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    sessions,
    sessionCount: sessions.length,
  });
}

// ─── PATCH — admin actions ──────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await requireAdmin(request);
  if (adminId instanceof NextResponse) return adminId;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  let action = "ADMIN_UPDATE_USER";

  // Change role
  if (body.role && ["USER", "ADMIN"].includes(body.role)) {
    updates.role = body.role;
    action = "ADMIN_CHANGE_ROLE";
  }

  // Toggle email verified
  if (typeof body.emailVerified === "boolean") {
    updates.emailVerified = body.emailVerified;
  }

  // Toggle disabled
  if (body.toggleDisabled === true) {
    // Read current state from DB to toggle
    const current = await prisma.user.findUnique({ where: { id }, select: { disabledAt: true } });
    updates.disabledAt = current?.disabledAt ? null : new Date();
    action = current?.disabledAt ? "ADMIN_ENABLE_ACCOUNT" : "ADMIN_DISABLE_ACCOUNT";
  }

  // Force remove PIN
  if (body.removePin === true) {
    updates.securityPin = null;
    action = "ADMIN_REMOVE_PIN";
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No hay campos válidos para actualizar" }, { status: 422 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updates,
    select: {
      id: true, name: true, email: true, role: true, emailVerified: true,
      disabledAt: true, securityPin: true, lockTimeout: true,
    },
  });

  await adminAudit(adminId, action, "user", id, updates, request);

  return NextResponse.json({
    ...updated,
    hasPin: !!updated.securityPin,
    securityPin: undefined,
    isDisabled: !!updated.disabledAt,
  });
}

// ─── DELETE — force logout all sessions ─────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await requireAdmin(request);
  if (adminId instanceof NextResponse) return adminId;

  const { id } = await params;
  const result = await prisma.session.deleteMany({ where: { userId: id } });

  await adminAudit(adminId, "ADMIN_FORCE_LOGOUT", "user", id, { sessionsDeleted: result.count }, request);

  return NextResponse.json({ success: true, sessionsDeleted: result.count });
}
