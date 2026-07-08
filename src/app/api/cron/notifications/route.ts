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

  const nextDayDate = (day: number) => {
    let d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
    while (d.getTime() < now.getTime() - 86400000) d.setMonth(d.getMonth() + 1);
    return d;
  };

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

    // 1. Gastos fijos
    if (pref("upcoming")) {
      const subs = await prisma.recurringPayment.findMany({ where: { userId, deletedAt: null, active: true } });
      for (const s of subs) {
        const dueIn = Math.ceil((new Date(s.dueDate).getTime() - now.getTime()) / 86400000);
        const deadIn = Math.ceil((new Date(s.deadline).getTime() - now.getTime()) / 86400000);

        if (dueIn <= 0 && pref("sameDay")) {
          alerts.push({ title: "Pago vencido", body: `${s.name} vencio hace ${Math.abs(dueIn)} dias`, tag: `sub-overdue-${s.id}`, urgent: true, url: "/gastos-fijos" });
        } else if (dueIn === 1 && pref("daysBefore1")) {
          alerts.push({ title: "Pago manana", body: `${s.name}: ${toNumber(s.amount).toLocaleString("es-CO")}`, tag: `sub-tomorrow-${s.id}`, urgent: true, url: "/gastos-fijos" });
        } else if (dueIn <= 3 && pref("daysBefore3")) {
          alerts.push({ title: "Pago proximo", body: `${s.name} vence en ${dueIn} dias`, tag: `sub-soon-${s.id}`, urgent: false, url: "/gastos-fijos" });
        }
        if (deadIn < 0 && deadIn !== dueIn && pref("sameDay")) {
          alerts.push({ title: "Plazo vencido", body: `${s.name}: plazo limite vencio hace ${Math.abs(deadIn)} dias`, tag: `sub-dead-${s.id}`, urgent: true, url: "/gastos-fijos" });
        }
      }
    }

    // 2. Tarjetas de crédito
    if (pref("cut")) {
      const cards = await prisma.creditCard.findMany({ where: { userId, deletedAt: null } });
      const cardPayments = await prisma.transaction.findMany({
        where: { userId, deletedAt: null, type: "expense", cardId: { not: null }, description: { contains: "Pago" }, date: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1) } },
        select: { cardId: true, date: true },
      });

      for (const c of cards) {
        if (c.type !== "credito" || !c.cutDay || !c.dueDay) continue;
        const cutDate = nextDayDate(c.cutDay);
        const dueDate = nextDayDate(c.dueDay);
        const lastCutPassed = new Date(now.getFullYear(), now.getMonth(), c.cutDay);
        if (lastCutPassed.getTime() > now.getTime()) lastCutPassed.setMonth(lastCutPassed.getMonth() - 1);
        const alreadyPaid = cardPayments.some((p: { cardId: string | null; date: Date }) => p.cardId === c.id && new Date(p.date) >= lastCutPassed);
        const cutIn = Math.ceil((cutDate.getTime() - now.getTime()) / 86400000);
        const dueIn = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

        if (cutIn >= 0 && cutIn <= 3) {
          const days = cutIn === 0 ? "hoy" : `en ${cutIn} dias`;
          if (cutIn === 0 ? pref("sameDay") : cutIn === 1 ? pref("daysBefore1") : pref("daysBefore3")) {
            alerts.push({ title: "Corte de tarjeta", body: `${c.name}: corte ${days}`, tag: `card-cut-${c.id}`, urgent: cutIn <= 1, url: `/cards/${c.id}` });
          }
        }
        if (!alreadyPaid && dueIn >= 0 && dueIn <= 3) {
          const days = dueIn === 0 ? "hoy" : `en ${dueIn} dias`;
          if (dueIn === 0 ? pref("sameDay") : dueIn === 1 ? pref("daysBefore1") : pref("daysBefore3")) {
            alerts.push({ title: "Pago de tarjeta", body: `${c.name}: limite ${days}`, tag: `card-due-${c.id}`, urgent: dueIn <= 1, url: `/cards/${c.id}` });
          }
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
