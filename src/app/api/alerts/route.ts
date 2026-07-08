import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const alerts: { icon: string; text: string; sub: string; tone: "urgent" | "warn" | "info" }[] = [];
  const now = new Date();

  // 1. Gastos fijos — overdue or upcoming
  const subs = await prisma.recurringPayment.findMany({ where: { userId, deletedAt: null, active: true } });

  for (const s of subs) {
    const dueDate = new Date(s.dueDate);
    const deadDate = new Date(s.deadline);
    const dueIn = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
    const deadIn = Math.ceil((deadDate.getTime() - now.getTime()) / 86400000);

    if (dueIn < 0) {
      alerts.push({
        icon: "AlertCircle", text: `Pago vencido: ${s.name}`,
        sub: `Venció hace ${Math.abs(dueIn)} días — ${toNumber(s.amount).toLocaleString("es-CO")}`,
        tone: "urgent",
      });
    } else if (dueIn === 0) {
      alerts.push({
        icon: "AlertTriangle", text: `Pago hoy: ${s.name}`,
        sub: `${toNumber(s.amount).toLocaleString("es-CO")} — vence hoy`,
        tone: "warn",
      });
    } else if (dueIn <= 3) {
      alerts.push({
        icon: "AlertTriangle", text: `Pago próximo: ${s.name}`,
        sub: `Vence en ${dueIn} días — ${toNumber(s.amount).toLocaleString("es-CO")}`,
        tone: "warn",
      });
    }

    if (deadIn < 0 && deadIn !== dueIn) {
      alerts.push({
        icon: "AlertCircle", text: `Plazo vencido: ${s.name}`,
        sub: `El plazo límite venció hace ${Math.abs(deadIn)} días`,
        tone: "urgent",
      });
    }
  }

  // 2. Credit cards — same logic as dashboard "Próximos pagos"
  const cards = await prisma.creditCard.findMany({ where: { userId, deletedAt: null } });

  // Check which cards already have a payment this cycle
  const cardPayments = await prisma.transaction.findMany({
    where: {
      userId, deletedAt: null, type: "expense",
      cardId: { not: null },
      description: { contains: "Pago" },
      date: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1) },
    },
    select: { cardId: true, date: true },
  });

  const nextDayDate = (day: number) => {
    let d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
    while (d.getTime() < now.getTime() - 86400000) d.setMonth(d.getMonth() + 1);
    return d;
  };

  for (const c of cards) {
    if (c.type !== "credito" || !c.cutDay || !c.dueDay) continue;

    const cutDate = nextDayDate(c.cutDay);
    const dueDate = nextDayDate(c.dueDay);

    // Check if already paid since last cut
    const lastCutPassed = new Date(now.getFullYear(), now.getMonth(), c.cutDay);
    if (lastCutPassed.getTime() > now.getTime()) lastCutPassed.setMonth(lastCutPassed.getMonth() - 1);
    const alreadyPaid = cardPayments.some(
      (p: { cardId: string | null; date: Date }) => p.cardId === c.id && new Date(p.date) >= lastCutPassed
    );

    const daysUntilCut = Math.ceil((cutDate.getTime() - now.getTime()) / 86400000);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

    // Cut alert
    if (daysUntilCut >= 0 && daysUntilCut <= 7) {
      alerts.push({
        icon: "CreditCard", text: `Corte próximo: ${c.name}`,
        sub: daysUntilCut === 0 ? "La fecha de corte es hoy" : `Fecha de corte en ${daysUntilCut} días (día ${c.cutDay})`,
        tone: daysUntilCut <= 2 ? "warn" : "info",
      });
    }

    // Due alert (only if not already paid)
    if (!alreadyPaid && daysUntilDue >= 0 && daysUntilDue <= 7) {
      alerts.push({
        icon: "Banknote", text: `Pago próximo: ${c.name}`,
        sub: daysUntilDue === 0 ? "La fecha límite de pago es hoy" : `Fecha límite en ${daysUntilDue} días (día ${c.dueDay})`,
        tone: daysUntilDue <= 2 ? "urgent" : "warn",
      });
    }

    // Overdue alert (only if not already paid)
    if (!alreadyPaid && daysUntilDue < 0 && daysUntilDue >= -30) {
      alerts.push({
        icon: "AlertCircle", text: `Pago vencido: ${c.name}`,
        sub: `La fecha límite venció hace ${Math.abs(daysUntilDue)} días (día ${c.dueDay})`,
        tone: "urgent",
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
