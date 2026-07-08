import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, ensureCategories } from "@/src/lib/db-helpers";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  await ensureCategories(userId);
  const cats = await prisma.category.findMany({ where: { userId, deletedAt: null }, orderBy: { name: "asc" } });
  return NextResponse.json(cats);
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json();
  const cat = await prisma.category.create({
    data: { userId, name: body.name || "Nueva", icon: body.icon || "Package", color: body.color || "#8E8E93", type: body.type || "expense", isDefault: false },
  });
  return NextResponse.json(cat, { status: 201 });
}
