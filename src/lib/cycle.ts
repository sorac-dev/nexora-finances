// ═══════════════════════════════════════════════════════════════
// CYCLE — Funciones puras de cálculo de fechas y ciclos
// NO importan Prisma, NO tocan DB. Se pueden usar en cliente.
// ═══════════════════════════════════════════════════════════════

export type PaymentStatus = "upcoming" | "in_window" | "overdue" | "paid";

export function getPaymentStatus(
  dueDay: number,
  deadlineDay: number,
  today: Date = new Date()
): { status: PaymentStatus; label: string; daysRemaining: number; color: string } {
  const todayDay = today.getDate();

  let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
  let deadlineDate = new Date(today.getFullYear(), today.getMonth(), deadlineDay);

  // Handle cross-month: if deadline < due (e.g., due=27, deadline=4)
  if (deadlineDay < dueDay) {
    deadlineDate.setMonth(deadlineDate.getMonth() + 1);
  }

  // If today is before due, the current cycle started last month
  if (todayDay < dueDay) {
    dueDate.setMonth(dueDate.getMonth() - 1);
    if (deadlineDay < dueDay) {
      deadlineDate.setMonth(deadlineDate.getMonth() - 1);
    }
  }

  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
  const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - today.getTime()) / 86400000);

  if (daysUntilDue > 0) {
    return {
      status: "upcoming",
      label: `Disponible en ${daysUntilDue} dia${daysUntilDue === 1 ? "" : "s"}`,
      daysRemaining: daysUntilDue,
      color: "var(--c-blue)",
    };
  }

  if (daysUntilDeadline >= 0) {
    return {
      status: "in_window",
      label: `En ciclo de pago - ${daysUntilDeadline === 0 ? "hoy es el ultimo dia" : `${daysUntilDeadline} dia${daysUntilDeadline === 1 ? "" : "s"} para fecha limite`}`,
      daysRemaining: daysUntilDeadline,
      color: daysUntilDeadline <= 2 ? "#FF9F43" : "var(--c-save)",
    };
  }

  const overdueDays = Math.abs(daysUntilDeadline);
  return {
    status: "overdue",
    label: `Pago atrasado - ${overdueDays} dia${overdueDays === 1 ? "" : "s"}`,
    daysRemaining: overdueDays,
    color: "#FF6B6B",
  };
}

export function getCycleKey(date: Date, frequency: string): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  switch (frequency) {
    case "weekly": return `${y}-W${Math.ceil(d / 7)}`;
    case "annual": return `${y}`;
    default: return `${y}-${String(m + 1).padStart(2, "0")}`;
  }
}

export function getNextDueDate(firstDate: Date, frequency: string, fromDate: Date): Date {
  const first = new Date(firstDate);
  const now = new Date(fromDate);

  if (frequency === "weekly") {
    const diffMs = now.getTime() - first.getTime();
    const weeksPassed = Math.floor(diffMs / (7 * 86400000));
    let next = new Date(first);
    next.setDate(next.getDate() + weeksPassed * 7);
    while (next.getTime() < now.getTime() - 86400000) next.setDate(next.getDate() + 7);
    return next;
  }

  if (frequency === "annual") {
    let next = new Date(now.getFullYear(), first.getMonth(), Math.min(first.getDate(), new Date(now.getFullYear(), first.getMonth() + 1, 0).getDate()));
    if (next.getTime() < now.getTime() - 86400000) next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  let next = new Date(now.getFullYear(), now.getMonth(), Math.min(first.getDate(), new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
  if (next.getTime() < now.getTime() - 86400000) next.setMonth(next.getMonth() + 1);
  return next;
}
