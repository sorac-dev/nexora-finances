import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { toNumber } from "@/src/lib/db-helpers";
import webpush from "web-push";

/**
 * Cron endpoint — called by systemd timer.
 * No auth required. Iterates ALL users with push subscriptions.
 */
export async function GET(request: NextRequest) {
  // Only systemd timer (or anyone with the CRON_SECRET) can trigger this
  const CRON_SECRET = process.env.CRON_SECRET || (process.env.BETTER_AUTH_SECRET || "").slice(0, 16);
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!token || token !== CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const vapidPublic = process.env.VAPID_PUBLIC_KEY || "";
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "VAPID no configurado" }, { status: 500 });
  }

  webpush.setVapidDetails("mailto:contact@nexorafinance.lat", vapidPublic, vapidPrivate);

  const now = new Date();
  let sent = 0;
  let usersChecked = 0;

  // Get all users with push subscriptions
  const userIds = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  for (const { userId } of userIds) {
    usersChecked++;
    const alerts: { title: string; body: string; tag: string; urgent: boolean; url: string }[] = [];

    // Load user prefs
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notifPrefs: true },
    });
    const prefs = (user?.notifPrefs as Record<string, boolean>) || {};
    const pref = (key: string) => prefs[key] !== false;

    // Use ledger for both subs and cards — cycleKey-aware, consistent wording
    const { getPendingPayments } = await import("@/src/lib/ledger");
    const { getPaymentStatus } = await import("@/src/lib/cycle");
    const pending = await getPendingPayments(userId);

    for (const p of pending) {
      const dueDay = parseInt(p.dueDate.split("-")[2]) || 1;
      const deadlineDay = parseInt(p.deadline.split("-")[2]) || dueDay;
      const status = getPaymentStatus(dueDay, deadlineDay, now);
      const url = p.source === "card" ? `/cards/${p.id}` : "/gastos-fijos";

      if (status.status === "overdue" && pref("sameDay")) {
        alerts.push({ title: p.name, body: status.label, tag: `${p.source}-overdue-${p.id}`, urgent: true, url });
      } else if (status.status === "in_window") {
        if (status.daysRemaining <= 1 && pref("sameDay")) {
          alerts.push({ title: p.name, body: status.label, tag: `${p.source}-due-${p.id}`, urgent: true, url });
        } else if (status.daysRemaining <= 3 && pref("daysBefore3")) {
          alerts.push({ title: p.name, body: status.label, tag: `${p.source}-soon-${p.id}`, urgent: false, url });
        }
      }
    }

    // 3. Goals
    if (pref("goals")) {
      const goals = await prisma.goal.findMany({ where: { userId, deletedAt: null } });
      for (const g of goals) {
        const pct = toNumber(g.target) > 0 ? Math.round((toNumber(g.saved) / toNumber(g.target)) * 100) : 0;
        if (pct >= 90 && pct < 100) {
          alerts.push({ title: "Meta cerca!", body: `${g.name}: ya tienes el ${pct}%`, tag: `goal-near-${g.id}`, urgent: false, url: "/goals" });
        }
        const remaining = Math.ceil((new Date(g.targetDate).getTime() - now.getTime()) / 86400000);
        if (remaining > 0 && remaining <= 30 && pct < 70) {
          alerts.push({ title: "Meta en riesgo", body: `${g.name}: ${remaining} dias y solo ${pct}%`, tag: `goal-risk-${g.id}`, urgent: remaining <= 7, url: "/goals" });
        }
      }
    }

    // Send push
    if (alerts.length > 0) {
      const pushSubs = await prisma.pushSubscription.findMany({ where: { userId } });
      const urgentAlerts = alerts.filter((a) => a.urgent);
      const toSend = urgentAlerts.length > 0 ? urgentAlerts.slice(0, 5) : alerts.slice(0, 3);

      for (const sub of pushSubs) {
        for (const alert of toSend) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({ title: alert.title, body: alert.body, tag: alert.tag, data: { url: alert.url } })
            );
            sent++;
          } catch (e: unknown) {
            const err = e as { statusCode?: number };
            if (err.statusCode === 410 || err.statusCode === 404) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ usersChecked, notificationsSent: sent, timestamp: now.toISOString() });
}
