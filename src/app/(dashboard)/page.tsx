"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "@/src/hooks/use-theme";
import { Fab } from "@/src/components/layout/fab";
import { ProgressBar } from "@/src/components/ui/progress-bar";
import { CardSkeleton, ListSkeleton } from "@/src/components/ui/skeleton";
import { Icon } from "@/src/components/ui/icon";
import { fmt, pct } from "@/src/utils/format";
import { fmtDateShort } from "@/src/lib/date";
import { useUIStore } from "@/src/stores/ui.store";

interface Overview {
  income: number; expenses: number; balance: number;
  upcomingPayments: { id: string; name: string; amount: number; dueDate: string; deadline: string; icon: string; source: string }[];
  goals: { id: string; name: string; icon: string; target: number; saved: number; color: string }[];
  userName: string;
  subscriptionsTotal: number;
  cardsCount: number;
}

function monthlyIncome(sources: { amount: number; frequency: string }[]): number {
  const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  return sources.reduce((s, src) => {
    if (src.frequency === "Diario") return s + src.amount * days;
    if (src.frequency === "Semanal") return s + src.amount * 4;
    if (src.frequency === "Quincenal") return s + src.amount * 2;
    return s + src.amount;
  }, 0);
}

export default function DashboardPage() {
  const { theme, toggleTheme } = useTheme();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState(true); // default true to avoid flash
  const showOpeningModal = useUIStore((s) => s.showOpeningModal);
  const setShowOpeningModal = useUIStore((s) => s.setShowOpeningModal);

  const load = useCallback(async () => {
    try {
      const [txsRes, subsRes, goalsRes, profileRes, cardsRes, pinRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/subscriptions"),
        fetch("/api/goals"),
        fetch("/api/user/profile"),
        fetch("/api/cards"),
        fetch("/api/user/security/pin"),
      ]);

      // Normalize a day number to the next occurrence this month
      const nextDayDate = (day: number) => {
        const now = new Date();
        let d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
        while (d.getTime() < now.getTime() - 86400000) d.setMonth(d.getMonth() + 1);
        return d.toISOString().split("T")[0];
      };

      const txs = txsRes.ok ? await txsRes.json() : { data: [] };
      const subs = subsRes.ok ? (await subsRes.json()).data || [] : [];
      const goals = goalsRes.ok ? await goalsRes.json() : [];
      const profile = profileRes.ok ? await profileRes.json() : { name: "Usuario" };
      const cards = cardsRes.ok ? await cardsRes.json() : [];
      if (pinRes.ok) { const d = await pinRes.json(); setHasPin(d.hasPin); }

      const monthIncome = txs.data.filter((t: { type: string }) => t.type === "income").reduce((s: number, t: { amount: number }) => s + t.amount, 0);
      const monthExpenses = txs.data.filter((t: { type: string }) => t.type === "expense").reduce((s: number, t: { amount: number }) => s + t.amount, 0);

      // Upcoming from active subscriptions (next 5)
      const activeSubs = subs.filter((s: { active: boolean }) => s.active);
      // Subscriptions upcoming
      const upcomingSubs = activeSubs.slice(0, 5).map((s: { id: string; name: string; amount: number; dueDate: string; deadline: string; icon: string }) => ({
        id: s.id, name: s.name, amount: s.amount, dueDate: s.dueDate, deadline: s.deadline, icon: s.icon || "FileText", source: "sub" as const,
      }));

      // Credit cards — one entry per card (cut day + due day merged)
      const upcomingCards: typeof upcomingSubs = [];
      cards.forEach((c: { id: string; name: string; type: string; cutDay: number; dueDay: number; icon: string }) => {
        if (c.type === "credito" && c.cutDay && c.dueDay) {
          upcomingCards.push({ id: c.id, name: c.name, amount: 0, dueDate: nextDayDate(c.cutDay), deadline: nextDayDate(c.dueDay), icon: c.icon || "CreditCard", source: "card" as const });
        }
      });

      const upcoming = [...upcomingSubs, ...upcomingCards].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
      const subsTotal = activeSubs.reduce((s: number, x: { amount: number }) => s + (x.amount || 0), 0);

      setData({
        income: monthIncome,
        expenses: monthExpenses,
        balance: monthIncome - monthExpenses,
        upcomingPayments: upcoming,
        goals: goals.slice(0, 3),
        userName: profile.name || "Usuario",
        subscriptionsTotal: subsTotal,
        cardsCount: cards.length,
      });
    } catch { /* silent */ }
    finally { setLoading(false); }

    // Notifications are handled by systemd timer (see systemd/ folder)
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: "8px 0" }}><CardSkeleton /><ListSkeleton rows={3} /><CardSkeleton /></div>;
  if (!data) return <div className="txt-dim" style={{ textAlign: "center", padding: 40 }}>Error al cargar</div>;

  const balanceColor = data.balance >= 0 ? "var(--c-save)" : "#FF6B6B";
  const spentPct = data.income > 0 ? pct(data.expenses, data.income) : 0;

  return (
    <>
      {/* Header */}
      <div className="row" style={{ padding: "8px 0 4px" }}>
        <div>
          <div className="txt-dim">Hola,</div>
          <h1 className="page-title" style={{ margin: 0, fontSize: 24 }}>{data.userName}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="top-nav-btn" onClick={toggleTheme}>
            <Icon name={theme === "dark" ? "Sun" : "Moon"} size={18} />
          </div>
          <Link href="/alerts" className="top-nav-btn">
            <Icon name="Bell" size={18} />
          </Link>
        </div>
      </div>

      {/* Balance Card */}
      <div className="glass-strong glass-card" style={{
        marginTop: 14, background: "linear-gradient(135deg, rgba(10,132,255,0.15), rgba(139,92,246,0.12))",
      }}>
        <div className="txt-dim" style={{ fontSize: 12 }}>Balance del mes</div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, margin: "4px 0 14px", color: balanceColor }}>
          {data.balance >= 0 ? "" : "-"}{fmt(Math.abs(data.balance))}
        </div>
        <div className="row">
          <div className="col">
            <div className="txt-dim" style={{ fontSize: 11 }}>Ingresos</div>
            <div className="amount-pos" style={{ fontSize: 16 }}>{fmt(data.income)}</div>
          </div>
          <div className="col" style={{ alignItems: "center" }}>
            <div className="txt-dim" style={{ fontSize: 11 }}>Gastos</div>
            <div className="txt-strong" style={{ fontSize: 16, color: "#FF6B6B" }}>{fmt(data.expenses)}</div>
          </div>
          <div className="col" style={{ alignItems: "flex-end" }}>
            <div className="txt-dim" style={{ fontSize: 11 }}>Gastos fijos</div>
            <div className="txt-strong" style={{ fontSize: 16, color: "#FF9F43" }}>{fmt(data.subscriptionsTotal)}</div>
          </div>
        </div>
        {data.income > 0 && (
          <div style={{ marginTop: 12 }}>
            <ProgressBar percent={Math.min(spentPct, 100)} color={spentPct > 80 ? "#FF6B6B" : "var(--c-blue)"} />
            <div className="txt-dim" style={{ fontSize: 11, marginTop: 4 }}>{spentPct}% de tus ingresos gastado este mes</div>
          </div>
        )}
      </div>

      {/* Quick Stats Row */}
      <div className="row" style={{ marginTop: 14, gap: 8 }}>
        <Link href="/gastos-fijos" style={{ flex: 1, textDecoration: "none" }}>
          <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: "center" }}>
            <Icon name="ClipboardList" size={20} color="#FF9F43" />
            <div className="txt-strong" style={{ fontSize: 15, marginTop: 4 }}>
              {data.upcomingPayments.length}
            </div>
            <div className="txt-faint" style={{ fontSize: 10 }}>Próximos pagos</div>
          </div>
        </Link>
        <Link href="/goals" style={{ flex: 1, textDecoration: "none" }}>
          <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: "center" }}>
            <Icon name="Target" size={20} color="#34C759" />
            <div className="txt-strong" style={{ fontSize: 15, marginTop: 4 }}>
              {data.goals.length}
            </div>
            <div className="txt-faint" style={{ fontSize: 10 }}>Metas</div>
          </div>
        </Link>
        <Link href="/cards" style={{ flex: 1, textDecoration: "none" }}>
          <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: "center" }}>
            <Icon name="CreditCard" size={20} color="#8B5CF6" />
            <div className="txt-strong" style={{ fontSize: 15, marginTop: 4 }}>
              {data.cardsCount}
            </div>
            <div className="txt-faint" style={{ fontSize: 10 }}>Tarjetas</div>
          </div>
        </Link>
      </div>

      {/* PIN Security banner */}
      {!hasPin && !loading && (
        <Link href="/settings/security" style={{ textDecoration: "none" }}>
          <div style={{
            marginTop: 14, padding: "14px 16px", borderRadius: 18,
            background: "linear-gradient(135deg, rgba(255,159,67,0.1), rgba(255,107,107,0.08))",
            border: "1px solid rgba(255,159,67,0.2)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 14, flexShrink: 0,
              background: "rgba(255,159,67,0.15)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="Shield" size={22} color="#FF9F43" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#FF9F43" }}>
                Configura tu PIN de seguridad
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                Protege tus eliminaciones y datos con un PIN de 4 dígitos
              </div>
            </div>
            <Icon name="ChevronRight" size={16} color="#FF9F43" />
          </div>
        </Link>
      )}

      {/* Upcoming Payments */}
      {data.upcomingPayments.length > 0 && (
        <>
          <div className="row" style={{ marginTop: 16 }}>
            <div className="eyebrow" style={{ margin: 0 }}>Próximos pagos</div>
            <Link href="/calendar" className="txt-dim" style={{ fontSize: 12, textDecoration: "none" }}>Calendario</Link>
          </div>
          <div className="glass-card">
            {data.upcomingPayments.map((p, i) => {
              let statusColor = "var(--text-dim)";
              let statusText = "";
              try {
                // Get raw day-of-month from the stored dates
                const cutDay = parseInt(p.dueDate.split("-")[2]) || 1;
                const limitDay = parseInt(p.deadline.split("-")[2]) || 1;

                // Days until a specific day in the current month (no month advancing for cut)
                const now = new Date();
                const todayDay = now.getDate();

                // cutDays: how many days until the cut day THIS month
                const cutDays = cutDay - todayDay;
                const cutPassed = cutDays <= 0;

                // limitDays: days until limit day (advances to next month if passed)
                let limitDate = new Date(now.getFullYear(), now.getMonth(), limitDay);
                if (limitDate.getTime() < now.getTime() - 86400000) {
                  limitDate.setMonth(limitDate.getMonth() + 1);
                }
                const limitDays = Math.ceil((limitDate.getTime() - now.getTime()) / 86400000);

                if (!cutPassed) {
                  // Before cut — show cut countdown
                  if (cutDays === 0) { statusColor = "#FF9F43"; statusText = "Corte hoy"; }
                  else if (cutDays === 1) { statusColor = "#FF9F43"; statusText = "Corte mañana"; }
                  else if (cutDays <= 3) { statusColor = "#FF9F43"; statusText = `Corte en ${cutDays}d`; }
                  else { statusColor = "var(--c-save)"; statusText = `Corte en ${cutDays}d`; }
                } else {
                  // After cut — show payment window
                  if (limitDays <= 0) { statusColor = "#FF6B6B"; statusText = "Pago vencido"; }
                  else if (limitDays === 1) { statusColor = "#FF6B6B"; statusText = "Último día para pagar"; }
                  else if (limitDays <= 3) { statusColor = "#FF6B6B"; statusText = `Pagar antes de ${limitDays}d`; }
                  else { statusColor = "#FF9F43"; statusText = `Pagar en ${limitDays}d`; }
                }
              } catch { statusText = ""; }

              const linkHref = p.source === "card" ? `/cards/${p.id}` : `/gastos-fijos?open=${p.id}`;
              return (
                <Link key={i} href={linkHref} className="list-row" style={{ textDecoration: "none", color: "inherit", ...(i === data.upcomingPayments.length - 1 ? { borderBottom: "none" } : undefined) }}>
                  <div className="icon-circ" style={{ background: "var(--glass-strong)" }}>
                    <Icon name={p.icon || "FileText"} size={20} />
                  </div>
                  <div className="col" style={{ flex: 1 }}>
                    <div className="txt-strong">{p.name}</div>
                    <div className="txt-dim" style={{ color: statusColor, fontWeight: statusColor !== "var(--text-dim)" ? 600 : 400 }}>{statusText}</div>
                  </div>
                  <div className="txt-strong">{p.amount > 0 ? fmt(p.amount) : "—"}</div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Goals */}
      {data.goals.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 14 }}>Metas</div>
          {data.goals.map((g) => {
            const percent = pct(g.saved, g.target);
            return (
              <Link key={g.id} href="/goals" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="glass-card" style={{ marginBottom: 8, cursor: "pointer" }}>
                  <div className="row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icon name={g.icon || "Target"} size={22} color={g.color || "var(--c-blue)"} />
                      <span className="txt-strong">{g.name}</span>
                    </div>
                    <span className="txt-strong">{percent}%</span>
                  </div>
                  <ProgressBar percent={percent} color={g.color || "var(--c-blue)"} />
                  <div className="row">
                    <span className="txt-dim">{fmt(g.saved)} de {fmt(g.target)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </>
      )}

      <Fab href="/movements/new" />

      {/* Opening Modal */}
      {showOpeningModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}
          onClick={() => setShowOpeningModal(false)}>
          <div className="modal-card glass-strong" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center" }}>
              <Icon name="Sun" size={40} color="#FFD60A" />
              <div style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 4px" }}>Buenos días, {data.userName}</div>
              <div className="txt-dim" style={{ marginBottom: 16 }}>Esto es un vistazo rápido de tus finanzas:</div>
              <div className="glass" style={{ padding: 14, borderRadius: 16, marginBottom: 18, textAlign: "left" }}>
                {data.income > 0 && <div style={{ padding: "6px 0", fontSize: 14, display: "flex", gap: 8 }}><span style={{ color: "var(--c-save)" }}>•</span>Ingresos este mes: {fmt(data.income)}</div>}
                {data.expenses > 0 && <div style={{ padding: "6px 0", fontSize: 14, display: "flex", gap: 8 }}><span style={{ color: "#FF6B6B" }}>•</span>Gastos este mes: {fmt(data.expenses)}</div>}
                {data.upcomingPayments.length > 0 && <div style={{ padding: "6px 0", fontSize: 14, display: "flex", gap: 8 }}><span style={{ color: "#FF9F43" }}>•</span>{data.upcomingPayments.length} pagos próximos</div>}
                {data.goals.length > 0 && <div style={{ padding: "6px 0", fontSize: 14, display: "flex", gap: 8 }}><span style={{ color: "var(--c-blue)" }}>•</span>{data.goals.length} metas activas</div>}
              </div>
              <button className="btn btn-primary" onClick={() => setShowOpeningModal(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
