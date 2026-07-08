import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const body = await request.json();
  const existing = await prisma.recurringPayment.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const s = await prisma.recurringPayment.update({ where: { id }, data: { name: body.name ?? existing.name, amount: body.amount != null ? Number(body.amount) : existing.amount, frequency: body.frequency ?? existing.frequency, icon: body.icon ?? existing.icon, category: body.category ?? existing.category, isVariable: body.isVariable ?? existing.isVariable, dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate, deadline: body.deadline ? new Date(body.deadline) : existing.deadline, active: body.active ?? existing.active } });
  return NextResponse.json({ ...s, amount: toNumber(s.amount), dueDate: s.dueDate.toISOString().split("T")[0], deadline: s.deadline.toISOString().split("T")[0] });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const existing = await prisma.recurringPayment.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  await prisma.recurringPayment.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
