import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const c = await prisma.creditCard.findFirst({ where: { id, userId, deletedAt: null } });
  if (!c) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ ...c, limit: toNumber(c.limit) });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const body = await request.json();
  const existing = await prisma.creditCard.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const c = await prisma.creditCard.update({ where: { id }, data: { name: body.name ?? existing.name, brand: body.brand ?? existing.brand, cutDay: body.cutDay != null ? Number(body.cutDay) : existing.cutDay, dueDay: body.dueDay != null ? Number(body.dueDay) : existing.dueDay, color: body.color ?? existing.color, icon: body.icon ?? existing.icon } });
  return NextResponse.json({ ...c, limit: toNumber(c.limit) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const existing = await prisma.creditCard.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  await prisma.creditCard.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
