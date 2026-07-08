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
    const { getPendingPayments } = await import("@/src/lib/ledger");
    const { getPaymentStatus } = await import("@/src/lib/cycle");
    const pendingSubs = (await getPendingPayments(userId)).filter((p) => p.source === "sub");

    for (const p of pendingSubs) {
      const dueDay = parseInt(p.dueDate.split("-")[2]) || 1;
      const deadlineDay = parseInt(p.deadline.split("-")[2]) || dueDay;
      const status = getPaymentStatus(dueDay, deadlineDay, now);

      if (status.status === "overdue" && pref("sameDay")) {
        alerts.push({ title: p.name, body: status.label, tag: `sub-overdue-${p.id}`, urgent: true, url: "/gastos-fijos" });
      } else if (status.status === "in_window") {
        if (status.daysRemaining <= 1 && pref("sameDay")) {
          alerts.push({ title: p.name, body: status.label, tag: `sub-due-${p.id}`, urgent: true, url: "/gastos-fijos" });
        } else if (status.daysRemaining <= 3 && pref("daysBefore3")) {
          alerts.push({ title: p.name, body: status.label, tag: `sub-soon-${p.id}`, urgent: false, url: "/gastos-fijos" });
        }
      }
    }
  }

  // ── 2. Tarjetas de crédito ──────────────────────────────────────────
  if (pref("cut")) {
    const { getPendingPayments } = await import("@/src/lib/ledger");
    const { getPaymentStatus } = await import("@/src/lib/cycle");
    const pendingCards = (await getPendingPayments(userId)).filter((p) => p.source === "card");

    for (const p of pendingCards) {
      const dueDay = parseInt(p.dueDate.split("-")[2]) || 1;
      const deadlineDay = parseInt(p.deadline.split("-")[2]) || dueDay;
      const status = getPaymentStatus(dueDay, deadlineDay, now);

      if (status.status === "in_window" && status.daysRemaining <= 3) {
        if (status.daysRemaining <= 1 && pref("sameDay")) {
          alerts.push({ title: p.name, body: status.label, tag: `card-due-${p.id}`, urgent: true, url: `/cards/${p.id}` });
        } else if (pref("daysBefore3")) {
          alerts.push({ title: p.name, body: status.label, tag: `card-due-${p.id}`, urgent: false, url: `/cards/${p.id}` });
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
