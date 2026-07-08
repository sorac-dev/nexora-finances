import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function fmtTargetDate(d: Date): string { return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  const goals = await prisma.goal.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: "desc" } });
  return NextResponse.json((goals as { id: string; name: string; icon: string; target: unknown; saved: unknown; targetDate: Date; monthlyContribution: unknown; color: string }[]).map((g) => ({
    id: g.id, name: g.name, icon: g.icon, target: toNumber(g.target), saved: toNumber(g.saved),
    date: fmtTargetDate(g.targetDate), monthly: toNumber(g.monthlyContribution), color: g.color,
  })));
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json();
  const g = await prisma.goal.create({
    data: { userId, name: body.name || "Nueva meta", icon: body.icon || "Target", target: Number(body.target) || 0, saved: 0, targetDate: new Date(body.date || new Date()), monthlyContribution: Number(body.monthly) || 0, color: body.color || "#0A84FF" },
  });
  return NextResponse.json({
    id: g.id, name: g.name, icon: g.icon, target: toNumber(g.target), saved: toNumber(g.saved),
    date: fmtTargetDate(g.targetDate), monthly: toNumber(g.monthlyContribution), color: g.color,
  }, { status: 201 });
}
