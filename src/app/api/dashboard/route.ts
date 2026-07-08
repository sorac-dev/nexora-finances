import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";
import { getBalance, getMonthStats, getPendingPayments } from "@/src/lib/ledger";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const [balance, monthStats, pendingPayments, goals, cardsCount, profile] = await Promise.all([
    getBalance(userId),
    getMonthStats(userId, year, month),
    getPendingPayments(userId),
    prisma.goal.findMany({ where: { userId, deletedAt: null }, take: 3 }),
    prisma.creditCard.count({ where: { userId, deletedAt: null } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  return NextResponse.json({
    balance,
    income: monthStats.income,
    expenses: monthStats.expenses,
    pendingPayments,
    goals: goals.map((g) => ({
      id: g.id, name: g.name, icon: g.icon, target: toNum(g.target), saved: toNum(g.saved), color: g.color,
    })),
    userName: profile?.name || "Usuario",
    cardsCount,
  });
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  return Number(v) || 0;
}
