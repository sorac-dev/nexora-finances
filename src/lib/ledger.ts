// ═══════════════════════════════════════════════════════════════
// LEDGER — Motor de cálculo financiero (server-side only)
// Importa Prisma — NUNCA importar desde componentes cliente.
// Para funciones puras (sin DB) usar @/src/lib/cycle.ts
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/src/lib/prisma";
import { toNumber } from "@/src/lib/db-helpers";

// Re-export pure functions from cycle.ts
export { getPaymentStatus, getCycleKey, getNextDueDate } from "@/src/lib/cycle";
export type { PaymentStatus } from "@/src/lib/cycle";

// ─── Balance (SQL aggregation, no stored field) ────────────────

export async function getBalance(userId: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) as total FROM \`Transaction\` WHERE userId = ? AND deletedAt IS NULL`,
    userId
  ) as { total: number }[];
  return Number(rows[0].total);
}

export async function getMonthStats(userId: string, year: number, month: number): Promise<{ income: number; expenses: number }> {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income, COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expenses FROM \`Transaction\` WHERE userId = ? AND deletedAt IS NULL AND date >= ? AND date < ?`,
    userId, start, end
  ) as { income: number; expenses: number }[];
  return { income: Number(rows[0].income), expenses: Number(rows[0].expenses) };
}

// ─── Pending payments ──────────────────────────────────────────

interface PendingPayment {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  deadline: string;
  icon: string;
  source: "sub" | "card";
}

export async function getPendingPayments(userId: string): Promise<PendingPayment[]> {
  const now = new Date();
  const todayDay = now.getDate();
  const pending: PendingPayment[] = [];

  const { getCycleKey, getNextDueDate } = await import("@/src/lib/cycle");

  // 1. Subscriptions
  const subs = await prisma.recurringPayment.findMany({
    where: { userId, deletedAt: null, active: true },
    select: {
      id: true, name: true, amount: true, frequency: true,
      icon: true, firstDueDate: true, firstDeadlineDate: true,
      dueDate: true, deadline: true,
    },
  });

  for (const sub of subs) {
    const firstDue = sub.firstDueDate || sub.dueDate;
    const firstDead = sub.firstDeadlineDate || sub.deadline;
    const dueDay = new Date(firstDue).getDate();
    let currentCycleDate = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
    if (currentCycleDate.getTime() > now.getTime()) currentCycleDate.setMonth(currentCycleDate.getMonth() - 1);
    const cycleKey = getCycleKey(currentCycleDate, sub.frequency);
    const nextDue = getNextDueDate(firstDue, sub.frequency, now);
    const nextDead = getNextDueDate(firstDead, sub.frequency, now);

    const paid = await prisma.transaction.count({
      where: { userId, deletedAt: null, subscriptionId: sub.id, cycleKey },
    });

    if (paid === 0) {
      pending.push({
        id: sub.id, name: sub.name, amount: toNumber(sub.amount),
        dueDate: nextDue.toISOString().split("T")[0],
        deadline: nextDead.toISOString().split("T")[0],
        icon: sub.icon || "FileText", source: "sub",
      });
    }
  }

  // 2. Credit cards
  const cards = await prisma.creditCard.findMany({
    where: { userId, deletedAt: null, type: "credito" },
    select: { id: true, name: true, cutDay: true, dueDay: true, icon: true },
  });

  for (const c of cards) {
    if (!c.cutDay || !c.dueDay) continue;
    if (todayDay < c.cutDay) continue;
    if (todayDay > c.dueDay) continue;

    let cutDate = new Date(now.getFullYear(), now.getMonth(), c.cutDay);
    if (cutDate.getTime() > now.getTime()) cutDate.setMonth(cutDate.getMonth() - 1);
    const cycleKey = `${cutDate.getFullYear()}-${String(cutDate.getMonth() + 1).padStart(2, "0")}-${String(cutDate.getDate()).padStart(2, "0")}`;

    const paid = await prisma.transaction.count({
      where: { userId, deletedAt: null, type: "expense", cardId: c.id, cycleKey },
    });

    if (paid === 0) {
      const nextDayDate = (day: number) => {
        let d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
        while (d.getTime() < now.getTime() - 86400000) d.setMonth(d.getMonth() + 1);
        return d;
      };
      pending.push({
        id: c.id, name: c.name, amount: 0,
        dueDate: nextDayDate(c.cutDay).toISOString().split("T")[0],
        deadline: nextDayDate(c.dueDay).toISOString().split("T")[0],
        icon: c.icon || "CreditCard", source: "card",
      });
    }
  }

  return pending.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
}

// ─── Calendar events ───────────────────────────────────────────

export interface CalendarEvent {
  day: number;
  label: string;
  type: "corte" | "limite" | "tarjeta_corte" | "tarjeta_pago" | "meta";
  details: string;
  icon: string;
  color: string;
  paid?: boolean;
  statusLabel?: string;
  id?: string;
}

export async function getCalendarEvents(userId: string, year: number, month: number): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  const now = new Date();
  const { getNextDueDate, getCycleKey, getPaymentStatus } = await import("@/src/lib/cycle");

  // Fetch all paid cycleKeys for this user in one query
  const paidTxs = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, cycleKey: { not: null } },
    select: { subscriptionId: true, cardId: true, cycleKey: true },
  });
  const paidSubKeys = new Set<string>();
  const paidCardKeys = new Set<string>();
  for (const tx of paidTxs) {
    if (tx.subscriptionId && tx.cycleKey) paidSubKeys.add(`${tx.subscriptionId}:${tx.cycleKey}`);
    if (tx.cardId && tx.cycleKey) paidCardKeys.add(`${tx.cardId}:${tx.cycleKey}`);
  }

  // 1. Subscriptions
  const subs = await prisma.recurringPayment.findMany({
    where: { userId, deletedAt: null, active: true },
    select: { id: true, name: true, icon: true, firstDueDate: true, firstDeadlineDate: true, dueDate: true, deadline: true, frequency: true },
  });

  for (const sub of subs) {
    const firstDue = sub.firstDueDate || sub.dueDate;
    const firstDead = sub.firstDeadlineDate || sub.deadline;
    const base = new Date(year, month, 1);
    const nextDue = getNextDueDate(firstDue, sub.frequency, base);
    const nextDead = getNextDueDate(firstDead, sub.frequency, base);

    // Payment cycle key for this month's occurrence
    const dueDay = new Date(firstDue).getDate();
    const deadDay = new Date(firstDead).getDate();
    let cycleDate = new Date(year, month, Math.min(dueDay, new Date(year, month + 1, 0).getDate()));
    if (cycleDate.getTime() > now.getTime()) cycleDate.setMonth(cycleDate.getMonth() - 1);
    const cycleKey = getCycleKey(cycleDate, sub.frequency);
    const paid = paidSubKeys.has(`${sub.id}:${cycleKey}`);
    const status = getPaymentStatus(dueDay, deadDay, now);
    const isThisMonth = nextDue.getMonth() === month && nextDue.getFullYear() === year;
    const isFuture = nextDue.getTime() > now.getTime() + 86400000 * 5;

    if (isThisMonth && nextDue.getDate() >= 1) {
      let color = "#FF9F43";
      let detailLabel = "Fecha de corte";
      if (paid) { color = "var(--c-save)"; detailLabel = "Pagado este ciclo"; }
      else if (status.status === "overdue") { color = "#FF6B6B"; detailLabel = status.label; }
      else if (status.status === "in_window") { color = status.color; detailLabel = status.label; }
      else if (isFuture) { color = "var(--c-blue)"; detailLabel = status.label; }

      events.push({
        day: nextDue.getDate(), label: sub.name, type: "corte",
        details: detailLabel, icon: sub.icon || "FileText", color,
        paid, statusLabel: detailLabel, id: `${sub.id}-cut`,
      });
    }
    // Show deadline only if not paid and in current/future month
    if (isThisMonth && !paid && nextDead.getMonth() === month && nextDead.getFullYear() === year) {
      events.push({
        day: nextDead.getDate(), label: sub.name, type: "limite",
        details: status.status === "overdue" ? status.label : "Fecha limite de pago",
        icon: sub.icon || "FileText", color: status.status === "overdue" ? "#FF6B6B" : "#FF9F43",
        paid: false, id: `${sub.id}-dead`,
      });
    }
  }

  // 2. Credit cards
  const cards = await prisma.creditCard.findMany({
    where: { userId, deletedAt: null, type: "credito" },
    select: { id: true, name: true, cutDay: true, dueDay: true },
  });

  for (const c of cards) {
    if (!c.cutDay || !c.dueDay) continue;

    let cutDate = new Date(year, month, Math.min(c.cutDay, new Date(year, month + 1, 0).getDate()));
    const cycleKey = `${cutDate.getFullYear()}-${String(cutDate.getMonth() + 1).padStart(2, "0")}-${String(cutDate.getDate()).padStart(2, "0")}`;
    const paid = paidCardKeys.has(`${c.id}:${cycleKey}`);
    const status = getPaymentStatus(c.cutDay, c.dueDay, now);

    if (c.cutDay) {
      let color = "#8B5CF6";
      let detail = "Fecha de corte";
      if (paid) { color = "var(--c-save)"; detail = "Pagado este ciclo"; }
      else if (status.status === "in_window") { detail = status.label; color = status.color; }
      events.push({ day: c.cutDay, label: c.name, type: "tarjeta_corte", details: detail, icon: "CreditCard", color, paid, id: `${c.id}-cut` });
    }
    if (c.dueDay && !paid) {
      events.push({ day: c.dueDay, label: c.name, type: "tarjeta_pago", details: status.label, icon: "Banknote", color: status.status === "overdue" ? "#FF6B6B" : "#8B5CF6", paid: false, id: `${c.id}-due` });
    }
  }

  // 3. Goals (unchanged)
  const goals = await prisma.goal.findMany({
    where: { userId, deletedAt: null, targetDate: { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) } },
    select: { name: true, icon: true, color: true, targetDate: true },
  });

  for (const g of goals) {
    events.push({ day: new Date(g.targetDate).getDate(), label: g.name, type: "meta", details: "Fecha objetivo", icon: g.icon || "Target", color: g.color || "#0A84FF" });
  }

  return events;
}
