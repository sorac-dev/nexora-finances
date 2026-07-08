import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const existing = await prisma.category.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (existing.isDefault) return NextResponse.json({ error: "No se pueden editar categorías por defecto" }, { status: 403 });
  const body = await request.json();
  const cat = await prisma.category.update({ where: { id }, data: { name: body.name, icon: body.icon, color: body.color, type: body.type } });
  return NextResponse.json(cat);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const existing = await prisma.category.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (existing.isDefault) return NextResponse.json({ error: "No se pueden eliminar categorías por defecto" }, { status: 403 });
  await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
