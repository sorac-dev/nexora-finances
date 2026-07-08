"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "@/src/hooks/use-theme";
import { useUIStore } from "@/src/stores/ui.store";
import { TopNav } from "@/src/components/layout/top-nav";
import { Button } from "@/src/components/ui/button";
import { CardSkeleton, ListSkeleton } from "@/src/components/ui/skeleton";
import { ProgressBar } from "@/src/components/ui/progress-bar";
import { Icon } from "@/src/components/ui/icon";
import { fmt, pct } from "@/src/utils/format";
import { getPaymentStatus as ledger_getPaymentStatus } from "@/src/lib/cycle";

interface Overview {
  income: number; expenses: number; balance: number;
  pendingPayments: { id: string; name: string; amount: number; dueDate: string; deadline: string; icon: string; source: string }[];
  goals: { id: string; name: string; icon: string; target: number; saved: number; color: string }[];
  userName: string; cardsCount: number;
  subscriptionsTotal?: number;
}

export default function DashboardPage() {
  const { theme, toggleTheme } = useTheme();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [dashRes, pinRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/user/security/pin"),
      ]);
      if (dashRes.ok) {
        const d = await dashRes.json();
        setWalletBalance(d.balance);
        setData(d);
      }
      if (pinRes.ok) { const d = await pinRes.json(); setHasPin(d.hasPin); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: "8px 0" }}><CardSkeleton /><ListSkeleton rows={3} /><CardSkeleton /></div>;
  if (!data) return <div className="txt-dim" style={{ textAlign: "center", padding: 40 }}>Error al cargar</div>;

  const balanceColor = data.balance >= 0 ? "var(--c-save)" : "#FF6B6B";

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
      <div className="glass-strong glass-card" style={{ marginTop: 14, background: "linear-gradient(135deg, rgba(10,132,255,0.15), rgba(139,92,246,0.12))" }}>
        <div className="txt-dim" style={{ fontSize: 12 }}>Saldo total</div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, margin: "4px 0 14px", color: balanceColor }}>
          {data.balance >= 0 ? "" : "-"}{fmt(Math.abs(data.balance))}
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Ingresos del mes: <span className="amount-pos">{fmt(data.income)}</span></div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Gastos del mes: <span style={{ color: "#FF6B6B" }}>{fmt(data.expenses)}</span></div>
        </div>
        <div className="row">
          <div className="col">
            <div className="txt-dim" style={{ fontSize: 11 }}>Gastos fijos</div>
            <div className="txt-strong" style={{ fontSize: 14, color: "#FF9F43" }}>{fmt(data.subscriptionsTotal || 0)}</div>
          </div>
          <div className="col" style={{ alignItems: "flex-end" }}>
            <div className="txt-dim" style={{ fontSize: 11 }}>Tarjetas</div>
            <div className="txt-strong" style={{ fontSize: 14 }}>{data.cardsCount}</div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="row" style={{ marginTop: 14, gap: 8 }}>
        <Link href="/gastos-fijos" style={{ flex: 1, textDecoration: "none" }}>
          <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: "center" }}>
            <Icon name="ClipboardList" size={20} color="#FF9F43" />
            <div className="txt-strong" style={{ fontSize: 15, marginTop: 4 }}>{data.pendingPayments.length}</div>
            <div className="txt-faint" style={{ fontSize: 10 }}>Pagos pendientes</div>
          </div>
        </Link>
        <Link href="/goals" style={{ flex: 1, textDecoration: "none" }}>
          <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: "center" }}>
            <Icon name="Target" size={20} color="#34C759" />
            <div className="txt-strong" style={{ fontSize: 15, marginTop: 4 }}>{data.goals.length}</div>
            <div className="txt-faint" style={{ fontSize: 10 }}>Metas</div>
          </div>
        </Link>
        <Link href="/cards" style={{ flex: 1, textDecoration: "none" }}>
          <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: "center" }}>
            <Icon name="CreditCard" size={20} color="#8B5CF6" />
            <div className="txt-strong" style={{ fontSize: 15, marginTop: 4 }}>{data.cardsCount}</div>
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
            <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: "rgba(255,159,67,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="Shield" size={22} color="#FF9F43" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#FF9F43" }}>Configura tu PIN de seguridad</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>Protege tus eliminaciones y datos con un PIN de 4 dígitos</div>
            </div>
            <Icon name="ChevronRight" size={16} color="#FF9F43" />
          </div>
        </Link>
      )}

      {/* Pending Payments */}
      {data.pendingPayments.length > 0 && (
        <>
          <div className="row" style={{ marginTop: 16 }}>
            <div className="eyebrow" style={{ margin: 0 }}>Pagos pendientes</div>
            <Link href="/calendar" className="txt-dim" style={{ fontSize: 12, textDecoration: "none" }}>Calendario</Link>
          </div>
          <div className="glass-card">
            {data.pendingPayments.map((p, i) => {
              // Extract due day and deadline day from the dates
              const dueDay = parseInt(p.dueDate.split("-")[2]) || 1;
              const deadlineDay = parseInt(p.deadline.split("-")[2]) || dueDay;
              const { label: statusText, color: statusColor } = ledger_getPaymentStatus(dueDay, deadlineDay);
              const linkHref = p.source === "card" ? `/cards/${p.id}` : `/gastos-fijos?open=${p.id}`;
              return (
                <Link key={i} href={linkHref} className="list-row" style={{ textDecoration: "none", color: "inherit", ...(i === data.pendingPayments.length - 1 ? { borderBottom: "none" } : undefined) }}>
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
                      <div className="icon-circ" style={{ background: `${g.color}22` }}>
                        <Icon name={g.icon} size={20} color={g.color} />
                      </div>
                      <div>
                        <div className="txt-strong" style={{ fontSize: 14 }}>{g.name}</div>
                        <div className="txt-dim" style={{ fontSize: 11 }}>{fmt(g.saved)} de {fmt(g.target)}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: g.color }}>{percent}%</span>
                  </div>
                  <ProgressBar percent={percent} color={g.color} />
                </div>
              </Link>
            );
          })}
        </>
      )}
    </>
  );
}
