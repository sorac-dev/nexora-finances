import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const alerts: { icon: string; text: string; sub: string; tone: "urgent" | "warn" | "info" }[] = [];
  const now = new Date();

  // 1. Gastos fijos + 2. Tarjetas — unified ledger query
  const { getPendingPayments } = await import("@/src/lib/ledger");
  const { getPaymentStatus } = await import("@/src/lib/cycle");
  const pendingResults = await getPendingPayments(userId);
  const pendingSubs = pendingResults.filter((p) => p.source === "sub");

  for (const p of pendingSubs) {
    const dueDay = parseInt(p.dueDate.split("-")[2]) || 1;
    const deadlineDay = parseInt(p.deadline.split("-")[2]) || dueDay;
    const status = getPaymentStatus(dueDay, deadlineDay, now);

    if (status.status === "overdue") {
      alerts.push({
        icon: "AlertCircle", text: `${p.name}`,
        sub: `${status.label} — ${p.amount > 0 ? toNumber(p.amount).toLocaleString("es-CO") : ""}`,
        tone: "urgent",
      });
    } else if (status.status === "in_window" && status.daysRemaining <= 3) {
      alerts.push({
        icon: "AlertTriangle", text: `${p.name}`,
        sub: `${status.label} — ${p.amount > 0 ? toNumber(p.amount).toLocaleString("es-CO") : ""}`,
        tone: status.daysRemaining <= 1 ? "urgent" : "warn",
      });
    }
  }

  // 2. Credit cards — same pendingPayments call, already loaded
  const pendingCards = pendingResults.filter((p) => p.source === "card");
  for (const p of pendingCards) {
    const dueDay = parseInt(p.dueDate.split("-")[2]) || 1;
    const deadlineDay = parseInt(p.deadline.split("-")[2]) || dueDay;
    const status = getPaymentStatus(dueDay, deadlineDay, now);

    if (status.status === "overdue") {
      alerts.push({ icon: "AlertCircle", text: `${p.name}`, sub: status.label, tone: "urgent" });
    } else if (status.status === "in_window" && status.daysRemaining <= 7) {
      alerts.push({
        icon: "Banknote", text: `${p.name}`,
        sub: status.label,
        tone: status.daysRemaining <= 2 ? "urgent" : "warn",
      });
    }
  }

  // 3. Goals — near target or overdue
  const goals = await prisma.goal.findMany({ where: { userId, deletedAt: null } });
  for (const g of goals) {
    const pct = toNumber(g.target) > 0 ? Math.round((toNumber(g.saved) / toNumber(g.target)) * 100) : 0;
    if (pct >= 90 && pct < 100) {
      alerts.push({
        icon: "Target", text: `Meta cercana: ${g.name}`,
        sub: `¡Ya tienes el ${pct}%! Te faltan ${(toNumber(g.target) - toNumber(g.saved)).toLocaleString("es-CO")}`,
        tone: "info",
      });
    }
    const remaining = Math.ceil((g.targetDate.getTime() - now.getTime()) / 86400000);
    if (remaining > 0 && remaining <= 30 && pct < 70) {
      alerts.push({
        icon: "Target", text: `Meta en riesgo: ${g.name}`,
        sub: `Quedan ${remaining} días y solo llevas el ${pct}%`,
        tone: "warn",
      });
    }
  }

  // 4. Security — PIN not configured
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { securityPin: true } });
  if (!user?.securityPin) {
    alerts.push({
      icon: "Shield", text: "Configura tu PIN de seguridad",
      sub: "Protege eliminaciones y cambios de perfil con un PIN de 4 dígitos.",
      tone: "info",
    });
  }

  // Sort: urgent first, then warn, then info
  const order = { urgent: 0, warn: 1, info: 2 };
  alerts.sort((a: { tone: "urgent" | "warn" | "info" }, b: { tone: "urgent" | "warn" | "info" }) => order[a.tone] - order[b.tone]);

  return NextResponse.json(alerts.slice(0, 20));
}
