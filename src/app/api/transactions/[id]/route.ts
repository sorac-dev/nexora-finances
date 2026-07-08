import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";
import { fmtDateFull } from "@/src/lib/date";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const existing = await prisma.transaction.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const body = await request.json();
  const tx = await prisma.transaction.update({ where: { id }, data: { description: body.name ?? existing.description, amount: body.amount != null ? Number(body.amount) : existing.amount, date: body.date ? new Date(body.date) : existing.date } });
  return NextResponse.json({ id: tx.id, type: tx.type, name: tx.description, cat: body.cat || "Otro", amount: toNumber(tx.amount), date: fmtDateFull(tx.date), icon: "Package" });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const permanent = request.nextUrl.searchParams.get("permanent") === "true";

  // Permanent delete — hard delete from DB (from trash)
  if (permanent) {
    const existing = await prisma.transaction.findFirst({ where: { id, userId, deletedAt: { not: null } } });
    if (!existing) return NextResponse.json({ error: "No encontrado en la papelera" }, { status: 404 });
    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  // Soft delete — move to trash
  const existing = await prisma.transaction.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  await prisma.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const existing = await prisma.transaction.findFirst({ where: { id, userId, deletedAt: { not: null } } });
  if (!existing) return NextResponse.json({ error: "No encontrado en la papelera" }, { status: 404 });
  await prisma.transaction.update({ where: { id }, data: { deletedAt: null } });
  return NextResponse.json({ success: true });
}
