import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const { searchParams } = request.nextUrl;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // ── Date range ──────────────────────────────────────────────────
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;
  const month = searchParams.get("month") !== null && searchParams.get("month") !== ""
    ? parseInt(searchParams.get("month")!)
    : null;

  let start: Date;
  let end: Date;

  if (dateFrom || dateTo) {
    // Custom date range takes priority
    start = dateFrom ? new Date(dateFrom) : new Date(currentYear, 0, 1);
    end = dateTo ? new Date(dateTo + "T23:59:59.999Z") : new Date();
  } else if (year !== null && month !== null) {
    // Specific month
    start = new Date(year, month, 1);
    end = new Date(year, month + 1, 0, 23, 59, 59);
  } else if (year !== null) {
    // Full year
    start = new Date(year, 0, 1);
    end = new Date(year, 11, 31, 23, 59, 59);
  } else {
    // Default: current month
    start = new Date(currentYear, currentMonth, 1);
    end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
  }

  // ── Previous period for comparison ───────────────────────────────
  const rangeMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - rangeMs);
  const prevEnd = new Date(start.getTime() - 1);

  // ── Transactions in range ─────────────────────────────────────────
  const [txs, prevTxs] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: start, lte: end } },
      include: { category: { select: { name: true, icon: true, color: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: prevStart, lte: prevEnd } },
      include: { category: { select: { name: true, icon: true, color: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  type AggTx = { type: string; amount: unknown; date: Date; category: { name: string; icon: string; color: string } | null };

  // ── Aggregate helpers ─────────────────────────────────────────────
  function aggregate(txs: AggTx[]) {
    let totalIncome = 0;
    let totalExpenses = 0;
    const byCategory: Record<string, { name: string; icon: string; color: string; amount: number; count: number }> = {};
    const byMonth: Record<string, { month: string; income: number; expenses: number }> = {};

    (txs as AggTx[]).forEach((tx: AggTx) => {
      const amt = toNumber(tx.amount);
      const cat = tx.category || { name: "Otros", icon: "Package", color: "#8E8E93" };
      const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;

      if (tx.type === "income") {
        totalIncome += amt;
        if (!byMonth[monthKey]) byMonth[monthKey] = { month: monthKey, income: 0, expenses: 0 };
        byMonth[monthKey].income += amt;
      } else {
        totalExpenses += amt;
        if (!byCategory[cat.name]) byCategory[cat.name] = { name: cat.name, icon: cat.icon, color: cat.color, amount: 0, count: 0 };
        byCategory[cat.name].amount += amt;
        byCategory[cat.name].count += 1;
        if (!byMonth[monthKey]) byMonth[monthKey] = { month: monthKey, income: 0, expenses: 0 };
        byMonth[monthKey].expenses += amt;
      }
    });

    return { totalIncome, totalExpenses, byCategory, byMonth };
  }

  const current = aggregate(txs);
  const previous = aggregate(prevTxs);

  // ── Subscriptions ──────────────────────────────────────────────────
  const subs = await prisma.recurringPayment.findMany({ where: { userId, deletedAt: null, active: true } });
  const subsTotal = (subs as { amount: unknown }[]).reduce((sum: number, s: { amount: unknown }) => sum + toNumber(s.amount), 0);

  // ── Goals ──────────────────────────────────────────────────────────
  const goals = await prisma.goal.findMany({ where: { userId, deletedAt: null } });
  const goalsData = (goals as { name: string; icon: string; color: string; target: unknown; saved: unknown }[]).map((g) => ({
    name: g.name, icon: g.icon, color: g.color,
    target: toNumber(g.target), saved: toNumber(g.saved),
    percentage: toNumber(g.target) > 0 ? Math.round((toNumber(g.saved) / toNumber(g.target)) * 100) : 0,
  }));

  // ── Response ───────────────────────────────────────────────────────
  const sortedCategories = (Object.values(current.byCategory) as { amount: number }[]).sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount);
  const sortedMonths = (Object.values(current.byMonth) as { month: string }[]).sort((a: { month: string }, b: { month: string }) => a.month.localeCompare(b.month));

  return NextResponse.json({
    period: { start: start.toISOString(), end: end.toISOString() },
    summary: {
      income: current.totalIncome,
      expenses: current.totalExpenses,
      balance: current.totalIncome - current.totalExpenses,
      savingsRate: current.totalIncome > 0 ? Math.round(((current.totalIncome - current.totalExpenses) / current.totalIncome) * 100) : 0,
      transactionCount: txs.length,
      subscriptionsTotal: subsTotal,
    },
    comparison: {
      income: previous.totalIncome,
      expenses: previous.totalExpenses,
      balance: previous.totalIncome - previous.totalExpenses,
      savingsRate: previous.totalIncome > 0 ? Math.round(((previous.totalIncome - previous.totalExpenses) / previous.totalIncome) * 100) : 0,
      transactionCount: prevTxs.length,
    },
    categories: sortedCategories,
    monthly: sortedMonths,
    goals: goalsData,
  });
}
