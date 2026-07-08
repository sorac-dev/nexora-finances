import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";
import { fmtDateFull } from "@/src/lib/date";

const TRASH_DAYS = 30;
let _lastCleanup = 0;

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const { searchParams } = request.nextUrl;
  const cardId = searchParams.get("cardId");
  const trash = searchParams.get("trash") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "15"), 50);
  const cursor = searchParams.get("cursor"); // ISO date string for cursor-based pagination

  // Lazy auto-cleanup: only check every 5 minutes
  const now = Date.now();
  if (now - _lastCleanup > 300_000) {
    _lastCleanup = now;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - TRASH_DAYS);
    await prisma.transaction.deleteMany({ where: { userId, deletedAt: { not: null, lte: cutoff } } }).catch(() => {});
  }

  const where: Record<string, unknown> = { userId };
  if (trash) { where.deletedAt = { not: null }; } else { where.deletedAt = null; }
  if (cardId) where.cardId = cardId;

  // Cursor-based pagination: use date as cursor for active, deletedAt for trash
  if (cursor) {
    const cursorField = trash ? "deletedAt" : "date";
    where[cursorField] = { lt: new Date(cursor) };
  }

  const txs = await prisma.transaction.findMany({
    where,
    orderBy: trash ? { deletedAt: "desc" } : { date: "desc" },
    take: limit + 1, // fetch one extra to know if there are more
    include: { category: { select: { name: true, icon: true, color: true } } },
  });

  const hasMore = txs.length > limit;
  if (hasMore) txs.pop(); // remove the extra item

  const data = (txs as { id: string; type: string; description: string; amount: unknown; date: Date; cardId: string | null; installments: number | null; deletedAt: Date | null; category: { name: string; icon: string } | null }[]).map((t) => ({
    id: t.id, type: t.type, name: t.description, cat: t.category?.name || "Otro",
    amount: toNumber(t.amount), date: fmtDateFull(t.date), dateRaw: t.date.toISOString(),
    icon: t.category?.icon || "Package", cardId: t.cardId, installments: t.installments || 1,
    deletedAt: t.deletedAt?.toISOString() || null,
    daysLeft: t.deletedAt ? Math.max(0, TRASH_DAYS - Math.ceil((Date.now() - t.deletedAt.getTime()) / 86400000)) : null,
  }));

  // Next cursor is the date of the last item
  const nextCursor = txs.length > 0
    ? (trash ? txs[txs.length - 1].deletedAt?.toISOString() : txs[txs.length - 1].date.toISOString()) || null
    : null;

  return NextResponse.json({ data, hasMore, nextCursor });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json();
  const { subscriptionId } = body;

  let account = await prisma.financialAccount.findFirst({ where: { userId, deletedAt: null } });
  if (!account) account = await prisma.financialAccount.create({ data: { userId, name: "Cuenta Principal", type: "cuenta_bancaria", balance: 0, color: "#3B82F6", icon: "Building2" } });

  let category = await prisma.category.findFirst({ where: { userId, name: body.cat || "Otros", deletedAt: null } });
  if (!category) category = await prisma.category.findFirst({ where: { userId, name: "Otros", deletedAt: null } });

  // Calculate cycleKey for subscription/card payments
  // cycleKey represents the CURRENT cycle (the one being paid), not the next future one
  let cycleKey: string | null = null;
  if (subscriptionId) {
    const sub = await prisma.recurringPayment.findFirst({ where: { id: subscriptionId, userId } });
    if (sub) {
      const firstDue = sub.firstDueDate || sub.dueDate;
      const { getCycleKey } = await import("@/src/lib/ledger");
      // The cycle being paid is the most recent due date (not the next one)
      // e.g., if today is July 8 and due day is 1, the cycle being paid is July (2026-07)
      const now = new Date();
      const dayOfMonth = new Date(firstDue).getDate();
      let currentCycle = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
      if (currentCycle.getTime() > now.getTime()) currentCycle.setMonth(currentCycle.getMonth() - 1);
      cycleKey = getCycleKey(currentCycle, sub.frequency);
    }
  } else if (body.cardId && body.type === "expense") {
    const card = await prisma.creditCard.findFirst({ where: { id: body.cardId, userId } });
    if (card?.cutDay) {
      const now = new Date();
      // Current cycle starts at the most recent cut date
      let cutDate = new Date(now.getFullYear(), now.getMonth(), card.cutDay);
      if (cutDate.getTime() > now.getTime()) cutDate.setMonth(cutDate.getMonth() - 1);
      cycleKey = `${cutDate.getFullYear()}-${String(cutDate.getMonth() + 1).padStart(2, "0")}-${String(cutDate.getDate()).padStart(2, "0")}`;
    }
  }

  const amount = Number(body.amount) || 0;
  await prisma.transaction.create({
    data: {
      userId, type: body.type || "expense", amount,
      description: body.name || body.description || "Movimiento",
      date: new Date(body.date || new Date()),
      installments: Number(body.installments) || 1,
      categoryId: category?.id || "", accountId: account.id,
      cardId: body.cardId || null,
      subscriptionId: subscriptionId || null,
      cycleKey,
    },
  });

  return NextResponse.json({ id: "", status: "ok" }, { status: 201 });
}
