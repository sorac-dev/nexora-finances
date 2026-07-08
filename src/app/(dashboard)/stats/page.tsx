"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopNav } from "@/src/components/layout/top-nav";
import { ProgressBar } from "@/src/components/ui/progress-bar";
import { DonutChart } from "@/src/components/ui/donut-chart";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { Button } from "@/src/components/ui/button";
import { Icon } from "@/src/components/ui/icon";
import { fmt, pct } from "@/src/utils/format";
import { toast } from "sonner";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ─── Quick-select periods ───────────────────────────────────────────

type QuickPeriod = "this-month" | "prev-month" | "last-3m" | "last-6m" | "this-year" | "custom";

function getPeriodDates(p: QuickPeriod): { from: string; to: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (p) {
    case "this-month":
      return { from: fmtDate(new Date(y, m, 1)), to: fmtDate(new Date(y, m + 1, 0)), label: `${MONTHS[m]} ${y}` };
    case "prev-month":
      return { from: fmtDate(new Date(y, m - 1, 1)), to: fmtDate(new Date(y, m, 0)), label: `${MONTHS[m - 1] || MONTHS[11]} ${m === 0 ? y - 1 : y}` };
    case "last-3m": {
      const s = new Date(y, m - 2, 1);
      return { from: fmtDate(s), to: fmtDate(new Date(y, m + 1, 0)), label: `Últimos 3 meses` };
    }
    case "last-6m": {
      const s = new Date(y, m - 5, 1);
      return { from: fmtDate(s), to: fmtDate(new Date(y, m + 1, 0)), label: `Últimos 6 meses` };
    }
    case "this-year":
      return { from: fmtDate(new Date(y, 0, 1)), to: fmtDate(new Date(y, 11, 31)), label: `Año ${y}` };
    default:
      return { from: "", to: "", label: "Personalizado" };
  }
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthName(iso: string): string {
  const parts = iso.split("-");
  if (parts.length < 2) return iso;
  const m = parseInt(parts[1]) - 1;
  return MONTHS_SHORT[m] || iso;
}

// ─── Types ───────────────────────────────────────────────────────────

interface StatsData {
  period: { start: string; end: string };
  summary: { income: number; expenses: number; balance: number; savingsRate: number; transactionCount: number; subscriptionsTotal: number };
  comparison: { income: number; expenses: number; balance: number; savingsRate: number; transactionCount: number };
  categories: { name: string; icon: string; color: string; amount: number; count: number }[];
  monthly: { month: string; income: number; expenses: number }[];
  goals: { name: string; icon: string; color: string; target: number; saved: number; percentage: number }[];
}

// ─── Component ───────────────────────────────────────────────────────

export default function StatsPage() {
  const now = new Date();

  // ── State ──────────────────────────────────────────────────────────
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"resumen" | "categorias" | "mensual" | "metas">("resumen");
  const [showFilters, setShowFilters] = useState(false);

  // Quick period mode
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>("this-month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Year + month picker (for "this-month" / "prev-month" drilling)
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());

  // ── Derived active dates ──────────────────────────────────────────
  function getActiveDates(): { from: string; to: string } {
    if (quickPeriod === "custom") {
      return { from: customFrom, to: customTo };
    }
    if (quickPeriod === "this-month") {
      return { from: fmtDate(new Date(selYear, selMonth, 1)), to: fmtDate(new Date(selYear, selMonth + 1, 0)) };
    }
    if (quickPeriod === "prev-month") {
      const pm = selMonth === 0 ? 11 : selMonth - 1;
      const py = selMonth === 0 ? selYear - 1 : selYear;
      return { from: fmtDate(new Date(py, pm, 1)), to: fmtDate(new Date(py, pm + 1, 0)) };
    }
    return getPeriodDates(quickPeriod);
  }

  const activeDates = getActiveDates();
  const hasActiveFilters = (quickPeriod as string) !== "this-month" || ((quickPeriod as string) === "custom" && (!!customFrom || !!customTo));

  // ── Period label ──────────────────────────────────────────────────
  function periodLabel(): string {
    if (quickPeriod === "custom") {
      if (customFrom && customTo) return `${customFrom} – ${customTo}`;
      if (customFrom) return `Desde ${customFrom}`;
      if (customTo) return `Hasta ${customTo}`;
      return "Personalizado";
    }
    if (quickPeriod === "this-month") return `${MONTHS[selMonth]} ${selYear}`;
    if (quickPeriod === "prev-month") {
      const pm = selMonth === 0 ? 11 : selMonth - 1;
      const py = selMonth === 0 ? selYear - 1 : selYear;
      return `${MONTHS[pm]} ${py}`;
    }
    return getPeriodDates(quickPeriod).label;
  }

  // ── Load data ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getActiveDates();
      const params = new URLSearchParams();
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      const r = await fetch(`/api/stats?${params}`);
      if (r.ok) setData(await r.json());
      else toast.error("Error al cargar estadísticas");
    } catch { toast.error("Error de conexión"); }
    finally { setLoading(false); }
  }, [quickPeriod, customFrom, customTo, selYear, selMonth]);

  useEffect(() => { load(); }, [load]);

  // ── Comparison helpers ─────────────────────────────────────────────
  function comparePct(current: number, prev: number): string {
    if (prev === 0) return current > 0 ? "+∞" : "0%";
    return `${((current - prev) / Math.abs(prev)) * 100 >= 0 ? "+" : ""}${Math.round(((current - prev) / Math.abs(prev)) * 100)}%`;
  }
  function compareColor(current: number, prev: number, invert = false): string {
    const diff = current - prev;
    if (diff === 0) return "var(--text-dim)";
    const positive = invert ? diff < 0 : diff > 0;
    return positive ? "var(--c-save)" : "#FF6B6B";
  }

  // ── Navigate months ────────────────────────────────────────────────
  function navMonth(dir: -1 | 1) {
    if (quickPeriod !== "this-month" && quickPeriod !== "prev-month") {
      // Switch to this-month mode if not already
      setQuickPeriod("this-month");
      setSelYear(now.getFullYear());
      setSelMonth(now.getMonth());
      return;
    }
    let m = selMonth + dir;
    let y = selYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setSelMonth(m);
    setSelYear(y);
  }

  return (
    <>
      <TopNav title="Estadísticas" backHref="/more" />

      {/* ═══════════════════════════════════════════════════════════
          PERIOD HEADER
          ═══════════════════════════════════════════════════════════ */}
      <div className="glass-strong" style={{ padding: "16px", borderRadius: 20, marginBottom: 14 }}>
        {/* Period selector row */}
        <div className="row" style={{ marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => navMonth(-1)}
            className="top-nav-btn"
            style={{ width: 36, height: 36, borderRadius: 12 }}
          >
            <Icon name="ChevronLeft" size={18} />
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{periodLabel()}</div>
            {data && (
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                {data.summary.transactionCount} movimientos
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => navMonth(1)}
            className="top-nav-btn"
            style={{ width: 36, height: 36, borderRadius: 12 }}
          >
            <Icon name="ChevronRight" size={18} />
          </button>
        </div>

        {/* Filter bar */}
        <div className="row" style={{ gap: 6 }}>
          <Button
            size="sm"
            variant={hasActiveFilters ? "primary" : "secondary"}
            onClick={() => setShowFilters(true)}
            style={{ width: "auto", gap: 6 }}
          >
            <Icon name="SlidersHorizontal" size={14} />
            Filtros {hasActiveFilters ? "✓" : ""}
          </Button>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setQuickPeriod("this-month");
                setCustomFrom("");
                setCustomTo("");
                setSelYear(now.getFullYear());
                setSelMonth(now.getMonth());
              }}
              style={{ width: "auto", fontSize: 12, color: "var(--c-blue)" }}
            >
              Restablecer
            </Button>
          )}
          {/* Quick chips for common filters */}
          <div style={{ flex: 1 }} />
          <div className="segmented" style={{ width: "auto" }}>
            {(["resumen","categorias","mensual","metas"] as const).map((v) => (
              <div
                key={v}
                className={`seg ${view === v ? "active" : ""}`}
                onClick={() => setView(v)}
                style={{ padding: "6px 10px", fontSize: 12 }}
              >
                {{ resumen: "Resumen", categorias: "Cat.", mensual: "Mensual", metas: "Metas" }[v]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CONTENT
          ═══════════════════════════════════════════════════════════ */}
      {loading || !data ? <CardSkeleton /> : (
        <>
          {/* ── RESUMEN ──────────────────────────────────────────── */}
          {view === "resumen" && <ResumenView data={data} comparePct={comparePct} compareColor={compareColor} />}

          {/* ── CATEGORÍAS ────────────────────────────────────────── */}
          {view === "categorias" && <CategoriasView data={data} />}

          {/* ── MENSUAL ───────────────────────────────────────────── */}
          {view === "mensual" && <MensualView data={data} />}

          {/* ── METAS ─────────────────────────────────────────────── */}
          {view === "metas" && <MetasView data={data} />}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          FILTER MODAL (bottom sheet)
          ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showFilters && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 9995,
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              style={{
                width: "100%", maxWidth: 500, maxHeight: "85dvh",
                borderRadius: "28px 28px 0 0", padding: "24px 22px 34px",
                background: "var(--sheet)", border: "1px solid var(--glass-border-strong)",
                boxShadow: "var(--shadow)", overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: 40, height: 5, borderRadius: 10, background: "var(--track)", margin: "0 auto 20px" }} />
              <div style={{ fontSize: 20, fontWeight: 800, textAlign: "center", marginBottom: 20 }}>
                Filtros de estadísticas
              </div>

              {/* ── Quick-select periods ──────────────────────────── */}
              <label className="field-label">Período rápido</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {([
                  ["this-month","Este mes"],
                  ["prev-month","Mes anterior"],
                  ["last-3m","Últimos 3 meses"],
                  ["last-6m","Últimos 6 meses"],
                  ["this-year","Este año"],
                  ["custom","Personalizado"],
                ] as [QuickPeriod, string][]).map(([k, label]) => (
                  <div
                    key={k}
                    onClick={() => setQuickPeriod(k)}
                    style={{
                      padding: "12px",
                      borderRadius: 14,
                      cursor: "pointer",
                      background: quickPeriod === k ? "var(--c-blue)" : "var(--glass)",
                      color: quickPeriod === k ? "#fff" : "var(--text)",
                      fontWeight: quickPeriod === k ? 700 : 500,
                      fontSize: 13,
                      textAlign: "center",
                      border: quickPeriod === k ? "none" : "1px solid var(--glass-border-strong)",
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* ── Year & month picker ───────────────────────────── */}
              {(quickPeriod === "this-month" || quickPeriod === "prev-month") && (
                <>
                  <label className="field-label">Año</label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => setSelYear((y) => y - 1)}
                      className="top-nav-btn"
                      style={{ width: 32, height: 32, borderRadius: 10 }}
                    >
                      <Icon name="ChevronLeft" size={14} />
                    </button>
                    <span style={{ fontWeight: 800, fontSize: 16, flex: 1, textAlign: "center" }}>
                      {selYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelYear((y) => y + 1)}
                      className="top-nav-btn"
                      style={{ width: 32, height: 32, borderRadius: 10 }}
                    >
                      <Icon name="ChevronRight" size={14} />
                    </button>
                  </div>

                  <label className="field-label">Mes</label>
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14,
                  }}>
                    {MONTHS_SHORT.map((m, i) => (
                      <div
                        key={m}
                        onClick={() => setSelMonth(i)}
                        style={{
                          padding: "10px 6px",
                          borderRadius: 12,
                          cursor: "pointer",
                          textAlign: "center",
                          fontSize: 12,
                          fontWeight: selMonth === i ? 700 : 500,
                          background: selMonth === i ? "var(--c-blue)" : "var(--glass)",
                          color: selMonth === i ? "#fff" : "var(--text)",
                          border: selMonth === i ? "none" : "1px solid var(--glass-border-strong)",
                          transition: "all 0.15s",
                        }}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Custom date range ──────────────────────────────── */}
              {quickPeriod === "custom" && (
                <>
                  <label className="field-label">Desde</label>
                  <input
                    className="nexora-input"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                  <label className="field-label">Hasta</label>
                  <input
                    className="nexora-input"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </>
              )}

              {/* ── Actions ────────────────────────────────────────── */}
              <Button onClick={() => setShowFilters(false)}>
                Aplicar filtros
              </Button>
              <div style={{ height: 8 }} />
              <Button
                variant="ghost"
                onClick={() => {
                  setQuickPeriod("this-month");
                  setCustomFrom("");
                  setCustomTo("");
                  setSelYear(now.getFullYear());
                  setSelMonth(now.getMonth());
                }}
              >
                Limpiar todo
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════
// SUB-VIEWS
// ═════════════════════════════════════════════════════════════════

function ResumenView({ data, comparePct, compareColor }: {
  data: StatsData;
  comparePct: (c: number, p: number) => string;
  compareColor: (c: number, p: number, i?: boolean) => string;
}) {
  const { summary, comparison, monthly } = data;
  const maxBarVal = Math.max(...monthly.flatMap((m) => [m.income, m.expenses]), 1);

  return (
    <div>
      {/* Summary cards */}
      <div className="grid3" style={{ marginBottom: 14 }}>
        <SummaryCard
          icon="ArrowDownRight" color="var(--c-income)" label="Ingresos"
          value={fmt(summary.income)}
          comp={`${comparePct(summary.income, comparison.income)} vs ant.`}
          compColor={compareColor(summary.income, comparison.income)}
        />
        <SummaryCard
          icon="ArrowUpRight" color="#FF6B6B" label="Gastos"
          value={fmt(summary.expenses)}
          comp={`${comparePct(summary.expenses, comparison.expenses)} vs ant.`}
          compColor={compareColor(summary.expenses, comparison.expenses, true)}
        />
        <SummaryCard
          icon="Wallet" color="var(--c-blue)" label="Balance"
          value={fmt(summary.balance)}
          comp={`${comparePct(summary.balance, comparison.balance)} vs ant.`}
          compColor={compareColor(summary.balance, comparison.balance)}
        />
        <SummaryCard
          icon="PiggyBank" color="#BF5AF2" label="Tasa ahorro"
          value={`${summary.savingsRate}%`}
          comp={`${comparison.savingsRate}% período ant.`}
          compColor="var(--text-dim)"
        />
        <SummaryCard
          icon="Receipt" color="#FF9F43" label="Movimientos"
          value={String(summary.transactionCount)}
          comp={`${comparison.transactionCount} ant.`}
          compColor="var(--text-dim)"
        />
        <SummaryCard
          icon="ClipboardList" color="#5AC8FA" label="Gastos fijos"
          value={fmt(summary.subscriptionsTotal)}
          comp="mensuales"
          compColor="var(--text-dim)"
        />
      </div>

      {/* Income vs Expenses bar chart */}
      <div className="eyebrow">Ingresos vs Gastos</div>
      <div className="glass" style={{ padding: "16px 12px", borderRadius: 18, marginBottom: 14 }}>
        {monthly.length === 0 ? (
          <div className="txt-dim" style={{ textAlign: "center", padding: 20 }}>
            Sin datos para este período
          </div>
        ) : (
          <>
            {/* Horizontal scroll container for bars */}
            <div style={{ overflowX: "auto", overflowY: "hidden", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
              <div className="bars" style={{ minWidth: monthly.length <= 6 ? "100%" : monthly.length * 56 }}>
                {monthly.map((m) => {
                  const hIncome = (m.income / maxBarVal) * 120;
                  const hExpense = (m.expenses / maxBarVal) * 120;
                  return (
                    <div key={m.month} className="bar-group">
                      <div className="bar-pair">
                        <div className="bar" style={{ height: Math.max(hIncome, 2), background: "var(--c-income)" }} />
                        <div className="bar" style={{ height: Math.max(hExpense, 2), background: "#FF6B6B" }} />
                      </div>
                      <div className="txt-dim" style={{ fontSize: 10, marginTop: 4, whiteSpace: "nowrap" }}>
                        {monthName(m.month)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <span style={{ fontSize: 11 }}><span className="legend-dot" style={{ background: "var(--c-income)" }} /> Ingresos</span>
              <span style={{ fontSize: 11 }}><span className="legend-dot" style={{ background: "#FF6B6B" }} /> Gastos</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, color, label, value, comp, compColor }: {
  icon: string; color: string; label: string; value: string; comp: string; compColor: string;
}) {
  return (
    <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: "center" }}>
      <Icon name={icon} size={20} color={color} />
      <div className="txt-faint" style={{ fontSize: 10, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: compColor, marginTop: 2 }}>{comp}</div>
    </div>
  );
}

function CategoriasView({ data }: { data: StatsData }) {
  return (
    <div>
      {data.categories.length === 0 ? (
        <div className="txt-dim" style={{ textAlign: "center", padding: 40 }}>
          Sin gastos en este período
        </div>
      ) : (
        <>
          <DonutChart
            segments={data.categories.map((c) => ({
              pct: data.summary.expenses > 0 ? Math.round((c.amount / data.summary.expenses) * 100) || 1 : 1,
              color: c.color,
            }))}
            centerLabel="GASTOS"
            centerValue={fmt(data.summary.expenses)}
            size={180}
          />
          <div className="glass-card">
            <div className="legend">
              {data.categories.map((c) => (
                <div key={c.name} className="legend-row">
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="legend-dot" style={{ background: c.color }} />
                    <Icon name={c.icon || "Package"} size={16} color={c.color} />
                    {c.name}
                  </span>
                  <span className="txt-dim">
                    {fmt(c.amount)} ({data.summary.expenses > 0 ? Math.round((c.amount / data.summary.expenses) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="eyebrow">Top categorías</div>
          {data.categories.slice(0, 5).map((c, i) => (
            <div key={c.name} className="glass" style={{ padding: "12px 14px", borderRadius: 16, marginBottom: 8 }}>
              <div className="row" style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="txt-faint" style={{ fontWeight: 700, fontSize: 12 }}>#{i + 1}</span>
                  <Icon name={c.icon || "Package"} size={18} color={c.color} />
                  <span className="txt-strong" style={{ fontSize: 14 }}>{c.name}</span>
                </div>
                <span className="txt-strong">{fmt(c.amount)}</span>
              </div>
              <ProgressBar percent={data.summary.expenses > 0 ? Math.round((c.amount / data.summary.expenses) * 100) : 0} color={c.color} />
              <div className="row" style={{ marginTop: 4 }}>
                <span className="txt-dim" style={{ fontSize: 11 }}>{c.count} movimientos</span>
                <span className="txt-dim" style={{ fontSize: 11 }}>{data.summary.expenses > 0 ? Math.round((c.amount / data.summary.expenses) * 100) : 0}% del total</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function MensualView({ data }: { data: StatsData }) {
  return (
    <div>
      {data.monthly.length === 0 ? (
        <div className="txt-dim" style={{ textAlign: "center", padding: 40 }}>
          Sin datos para este período
        </div>
      ) : (
        data.monthly.map((m) => {
          const balance = m.income - m.expenses;
          const rate = m.income > 0 ? Math.round((balance / m.income) * 100) : 0;
          const parts = m.month.split("-");
          const label = parts.length >= 2 ? `${MONTHS[parseInt(parts[1]) - 1]} ${parts[0]}` : m.month;
          return (
            <div key={m.month} className="glass-card">
              <div className="row" style={{ marginBottom: 10 }}>
                <span className="txt-strong" style={{ fontSize: 16 }}>{label}</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: balance >= 0 ? "var(--c-save)" : "#FF6B6B" }}>
                  {balance >= 0 ? "+" : ""}{fmt(balance)}
                </span>
              </div>
              <div className="grid2">
                <div>
                  <div className="txt-faint" style={{ fontSize: 10 }}>Ingresos</div>
                  <div className="amount-pos" style={{ fontSize: 15 }}>{fmt(m.income)}</div>
                </div>
                <div>
                  <div className="txt-faint" style={{ fontSize: 10 }}>Gastos</div>
                  <div className="txt-strong" style={{ fontSize: 15, color: "#FF6B6B" }}>{fmt(m.expenses)}</div>
                </div>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <span className="txt-dim" style={{ fontSize: 11 }}>Tasa de ahorro: {rate}%</span>
                <Icon name={balance >= 0 ? "TrendingUp" : "TrendingDown"} size={14} color={balance >= 0 ? "var(--c-save)" : "#FF6B6B"} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function MetasView({ data }: { data: StatsData }) {
  return (
    <div>
      {data.goals.length === 0 ? (
        <div className="txt-dim" style={{ textAlign: "center", padding: 40 }}>
          Sin metas configuradas
        </div>
      ) : (
        data.goals.map((g) => (
          <div key={g.name} className="glass-card">
            <div className="row" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name={g.icon || "Target"} size={20} color={g.color} />
                <span className="txt-strong" style={{ fontSize: 15 }}>{g.name}</span>
              </div>
              <span style={{ fontWeight: 800, color: g.color }}>{g.percentage}%</span>
            </div>
            <ProgressBar percent={g.percentage} color={g.color} />
            <div className="row" style={{ marginTop: 8 }}>
              <span className="txt-dim" style={{ fontSize: 11 }}>{fmt(g.saved)} de {fmt(g.target)}</span>
              <span className="txt-dim" style={{ fontSize: 11 }}>Faltan {fmt(Math.max(0, g.target - g.saved))}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
