import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  const [subs, total] = await Promise.all([
    prisma.recurringPayment.findMany({
      where: { userId, deletedAt: null },
      include: { categoryRel: { select: { name: true, icon: true, color: true } } },
      orderBy: { dueDate: "asc" }, skip, take: limit,
    }),
    prisma.recurringPayment.count({ where: { userId, deletedAt: null } }),
  ]);
  const data = subs.map((s) => ({
    id: s.id, name: s.name, amount: toNumber(s.amount), frequency: s.frequency,
    icon: s.categoryRel?.icon || s.icon || "FileText",
    category: s.categoryRel?.name || s.category,
    categoryId: s.categoryId,
    isVariable: s.isVariable,
    dueDate: s.dueDate.toISOString().split("T")[0],
    deadline: s.deadline.toISOString().split("T")[0],
    active: s.active,
  }));

  return NextResponse.json({ data, total, page, limit, hasMore: skip + data.length < total });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json();

  let icon = body.icon || "FileText";
  let catName = body.category || "Servicios";
  if (body.categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: body.categoryId, userId } });
    if (cat) { icon = cat.icon; catName = cat.name; }
  }

  const s = await prisma.recurringPayment.create({
    data: {
      userId, name: body.name || "Nuevo", amount: Number(body.amount) || 0,
      frequency: body.frequency || "monthly", icon, isVariable: body.isVariable ?? false,
      category: catName, categoryId: body.categoryId || null,
      dueDate: new Date(body.dueDate || new Date()),
      deadline: new Date(body.deadline || new Date()),
      active: body.active ?? true,
    },
  });
  return NextResponse.json({ ...s, amount: toNumber(s.amount), dueDate: s.dueDate.toISOString().split("T")[0], deadline: s.deadline.toISOString().split("T")[0] }, { status: 201 });
}
