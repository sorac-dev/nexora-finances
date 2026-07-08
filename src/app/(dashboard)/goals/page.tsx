"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopNav } from "@/src/components/layout/top-nav";
import { ProgressBar } from "@/src/components/ui/progress-bar";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { Icon } from "@/src/components/ui/icon";
import { PinModal } from "@/src/components/ui/pin-modal";
import { usePinGuard } from "@/src/hooks/use-pin-guard";
import { fmt, pct } from "@/src/utils/format";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────

interface Goal {
  id: string;
  name: string;
  icon: string;
  target: number;
  saved: number;
  date: string;
  monthly: number;
  color: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const ICONS = [
  "Smartphone","Plane","Car","Home","Laptop","GraduationCap","Gem","Star",
  "Dog","Gamepad2","Dumbbell","Music","BookOpen","Briefcase","Gift","Trophy",
  "Bike","Ship","Music2","Camera","Watch","Shirt","Leaf","Target",
];

const COLORS = [
  "#0A84FF","#FF9F43","#34C759","#BF5AF2","#FF6B81",
  "#30D5C8","#5AC8FA","#FFD60A","#8B5CF6","#FF375F",
  "#5E5CE6","#64D2FF","#30D158","#FF6482","#FF9F0A",
];

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ─── Helpers ─────────────────────────────────────────────────────────

function monthsToDate(dateStr: string): number {
  if (!dateStr || !dateStr.includes(" ")) return 0;
  const [month, year] = dateStr.split(" ");
  const now = new Date();
  const m = MONTHS_ES.indexOf(month);
  const y = parseInt(year, 10);
  if (m === -1 || isNaN(y)) return 0;
  return Math.max(0, (y - now.getFullYear()) * 12 + m - now.getMonth());
}

function fmtInput(val: string): string {
  const d = val.replace(/\D/g, "");
  return d ? parseInt(d, 10).toLocaleString("es-CO") : "";
}

function parseFormatted(s: string): number {
  return parseInt(s.replace(/\D/g, ""), 10) || 0;
}

function monthYear(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Component ───────────────────────────────────────────────────────

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Selected goal → detail modal ────────────────────────────────
  const [selected, setSelected] = useState<Goal | null>(null);

  // ── Edit form (inside detail modal or standalone) ───────────────
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fName, setFName] = useState("");
  const [fTarget, setFTarget] = useState("");
  const [fMonthly, setFMonthly] = useState("");
  const [fDate, setFDate] = useState("");
  const [fIcon, setFIcon] = useState("Target");
  const [fColor, setFColor] = useState("#0A84FF");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // ── Delete ──────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(false);
  const { guardWithPin, pinModalProps } = usePinGuard();

  // ── Add savings ─────────────────────────────────────────────────
  const [savAmount, setSavAmount] = useState("");
  const [addingSavings, setAddingSavings] = useState(false);

  // ── Load ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      if (res.ok) setGoals(await res.json());
    } catch { toast.error("Error al cargar metas"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // ── Open detail ─────────────────────────────────────────────────
  function openDetail(g: Goal) {
    setSelected(g);
    setEditing(false);
    setSavAmount("");
  }

  function closeDetail() {
    setSelected(null);
    setEditing(false);
  }

  // ── Edit mode ───────────────────────────────────────────────────
  function startCreate() {
    setEditId(null);
    setFName(""); setFTarget(""); setFMonthly("");
    setFDate(monthYear()); setFIcon("Target"); setFColor("#0A84FF");
    setStep(1);
    setEditing(true);
    setSelected(null);
  }

  function startEdit(g: Goal) {
    setEditId(g.id);
    setFName(g.name);
    setFTarget(g.target.toLocaleString("es-CO"));
    setFMonthly(g.monthly.toLocaleString("es-CO"));
    setFDate(g.date);
    setFIcon(g.icon);
    setFColor(g.color);
    setStep(1);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setStep(1);
  }

  // ── Save ────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const target = parseFormatted(fTarget);
    const monthly = parseFormatted(fMonthly);
    const name = fName.trim();
    if (!name) return toast.error("Elige un nombre");
    if (target <= 0) return toast.error("Ingresa un monto objetivo válido");
    if (monthly <= 0) return toast.error("Ingresa un aporte mensual válido");

    setSaving(true);
    const payload = { name, target, monthly, date: fDate, icon: fIcon, color: fColor };
    try {
      if (editId) {
        const res = await fetch(`/api/goals/${editId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("");
        const u = await res.json();
        setGoals((p) => p.map((g) => (g.id === editId ? { ...g, ...u } : g)));
        if (selected?.id === editId) setSelected({ ...selected, ...u });
        toast.success(`"${name}" actualizada`);
      } else {
        const res = await fetch("/api/goals", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("");
        const c = await res.json();
        setGoals((p) => [...p, c]);
        toast.success(`"${name}" creada`);
      }
      setEditing(false);
      setEditId(null);
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  // ── Delete ──────────────────────────────────────────────────────
  async function doDelete(id: string, name: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("");
      setGoals((p) => p.filter((g) => g.id !== id));
      toast.success(`"${name}" eliminada`);
      setSelected(null);
    } catch { toast.error("Error al eliminar"); }
    finally { setDeleting(false); }
  }

  function handleDelete() {
    if (!selected) return;
    const { id, name } = selected;
    guardWithPin(
      () => doDelete(id, name),
      "Eliminar meta",
      "Ingresa tu PIN para confirmar la eliminación"
    );
  }

  // ── Add savings ─────────────────────────────────────────────────
  async function handleAddSavings() {
    if (!selected) return;
    const amt = parseFormatted(savAmount);
    if (amt <= 0) return toast.error("Ingresa un monto válido");
    setAddingSavings(true);
    try {
      const res = await fetch(`/api/goals/${selected.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addSaved: amt }),
      });
      if (!res.ok) throw new Error("");
      const u = await res.json();
      setGoals((p) => p.map((g) => (g.id === selected.id ? { ...g, saved: u.saved } : g)));
      setSelected({ ...selected, saved: u.saved });
      setSavAmount("");
      toast.success(`+${fmt(amt)} agregado`);
    } catch { toast.error("Error al agregar"); }
    finally { setAddingSavings(false); }
  }

  // ── Preview helpers ─────────────────────────────────────────────
  const previewTarget = parseFormatted(fTarget);
  const previewPct = (() => {
    if (editId && !editing) return 0;
    const saved = editId ? (goals.find((g) => g.id === editId)?.saved ?? 0) : 0;
    return previewTarget > 0 ? pct(saved, previewTarget) : 0;
  })();

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      <TopNav title="Metas de ahorro" backHref="/more" />

      {/* ── Cards ──────────────────────────────────────────────── */}
      {loading ? <CardSkeleton /> : goals.length === 0 ? (
        <EmptyState icon="Target" title="Aún no tienes metas" description="Crea tu primera meta para empezar a ahorrar con propósito." />
      ) : (
        <AnimatePresence mode="popLayout">
          {goals.map((g, i) => {
            const p = pct(g.saved, g.target);
            const rem = monthsToDate(g.date);
            return (
              <motion.div
                key={g.id} layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="glass-card"
                style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}
                onClick={() => openDetail(g)}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: g.color, opacity: 0.7 }} />
                <div className="row" style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="icon-circ" style={{ background: `${g.color}22` }}><Icon name={g.icon} size={22} color={g.color} /></div>
                    <div className="col">
                      <span className="txt-strong" style={{ fontSize: 16 }}>{g.name}</span>
                      <span className="txt-dim" style={{ fontSize: 12 }}>{g.date} · {fmt(g.monthly)}/mes</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 18, color: g.color }}>{p}%</span>
                    <span style={{ color: "var(--text-faint)" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} width={16} height={16}><polyline points="9 18 15 12 9 6" /></svg>
                    </span>
                  </div>
                </div>
                <ProgressBar percent={p} color={g.color} />
                <div className="row" style={{ marginTop: 8 }}>
                  <span className="txt-dim" style={{ fontSize: 12 }}>{fmt(g.saved)} de {fmt(g.target)}</span>
                  {rem > 0 && <span className="txt-dim" style={{ fontSize: 12 }}>{rem} {rem === 1 ? "mes" : "meses"}</span>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <Button variant="secondary" onClick={startCreate}>+ Agregar meta de ahorro</Button>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          DETAIL MODAL — opens when tapping a card
          ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selected && !editing && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={closeDetail}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="glass-strong"
              style={{ width: "100%", maxWidth: 500, maxHeight: "85dvh", borderRadius: "28px 28px 0 0", padding: "24px 22px 34px", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: 40, height: 5, borderRadius: 10, background: "var(--track)", margin: "0 auto 20px" }} />

              {/* Icon + Name */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div className="icon-circ" style={{ background: `${selected.color}22`, width: 72, height: 72, borderRadius: 22, fontSize: 36, margin: "0 auto 12px" }}>
                  <Icon name={selected.icon} size={36} color={selected.color} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{selected.name}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: selected.color, marginTop: 4 }}>
                  {pct(selected.saved, selected.target)}%
                </div>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 20 }}>
                <ProgressBar percent={pct(selected.saved, selected.target)} color={selected.color} />
                <div className="row" style={{ marginTop: 6 }}>
                  <span className="txt-dim" style={{ fontSize: 12 }}>Ahorrado {fmt(selected.saved)}</span>
                  <span className="txt-dim" style={{ fontSize: 12 }}>Meta {fmt(selected.target)}</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid2" style={{ marginBottom: 20 }}>
                <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: "center" }}>
                  <div className="txt-faint" style={{ fontSize: 11, marginBottom: 4 }}>Aporte mensual</div>
                  <div className="txt-strong" style={{ fontSize: 16, color: "var(--c-save)" }}>{fmt(selected.monthly)}</div>
                </div>
                <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: "center" }}>
                  <div className="txt-faint" style={{ fontSize: 11, marginBottom: 4 }}>Faltante</div>
                  <div className="txt-strong" style={{ fontSize: 16, color: "#FF9F43" }}>{fmt(Math.max(0, selected.target - selected.saved))}</div>
                </div>
                <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: "center" }}>
                  <div className="txt-faint" style={{ fontSize: 11, marginBottom: 4 }}>Fecha objetivo</div>
                  <div className="txt-strong" style={{ fontSize: 14 }}>{selected.date}</div>
                </div>
                <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: "center" }}>
                  <div className="txt-faint" style={{ fontSize: 11, marginBottom: 4 }}>Meses restantes</div>
                  <div className="txt-strong" style={{ fontSize: 16, color: monthsToDate(selected.date) <= 3 ? "#FF6B6B" : "var(--text)" }}>
                    {monthsToDate(selected.date)}
                  </div>
                </div>
              </div>

              {/* Add savings inline */}
              <div className="glass" style={{ padding: 14, borderRadius: 18, marginBottom: 18 }}>
                <div className="txt-faint" style={{ fontSize: 11, marginBottom: 8 }}>AGREGAR AHORRO</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", fontWeight: 600 }}>$</span>
                    <input
                      className="nexora-input" style={{ paddingLeft: 32, marginBottom: 0 }}
                      placeholder="Monto ahorrado"
                      value={savAmount}
                      onChange={(e) => setSavAmount(fmtInput(e.target.value))}
                      inputMode="numeric"
                    />
                  </div>
                  <Button size="sm" onClick={handleAddSavings} disabled={addingSavings} style={{ width: "auto", whiteSpace: "nowrap" }}>
                    {addingSavings ? "..." : "Agregar"}
                  </Button>
                </div>
              </div>

              {/* Action buttons */}
              <Button onClick={() => startEdit(selected)}>
                <Icon name="Pencil" size={16} color="#fff" /> Editar meta
              </Button>
              <div style={{ height: 8 }} />
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                <Icon name="Trash2" size={16} color="#fff" /> {deleting ? "Eliminando..." : "Eliminar meta"}
              </Button>
              <div style={{ height: 8 }} />
              <Button variant="ghost" onClick={closeDetail}>Cerrar</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          CREATE / EDIT MODAL — step by step
          ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editing && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9995, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={cancelEdit}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="glass-strong"
              style={{ width: "100%", maxWidth: 500, maxHeight: "90dvh", borderRadius: "28px 28px 0 0", padding: "24px 22px 34px", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: 40, height: 5, borderRadius: 10, background: "var(--track)", margin: "0 auto 20px" }} />

              {/* Step indicator */}
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div key={i} style={{
                    width: step === i + 1 ? 28 : 8, height: 8,
                    borderRadius: 4,
                    background: step === i + 1 ? fColor : "var(--track)",
                    transition: "all 0.3s",
                  }} />
                ))}
              </div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>
                  {editId ? "Editar meta" : "Nueva meta"}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>
                  Paso {step} de {totalSteps}
                </div>
              </div>

              {/* ═══════════ STEP 1: Name & Style ═══════════ */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  <label className="field-label">¿Para qué quieres ahorrar?</label>
                  <input
                    className="nexora-input"
                    placeholder="Ej. iPhone 18 Pro, Viaje a Europa..."
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    autoFocus
                    style={{ fontSize: 16 }}
                  />

                  <label className="field-label">Elige un icono</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 16 }}>
                    {ICONS.map((i) => (
                      <motion.div key={i} whileTap={{ scale: 0.85 }} onClick={() => setFIcon(i)}
                        style={{ width:"100%", aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:14, cursor:"pointer", background: fIcon===i ? fColor : "var(--glass)", border: fIcon===i ? `2px solid ${fColor}` : "1px solid var(--glass-border-strong)", boxShadow: fIcon===i ? `0 0 12px ${fColor}44` : undefined }}>
                        <Icon name={i} size={22} color={fIcon===i ? "#fff" : "var(--text-dim)"} />
                      </motion.div>
                    ))}
                  </div>

                  <label className="field-label">Color</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {COLORS.map((c) => (
                      <motion.div key={c} whileTap={{ scale: 0.85 }} onClick={() => setFColor(c)}
                        style={{ width:36, height:36, borderRadius:"50%", background:c, cursor:"pointer", border: fColor===c ? "2px solid var(--text)" : "2px solid transparent", boxShadow: fColor===c ? `0 0 0 3px ${c}44` : undefined, position:"relative" }}>
                        {fColor===c && <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, textShadow:"0 1px 2px rgba(0,0,0,0.3)" }}>✓</span>}
                      </motion.div>
                    ))}
                  </div>

                  {/* Mini preview */}
                  <div className="glass" style={{ padding: 12, borderRadius: 16, marginTop: 12, border: `1px solid ${fColor}33` }}>
                    <div className="row">
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:32, height:32, borderRadius:10, background: `${fColor}22`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <Icon name={fIcon} size={16} color={fColor} />
                        </div>
                        <span className="txt-strong" style={{ fontSize:13 }}>{fName.trim() || "Nombre de la meta"}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══════════ STEP 2: Amounts ═══════════ */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  <label className="field-label">¿Cuánto necesitas ahorrar?</label>
                  <div style={{ position: "relative", marginBottom: 6 }}>
                    <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", fontWeight: 600, fontSize: 18 }}>$</span>
                    <input
                      className="nexora-input"
                      style={{ paddingLeft: 38, fontSize: 28, fontWeight: 800, marginBottom: 0, height: 64 }}
                      placeholder="0"
                      value={fTarget}
                      onChange={(e) => setFTarget(fmtInput(e.target.value))}
                      inputMode="numeric"
                      autoFocus
                    />
                  </div>
                  {previewTarget > 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 14, paddingLeft: 4 }}>
                      {fmt(previewTarget)}
                    </div>
                  )}

                  <label className="field-label">¿Cuánto puedes aportar al mes?</label>
                  <div style={{ position: "relative", marginBottom: 6 }}>
                    <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", fontWeight: 600, fontSize: 18 }}>$</span>
                    <input
                      className="nexora-input"
                      style={{ paddingLeft: 38, fontSize: 28, fontWeight: 800, marginBottom: 0, height: 64 }}
                      placeholder="0"
                      value={fMonthly}
                      onChange={(e) => setFMonthly(fmtInput(e.target.value))}
                      inputMode="numeric"
                    />
                  </div>
                  {parseFormatted(fMonthly) > 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 14, paddingLeft: 4 }}>
                      {fmt(parseFormatted(fMonthly))}/mes
                    </div>
                  )}

                  {/* Estimated months */}
                  {previewTarget > 0 && parseFormatted(fMonthly) > 0 && (
                    <div className="glass" style={{
                      padding: 14, borderRadius: 16, textAlign: "center",
                      border: "1px solid rgba(10,132,255,0.2)",
                      background: "rgba(10,132,255,0.04)",
                    }}>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>ALCANZARÁS TU META EN</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: fColor }}>
                        {Math.ceil(previewTarget / parseFormatted(fMonthly))} meses
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                        aproximadamente
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════════ STEP 3: Target Date ═══════════ */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  <label className="field-label">¿Para cuándo quieres tenerlo?</label>

                  <GoalDatePicker
                    value={fDate}
                    onChange={setFDate}
                    color={fColor}
                  />

                  {/* Info */}
                  {previewTarget > 0 && parseFormatted(fMonthly) > 0 && (
                    <div className="glass" style={{
                      padding: 14, borderRadius: 16, marginTop: 12, textAlign: "center",
                      border: "1px solid rgba(10,132,255,0.2)",
                      background: "rgba(10,132,255,0.04)",
                    }}>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>
                        APORTANDO {fmt(parseFormatted(fMonthly))}/MES
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        Completarás <span style={{ color: fColor }}>{Math.ceil(previewTarget / parseFormatted(fMonthly))} meses</span> después de empezar
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════════ STEP 4: Review ═══════════ */}
              {step === 4 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <div style={{ marginBottom: 4, display: "flex", justifyContent: "center" }}>
                      <Icon name={fIcon} size={40} color={fColor} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Todo listo</div>
                  </div>

                  {/* Summary card */}
                  <div className="glass-strong" style={{ padding: 20, borderRadius: 20, marginBottom: 16, border: `1px solid ${fColor}33` }}>
                    <div className="row" style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="icon-circ" style={{ background: `${fColor}22`, width: 44, height: 44, borderRadius: 14 }}>
                          <Icon name={fIcon} size={22} color={fColor} />
                        </div>
                        <div>
                          <div className="txt-strong" style={{ fontSize: 16 }}>{fName.trim() || "Sin nombre"}</div>
                          <div className="txt-dim" style={{ fontSize: 12 }}>{fDate}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid2" style={{ marginBottom: 12 }}>
                      <div className="glass" style={{ padding: 12, borderRadius: 14, textAlign: "center" }}>
                        <div className="txt-faint" style={{ fontSize: 10 }}>Meta</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: fColor }}>{previewTarget > 0 ? fmt(previewTarget) : "$0"}</div>
                      </div>
                      <div className="glass" style={{ padding: 12, borderRadius: 14, textAlign: "center" }}>
                        <div className="txt-faint" style={{ fontSize: 10 }}>Aporte mensual</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--c-save)" }}>{parseFormatted(fMonthly) > 0 ? fmt(parseFormatted(fMonthly)) : "$0"}</div>
                      </div>
                    </div>

                    {/* Progress preview */}
                    <div className="glass" style={{ padding: 12, borderRadius: 14 }}>
                      <div className="row" style={{ marginBottom: 6 }}>
                        <span className="txt-dim" style={{ fontSize: 11 }}>Progreso inicial</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: fColor }}>{previewPct}%</span>
                      </div>
                      <ProgressBar percent={previewPct} color={fColor} />
                    </div>
                  </div>

                  <form onSubmit={handleSave}>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Guardando..." : editId ? "Actualizar meta" : "Crear meta"}
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* ── Navigation buttons ───────────────────────────── */}
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                {step > 1 && (
                  <Button variant="secondary" type="button" onClick={() => setStep(step - 1)} style={{ flex: 1 }}>
                    ← Atrás
                  </Button>
                )}
                {step < totalSteps && (
                  <Button type="button" onClick={() => setStep(step + 1)} style={{ flex: 1 }}>
                    Siguiente →
                  </Button>
                )}
              </div>
              <div style={{ height: 8 }} />
              <Button variant="ghost" type="button" onClick={cancelEdit}>
                Cancelar
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN verification modal */}
      <PinModal {...pinModalProps} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GOAL DATE PICKER — month/year selector
// ═══════════════════════════════════════════════════════════════════

function GoalDatePicker({ value, onChange, color }: {
  value: string;      // "Mes Año" e.g. "Diciembre 2026"
  onChange: (v: string) => void;
  color: string;
}) {
  const MONTHS_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const now = new Date();
  const currentYear = now.getFullYear();

  // Parse current value
  const parts = value ? value.split(" ") : [];
  const selMonth = parts.length >= 1 ? MONTHS_FULL.indexOf(parts[0]) : -1;
  const selYear = parts.length >= 2 ? parseInt(parts[1], 10) : currentYear + 1;

  const [viewYear, setViewYear] = useState(
    selMonth >= 0 ? selYear : currentYear + 1
  );

  function selectMonth(monthIdx: number) {
    onChange(`${MONTHS_FULL[monthIdx]} ${viewYear}`);
  }

  return (
    <div className="glass" style={{ padding: 16, borderRadius: 18, border: `1px solid ${color}22` }}>
      {/* Year selector */}
      <div className="row" style={{ marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setViewYear(viewYear - 1)}
          disabled={viewYear <= currentYear}
          className="top-nav-btn"
          style={{ width: 36, height: 36, borderRadius: 12, opacity: viewYear <= currentYear ? 0.3 : 1 }}
        >
          <Icon name="ChevronLeft" size={18} />
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, textAlign: "center", flex: 1 }}>
          {viewYear}
        </div>
        <button
          type="button"
          onClick={() => setViewYear(viewYear + 1)}
          disabled={viewYear >= currentYear + 10}
          className="top-nav-btn"
          style={{ width: 36, height: 36, borderRadius: 12, opacity: viewYear >= currentYear + 10 ? 0.3 : 1 }}
        >
          <Icon name="ChevronRight" size={18} />
        </button>
      </div>

      {/* Month grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {MONTHS_FULL.map((m, i) => {
          const isSelected = selMonth === i && selYear === viewYear;
          const isPast = viewYear === currentYear && i < now.getMonth();
          return (
            <motion.div
              key={m}
              whileTap={{ scale: 0.92 }}
              onClick={() => { if (!isPast) selectMonth(i); }}
              style={{
                padding: "14px 6px",
                borderRadius: 14,
                cursor: isPast ? "not-allowed" : "pointer",
                textAlign: "center",
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                background: isSelected ? color : "var(--glass)",
                color: isSelected ? "#fff" : isPast ? "var(--text-faint)" : "var(--text)",
                border: isSelected ? "none" : "1px solid var(--glass-border-strong)",
                opacity: isPast ? 0.35 : 1,
                transition: "all 0.15s",
              }}
            >
              {m.substring(0, 3)}
            </motion.div>
          );
        })}
      </div>

      {/* Selected display */}
      {selMonth >= 0 && (
        <div style={{
          marginTop: 14, textAlign: "center",
          padding: "10px 16px", borderRadius: 12,
          background: `${color}15`, border: `1px solid ${color}33`,
          fontSize: 14, fontWeight: 700, color,
        }}>
          <Icon name="Calendar" size={16} color={color} /> {MONTHS_FULL[selMonth]} {selYear}
        </div>
      )}
    </div>
  );
}
