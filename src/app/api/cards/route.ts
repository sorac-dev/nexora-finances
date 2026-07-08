import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  const cards = await prisma.creditCard.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(cards.map((c) => ({ ...c, limit: toNumber(c.limit) })));
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json();
  const c = await prisma.creditCard.create({
    data: {
      userId, name: body.name || "Nueva", brand: body.brand || "VISA",
      type: body.type || "credito", cutDay: Number(body.cutDay) || 1,
      dueDay: Number(body.dueDay) || 15, color: body.color || "#3B82F6",
      icon: body.icon || "CreditCard", limit: Number(body.limit) || 0,
      gradient: body.gradient || `linear-gradient(135deg, ${body.color || "#3B82F6"}dd, ${body.color || "#3B82F6"})`,
    },
  });
  return NextResponse.json({ ...c, limit: toNumber(c.limit) }, { status: 201 });
}
