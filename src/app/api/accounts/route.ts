import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const account = await prisma.financialAccount.findFirst({ where: { userId, deletedAt: null } });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // All-time balance
  const incomeRows = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM(amount), 0) as total FROM \`Transaction\` WHERE userId = ? AND type = 'income' AND deletedAt IS NULL`,
    userId
  ) as { total: number }[];
  const expenseRows = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM(amount), 0) as total FROM \`Transaction\` WHERE userId = ? AND type = 'expense' AND deletedAt IS NULL`,
    userId
  ) as { total: number }[];

  const balance = Number(incomeRows[0].total) - Number(expenseRows[0].total);

  // Current month income/expenses (not limited by pagination)
  const monthIncomeRows = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM(amount), 0) as total FROM \`Transaction\` WHERE userId = ? AND type = 'income' AND deletedAt IS NULL AND date >= ?`,
    userId, monthStart
  ) as { total: number }[];
  const monthExpenseRows = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM(amount), 0) as total FROM \`Transaction\` WHERE userId = ? AND type = 'expense' AND deletedAt IS NULL AND date >= ?`,
    userId, monthStart
  ) as { total: number }[];

  const monthIncome = Number(monthIncomeRows[0].total);
  const monthExpenses = Number(monthExpenseRows[0].total);

  // Sync the FinancialAccount
  if (account) {
    await prisma.financialAccount.update({
      where: { id: account.id },
      data: { balance },
    }).catch(() => {});
  }

  return NextResponse.json({
    balance,
    monthIncome,
    monthExpenses,
    name: account?.name || "Cuenta Principal",
  });
}
