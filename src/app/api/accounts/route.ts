import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const account = await prisma.financialAccount.findFirst({ where: { userId, deletedAt: null } });

  // Calculate balance via SQL aggregation — fast and accurate
  const incomeRows = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM(amount), 0) as total FROM \`Transaction\` WHERE userId = ? AND type = 'income' AND deletedAt IS NULL`,
    userId
  ) as { total: number }[];
  const expenseRows = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM(amount), 0) as total FROM \`Transaction\` WHERE userId = ? AND type = 'expense' AND deletedAt IS NULL`,
    userId
  ) as { total: number }[];

  const balance = Number(incomeRows[0].total) - Number(expenseRows[0].total);

  // Sync the FinancialAccount for atomic updates on new transactions
  if (account) {
    await prisma.financialAccount.update({
      where: { id: account.id },
      data: { balance },
    }).catch(() => {});
  }

  return NextResponse.json({ balance, name: account?.name || "Cuenta Principal" });
}
