import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/admin-auth";

export async function GET(request: NextRequest) {
  const userId = await requireAdmin(request);
  if (userId instanceof NextResponse) return userId;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const [
    totalUsers, todayUsers, weekUsers, activeUsers,
    totalTransactions, goals, cards, pinUsers,
    pushSentToday, recentUsers
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.session.groupBy({ by: ["userId"], where: { expiresAt: { gte: now } } }).then((r: { userId: string }[]) => r.length),
    prisma.transaction.count({ where: { deletedAt: null } }),
    prisma.goal.count({ where: { deletedAt: null } }),
    prisma.creditCard.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { securityPin: { not: null } } }),
    prisma.auditLog.count({ where: { action: "PUSH_SENT", createdAt: { gte: today } } }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    users: { total: totalUsers, today: todayUsers, week: weekUsers, active: activeUsers },
    transactions: totalTransactions,
    goals,
    cards,
    security: { pinUsers, pinRate: totalUsers > 0 ? Math.round((pinUsers / totalUsers) * 100) : 0 },
    pushSentToday,
    recentUsers,
  });
}
