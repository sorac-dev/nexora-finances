import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";
import { getCycleKey } from "@/src/lib/cycle";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  const now = new Date();
  const [subs, total] = await Promise.all([
    prisma.recurringPayment.findMany({
      where: { userId, deletedAt: null },
      include: { categoryRel: { select: { name: true, icon: true, color: true } } },
      orderBy: { dueDate: "asc" }, skip, take: limit,
    }),
    prisma.recurringPayment.count({ where: { userId, deletedAt: null } }),
  ]);

  // Get all cycleKeys that have been paid (one query for all subs)
  const paidCycleKeys = new Set<string>();
  const subIds = subs.map((s) => s.id);
  if (subIds.length > 0) {
    const paidTxs = await prisma.transaction.findMany({
      where: { userId, deletedAt: null, subscriptionId: { in: subIds }, cycleKey: { not: null } },
      select: { subscriptionId: true, cycleKey: true },
    });
    for (const tx of paidTxs) {
      if (tx.subscriptionId && tx.cycleKey) {
        paidCycleKeys.add(`${tx.subscriptionId}:${tx.cycleKey}`);
      }
    }
  }

  const data = subs.map((s) => {
    const firstDue = s.firstDueDate || s.dueDate;
    const dueDay = new Date(firstDue).getDate();
    let currentCycleDate = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
    if (currentCycleDate.getTime() > now.getTime()) currentCycleDate.setMonth(currentCycleDate.getMonth() - 1);
    const cycleKey = getCycleKey(currentCycleDate, s.frequency);

    return {
      id: s.id, name: s.name, amount: toNumber(s.amount), frequency: s.frequency,
      icon: s.categoryRel?.icon || s.icon || "FileText",
      category: s.categoryRel?.name || s.category,
      categoryId: s.categoryId,
      isVariable: s.isVariable,
      dueDate: s.dueDate.toISOString().split("T")[0],
      deadline: s.deadline.toISOString().split("T")[0],
      active: s.active,
      paidThisCycle: paidCycleKeys.has(`${s.id}:${cycleKey}`),
    };
  });

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

  const dueDate = new Date(body.dueDate || new Date());
  const deadline = new Date(body.deadline || new Date());

  const s = await prisma.recurringPayment.create({
    data: {
      userId, name: body.name || "Nuevo", amount: Number(body.amount) || 0,
      frequency: body.frequency || "monthly", icon, isVariable: body.isVariable ?? false,
      category: catName, categoryId: body.categoryId || null,
      dueDate, deadline,
      firstDueDate: dueDate,       // immutable origin for cycle calculation
      firstDeadlineDate: deadline,  // immutable origin for cycle calculation
      active: body.active ?? true,
    },
  });
  return NextResponse.json({ ...s, amount: toNumber(s.amount), dueDate: s.dueDate.toISOString().split("T")[0], deadline: s.deadline.toISOString().split("T")[0] }, { status: 201 });
}
