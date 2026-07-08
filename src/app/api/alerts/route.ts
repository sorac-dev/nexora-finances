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

  // 2. Credit cards — upcoming cut/payment (billing-cycle aware)
  const cards = await prisma.creditCard.findMany({ where: { userId, deletedAt: null } });
  const today = now.getDate();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // Fetch all card payment transactions in one query to check "already paid"
  const cardPayments = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      type: "expense",
      cardId: { not: null },
      description: { contains: "Pago" },
      date: { gte: new Date(thisYear, thisMonth - 1, 1) }, // last 2 months cover all cycles
    },
    select: { cardId: true, date: true },
  });

  for (const c of cards) {
    if (c.type !== "credito") continue;

    const cutPassedThisMonth = today >= c.cutDay;
    const cutMonth = cutPassedThisMonth ? thisMonth : (thisMonth === 0 ? 11 : thisMonth - 1);
    const cutYear = cutPassedThisMonth ? thisYear : (thisMonth === 0 ? thisYear - 1 : thisYear);
    const cutDate = new Date(cutYear, cutMonth, c.cutDay);

    const dueSameMonth = c.dueDay > c.cutDay;
    const dueMonth = dueSameMonth ? cutMonth : (cutMonth === 11 ? 0 : cutMonth + 1);
    const dueYear = (!dueSameMonth && cutMonth === 11) ? cutYear + 1 : cutYear;
    const dueDate = new Date(dueYear, dueMonth, c.dueDay);

    const nextCutDate = cutPassedThisMonth
      ? new Date(thisYear, thisMonth + 1, c.cutDay)
      : new Date(thisYear, thisMonth, c.cutDay);
    const daysUntilCut = Math.ceil((nextCutDate.getTime() - now.getTime()) / 86400000);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

    // Check if already paid this billing cycle
    const alreadyPaid = cardPayments.some(
      (p: { cardId: string | null; date: Date }) => p.cardId === c.id && new Date(p.date) >= cutDate
    );

    // ── Cut alert ───────────────────────────────────────────────────
    if (daysUntilCut >= 0 && daysUntilCut <= 7) {
      alerts.push({
        icon: "CreditCard", text: `Corte próximo: ${c.name}`,
        sub: daysUntilCut === 0 ? "La fecha de corte es hoy" : `Fecha de corte en ${daysUntilCut} días (día ${c.cutDay})`,
        tone: daysUntilCut <= 2 ? "warn" : "info",
      });
    }

    // ── Due alert (only if not already paid) ────────────────────────
    if (!alreadyPaid && daysUntilDue >= 0 && daysUntilDue <= 7) {
      alerts.push({
        icon: "Banknote", text: `Pago próximo: ${c.name}`,
        sub: daysUntilDue === 0 ? "La fecha límite de pago es hoy" : `Fecha límite en ${daysUntilDue} días (día ${c.dueDay})`,
        tone: daysUntilDue <= 2 ? "urgent" : "warn",
      });
    }

    // ── Overdue alert (only if not already paid) ────────────────────
    if (!alreadyPaid && daysUntilDue < 0 && cutPassedThisMonth) {
      alerts.push({
        icon: "AlertCircle", text: `Pago vencido: ${c.name}`,
        sub: `La fecha límite era el ${c.dueDay} de ${["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][dueMonth]}`,
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
