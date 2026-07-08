import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";
import webpush from "web-push";

// Ensure VAPID is configured once
let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY || "";
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
  if (vapidPublic && vapidPrivate) {
    webpush.setVapidDetails("mailto:contact@nexora.app", vapidPublic, vapidPrivate);
    vapidReady = true;
    return true;
  }
  return false;
}

interface PushAlert {
  title: string;
  body: string;
  tag: string;
  urgent: boolean;
  url: string;
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!ensureVapid()) {
    return NextResponse.json({ alerts: 0, urgent: 0, sent: 0, message: "VAPID no configurado" });
  }

  const now = new Date();
  const today = now.getDate();
  const alerts: PushAlert[] = [];

  // ── Load user notification preferences ──────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifPrefs: true },
  });
  const prefs = (user?.notifPrefs as Record<string, boolean>) || {};
  const pref = (key: string) => prefs[key] !== false; // default true

  // ── 1. Gastos fijos ──────────────────────────────────────────────────
  if (pref("upcoming")) {
    const subs = await prisma.recurringPayment.findMany({ where: { userId, deletedAt: null, active: true } });
    for (const s of subs) {
      const dueIn = Math.ceil((new Date(s.dueDate).getTime() - now.getTime()) / 86400000);
      const deadIn = Math.ceil((new Date(s.deadline).getTime() - now.getTime()) / 86400000);

      if (dueIn <= 0) {
        if (pref("sameDay")) alerts.push({ title: "Pago vencido", body: `${s.name} venció hace ${Math.abs(dueIn)} días`, tag: `sub-overdue-${s.id}`, urgent: true, url: "/gastos-fijos" });
      } else if (dueIn === 1) {
        if (pref("daysBefore1")) alerts.push({ title: "Pago mañana", body: `${s.name}: ${toNumber(s.amount).toLocaleString("es-CO")}`, tag: `sub-tomorrow-${s.id}`, urgent: true, url: "/gastos-fijos" });
      } else if (dueIn <= 3) {
        if (pref("daysBefore3")) alerts.push({ title: "Pago próximo", body: `${s.name} vence en ${dueIn} días`, tag: `sub-soon-${s.id}`, urgent: false, url: "/gastos-fijos" });
      }

      if (deadIn < 0 && deadIn !== dueIn && pref("sameDay")) {
        alerts.push({ title: "Plazo vencido", body: `${s.name}: plazo límite venció hace ${Math.abs(deadIn)} días`, tag: `sub-dead-${s.id}`, urgent: true, url: "/gastos-fijos" });
      }
    }
  }

  // ── 2. Tarjetas de crédito ──────────────────────────────────────────
  if (pref("cut")) {
    const cards = await prisma.creditCard.findMany({ where: { userId, deletedAt: null } });

    // Fetch card payments to check "already paid this cycle"
    const cardPayments = await prisma.transaction.findMany({
      where: {
        userId, deletedAt: null, type: "expense",
        cardId: { not: null },
        description: { contains: "Pago" },
        date: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1) },
      },
      select: { cardId: true, date: true },
    });

    for (const c of cards) {
      if (c.type !== "credito") continue;

      const cutPassedThisMonth = today >= c.cutDay;
      const cutMonth = cutPassedThisMonth ? now.getMonth() : (now.getMonth() === 0 ? 11 : now.getMonth() - 1);
      const cutYear = cutPassedThisMonth ? now.getFullYear() : (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
      const cutDate = new Date(cutYear, cutMonth, c.cutDay);

      const dueSameMonth = c.dueDay > c.cutDay;
      const dueMonth = dueSameMonth ? cutMonth : (cutMonth === 11 ? 0 : cutMonth + 1);
      const dueYear = (!dueSameMonth && cutMonth === 11) ? cutYear + 1 : cutYear;
      const dueDate = new Date(dueYear, dueMonth, c.dueDay);

      const nextCutDate = cutPassedThisMonth
        ? new Date(now.getFullYear(), now.getMonth() + 1, c.cutDay)
        : new Date(now.getFullYear(), now.getMonth(), c.cutDay);
      const cutIn = Math.ceil((nextCutDate.getTime() - now.getTime()) / 86400000);
      const dueIn = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

      // Check if already paid this billing cycle
      const alreadyPaid = cardPayments.some(
        (p: { cardId: string | null; date: Date }) => p.cardId === c.id && new Date(p.date) >= cutDate
      );

      if (cutIn >= 0 && cutIn <= 3) {
        const days = cutIn === 0 ? "hoy" : `en ${cutIn} días`;
        if (cutIn === 0 ? pref("sameDay") : cutIn === 1 ? pref("daysBefore1") : pref("daysBefore3")) {
          alerts.push({ title: "Corte de tarjeta", body: `${c.name}: corte ${days}`, tag: `card-cut-${c.id}`, urgent: cutIn <= 1, url: `/cards/${c.id}` });
        }
      }
      if (!alreadyPaid && dueIn >= 0 && dueIn <= 3) {
        const days = dueIn === 0 ? "hoy" : `en ${dueIn} días`;
        if (dueIn === 0 ? pref("sameDay") : dueIn === 1 ? pref("daysBefore1") : pref("daysBefore3")) {
          alerts.push({ title: "Pago de tarjeta", body: `${c.name}: límite ${days}`, tag: `card-due-${c.id}`, urgent: dueIn <= 1, url: `/cards/${c.id}` });
        }
      }
    }
  }

  // ── 3. Goals ────────────────────────────────────────────────────────
  if (pref("goals")) {
    const goals = await prisma.goal.findMany({ where: { userId, deletedAt: null } });
    for (const g of goals) {
      const pct = toNumber(g.target) > 0 ? Math.round((toNumber(g.saved) / toNumber(g.target)) * 100) : 0;
      if (pct >= 90 && pct < 100) {
        alerts.push({ title: "¡Meta cerca!", body: `${g.name}: ya tienes el ${pct}%`, tag: `goal-near-${g.id}`, urgent: false, url: "/goals" });
      }
      const remaining = Math.ceil((new Date(g.targetDate).getTime() - now.getTime()) / 86400000);
      if (remaining > 0 && remaining <= 30 && pct < 70) {
        alerts.push({ title: "Meta en riesgo", body: `${g.name}: ${remaining} días y solo ${pct}%`, tag: `goal-risk-${g.id}`, urgent: remaining <= 7, url: "/goals" });
      }
    }
  }

  // ── Send push notifications ────────────────────────────────────────
  let sent = 0;
  const pushSubs = await prisma.pushSubscription.findMany({ where: { userId } });

  if (alerts.length > 0 && pushSubs.length > 0) {
    const urgentAlerts = alerts.filter((a: { urgent: boolean }) => a.urgent);
    const toSend = urgentAlerts.length > 0 ? urgentAlerts.slice(0, 5) : alerts.slice(0, 3);

    for (const sub of pushSubs) {
      for (const alert of toSend) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              title: alert.title,
              body: alert.body,
              tag: alert.tag,
              data: { url: alert.url },
            })
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

  return NextResponse.json({
    alerts: alerts.length,
    urgent: alerts.filter((a: { urgent: boolean }) => a.urgent).length,
    sent,
  });
}
