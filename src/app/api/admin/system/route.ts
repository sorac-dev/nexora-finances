import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/admin-auth";

export async function GET(request: NextRequest) {
  const adminId = await requireAdmin(request);
  if (adminId instanceof NextResponse) return adminId;

  const smtpOk = !!(
    process.env.SMTP_HOST && process.env.SMTP_PASS && process.env.SMTP_FROM
  );
  const vapidOk = !!(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );

  // Rate limits — active and blocked
  const now = new Date();
  const blockedIps = await prisma.rateLimit.findMany({
    where: { expiresAt: { gte: now } },
    select: { key: true, count: true, expiresAt: true },
    orderBy: { count: "desc" },
    take: 20,
  });

  // Count push subscriptions
  const pushSubs = await prisma.pushSubscription.count();

  // DB stats
  const dbStats = {
    users: await prisma.user.count(),
    transactions: await prisma.transaction.count(),
    sessions: await prisma.session.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  return NextResponse.json({
    smtp: { configured: smtpOk, host: process.env.SMTP_HOST || "no configurado" },
    vapid: { configured: vapidOk, subject: process.env.VAPID_SUBJECT || "" },
    pushSubscriptions: pushSubs,
    rateLimits: (blockedIps as { key: string; count: number; expiresAt: Date }[]).map((r) => ({
      key: r.key.replace(/^rl:/, ""),
      count: r.count,
      expiresAt: r.expiresAt,
    })),
    database: dbStats,
    app: {
      env: process.env.NODE_ENV || "development",
      demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
      version: "0.1.0",
    },
  });
}
