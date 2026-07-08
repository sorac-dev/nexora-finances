import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function fmt(d: Date): string { return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function mapGoal(g: { id: string; name: string; icon: string; target: unknown; saved: unknown; targetDate: Date; monthlyContribution: unknown; color: string }) {
  return { id: g.id, name: g.name, icon: g.icon, target: toNumber(g.target), saved: toNumber(g.saved), date: fmt(g.targetDate), monthly: toNumber(g.monthlyContribution), color: g.color };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const body = await request.json();
  const existing = await prisma.goal.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const g = await prisma.goal.update({ where: { id }, data: { name: body.name ?? existing.name, icon: body.icon ?? existing.icon, target: body.target != null ? Number(body.target) : existing.target, saved: body.saved != null ? Number(body.saved) : existing.saved, targetDate: body.date ? new Date(`${body.date} 1`) : existing.targetDate, monthlyContribution: body.monthly != null ? Number(body.monthly) : existing.monthlyContribution, color: body.color ?? existing.color } });
  return NextResponse.json(mapGoal(g));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const existing = await prisma.goal.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  await prisma.goal.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const userId = await getUserId(request);
  const body = await request.json();
  const existing = await prisma.goal.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (body.addSaved) {
    const g = await prisma.goal.update({ where: { id }, data: { saved: toNumber(existing.saved) + Number(body.addSaved) } });
    return NextResponse.json(mapGoal(g));
  }
  return NextResponse.json(mapGoal(existing));
}
