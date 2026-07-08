"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopNav } from "@/src/components/layout/top-nav";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { ToggleSwitch } from "@/src/components/ui/toggle-switch";
import { DaySelector } from "@/src/components/ui/day-selector";
import { CategorySelect } from "@/src/components/ui/category-select";
import { Icon } from "@/src/components/ui/icon";
import { PinModal } from "@/src/components/ui/pin-modal";
import { usePinGuard } from "@/src/hooks/use-pin-guard";
import { fmt } from "@/src/utils/format";
import { toast } from "sonner";

interface Sub {
  id: string; name: string; amount: number; frequency: string; isVariable?: boolean;
  icon: string; category: string; categoryId?: string; dueDate: string; deadline: string; active: boolean;
}
interface Cat { id: string; name: string; icon: string; color: string; type: string; isDefault: boolean; }

const FREQS = [{ id: "weekly", label: "Semanal" },{ id: "monthly", label: "Mensual" },{ id: "annual", label: "Anual" }];
const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function fmtInput(v: string) { const d = v.replace(/\D/g,""); return d ? parseInt(d,10).toLocaleString("es-CO") : ""; }
function parseFmt(s: string) { return parseInt(s.replace(/\D/g,""),10) || 0; }
function fmtDay(d: string) { if (!d) return ""; const day = d.split("-")[2]; return `Día ${parseInt(day)}`; }
function daysUntil(dateStr: string) {
  const now = new Date();
  let d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  while (d.getTime() < now.getTime() - 86400000) d.setMonth(d.getMonth() + 1);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}
function daysText(n: number) { if (n <= 0) return "Vencido"; if (n === 1) return "En 1 día"; return `En ${n} días`; }

export default function GastosFijosPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selected, setSelected] = useState<Sub | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { guardWithPin, pinModalProps } = usePinGuard();

  // ── Step-by-step create ─────────────────────────────────────────
  const [editing, setEditing] = useState(false); // true = show modal
  const [editMode, setEditMode] = useState(false); // global edit vs step create
  const [step, setStep] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);

  // Step 1: Name
  const [fName, setFName] = useState("");
  // Step 2: Amount
  const [fAmount, setFAmount] = useState("");
  const [fVariable, setFVariable] = useState(false);
  // Step 3: Dates
  const [fFreq, setFFreq] = useState("monthly");
  const [fDue, setFDue] = useState(1);
  const [fDeadline, setFDeadline] = useState(1);
  // Step 4: Category
  const [fCatId, setFCatId] = useState("");
  const [fCatName, setFCatName] = useState("");
  const [fIcon, setFIcon] = useState("FileText");

  const [saving, setSaving] = useState(false);
  const totalSteps = 4;

  const load = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`/api/subscriptions?page=${pageNum}&limit=10`),
        pageNum === 1 ? fetch("/api/categories") : Promise.resolve(null),
      ]);
      if (sRes.ok) {
        const d = await sRes.json();
        if (append) setSubs((prev) => [...prev, ...d.data]);
        else setSubs(d.data);
        setHasMore(d.hasMore);
      }
      if (cRes && cRes.ok) setCats(await cRes.json());
    } catch { toast.error("Error al cargar"); }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Infinite scroll with IntersectionObserver on app container
  useEffect(() => {
    if (loadingMore || !hasMore) return;
    const container = document.getElementById("app-scroll-container");
    if (!container) return;

    const sentinel = document.getElementById("gastos-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore && hasMore) {
        setPage((p) => p + 1);
        load(page + 1, true);
      }
    }, { root: container, rootMargin: "200px" });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadingMore, hasMore, page, load]);

  // Auto-open from query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openId = params.get("open");
    if (openId && subs.length > 0) {
      const item = subs.find((s) => s.id === openId);
      if (item) openDetail(item);
    }
  }, [subs]);

  function openDetail(s: Sub) { setSelected(s); }
  function closeDetail() { setSelected(null); }

  // ── Create (steps) ──────────────────────────────────────────────
  function startCreate() {
    setEditMode(false); setStep(1); setEditId(null);
    setFName(""); setFAmount(""); setFVariable(false);
    setFFreq("monthly"); setFDue(1); setFDeadline(1);
    setFCatId(""); setFCatName(""); setFIcon("FileText");
    setEditing(true);
  }
  function nextStep() {
    if (step === 1 && !fName.trim()) return toast.error("Ponle un nombre");
    if (step === 2 && !fVariable) { const a = parseFmt(fAmount); if (a <= 0) return toast.error("Ingresa un monto válido"); }
    setStep((s) => Math.min(s + 1, totalSteps));
  }

  // ── Edit (global) ───────────────────────────────────────────────
  function startEdit(s: Sub) {
    setEditMode(true); setEditId(s.id);
    setFName(s.name); setFAmount(s.amount.toLocaleString("es-CO"));
    setFVariable(s.isVariable || false);
    setFFreq(s.frequency);
    setFDue(s.dueDate ? parseInt(s.dueDate.split("-")[2]) : 1);
    setFDeadline(s.deadline ? parseInt(s.deadline.split("-")[2]) : 1);
    setFCatId(s.categoryId || ""); setFCatName(s.category);
    setFIcon(s.icon || "FileText");
    setEditing(true);
  }

  // ── Save ────────────────────────────────────────────────────────
  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!fName.trim()) return toast.error("Ponle un nombre");
    const amount = fVariable ? 0 : parseFmt(fAmount);
    if (!fVariable && amount <= 0) return toast.error("Ingresa un monto válido");
    if (!fCatId) return toast.error("Selecciona una categoría");

    setSaving(true);
    const now = new Date();
    const toDate = (day: number) => {
      const d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
      return d.toISOString().split("T")[0];
    };
    const p = { name: fName.trim(), amount, frequency: fFreq, icon: fIcon, category: fCatName, categoryId: fCatId || null, isVariable: fVariable, dueDate: toDate(fDue), deadline: toDate(fDeadline) };

    try {
      if (editId) {
        await fetch(`/api/subscriptions/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        toast.success("Gasto fijo actualizado");
      } else {
        await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        toast.success("Gasto fijo creado");
      }
      setEditing(false); setEditId(null);
      setPage(1); await load(1);
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  // ── Pay ─────────────────────────────────────────────────────────
  async function handlePay() {
    if (!selected) return;
    setPaying(true);
    const amount = selected.isVariable
      ? parseInt(prompt(`¿Cuánto pagaste por "${selected.name}"?`, String(selected.amount)) || "0") || 0
      : selected.amount;
    if (amount <= 0) { toast.error("Monto inválido"); setPaying(false); return; }

    try {
      // Create the payment transaction
      await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "expense", amount, description: selected.name, cat: selected.category, date: new Date().toISOString(), method: "Transferencia" }) });

      // Advance to next cycle
      const d = new Date(selected.dueDate + "T00:00:00"), dl = new Date(selected.deadline + "T00:00:00");
      if (selected.frequency === "weekly") { d.setDate(d.getDate() + 7); dl.setDate(dl.getDate() + 7); }
      else if (selected.frequency === "annual") { d.setFullYear(d.getFullYear() + 1); dl.setFullYear(dl.getFullYear() + 1); }
      else { d.setMonth(d.getMonth() + 1); dl.setMonth(dl.getMonth() + 1); }
      const nd = d.toISOString().split("T")[0], ndl = dl.toISOString().split("T")[0];
      const r = await fetch(`/api/subscriptions/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dueDate: nd, deadline: ndl }) });
      if (r.ok) {
        const u = await r.json();
        setSelected({ ...selected, dueDate: u.dueDate, deadline: u.deadline });
        setSubs((prev) => prev.map((s) => s.id === selected.id ? { ...s, dueDate: u.dueDate, deadline: u.deadline } : s));
        toast.success(`Pago registrado. Próximo: ${fmtDay(nd)}`);
      }
    } catch { toast.error("Error"); }
    finally { setPaying(false); }
  }

  async function toggleActive(s: Sub) {
    try {
      const r = await fetch(`/api/subscriptions/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !s.active }) });
      if (r.ok) {
        setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !s.active } : x)));
        if (selected?.id === s.id) setSelected({ ...selected, active: !s.active });
      }
    } catch { toast.error("Error"); }
  }

  async function doDelete(id: string) {
    setDeleting(true);
    try { await fetch(`/api/subscriptions/${id}`, { method: "DELETE" }); setSubs((prev) => prev.filter((s) => s.id !== id)); toast.success("Eliminado"); setSelected(null); setDeletingId(null); setSwipedId(null); }
    catch { toast.error("Error"); }
    finally { setDeleting(false); }
  }

  function handleDelete() {
    if (!selected && !deletingId) return;
    const id = selected?.id || deletingId!;
    guardWithPin(
      () => doDelete(id),
      "Eliminar gasto fijo",
      "Ingresa tu PIN para confirmar la eliminación"
    );
  }

  return (
    <>
      <TopNav title="Gastos fijos" backHref="/more" />

      <Button
        onClick={startCreate}
        style={{
          width: "100%", marginBottom: 16,
          background: "linear-gradient(135deg, #BF5AF2, #8B5CF6)",
          color: "#fff", border: "none", fontWeight: 700, fontSize: 15,
          padding: "14px", borderRadius: 16,
          boxShadow: "0 4px 16px rgba(139,92,246,0.3)",
        }}>
        + Agregar gasto fijo
      </Button>

      {loading ? <CardSkeleton /> : subs.length === 0 ? (
        <EmptyState icon="ClipboardList" title="Sin gastos fijos" description="Agrega tus gastos fijos y pagos recurrentes." />
      ) : (
        <div onClick={() => setSwipedId(null)}>
        <AnimatePresence mode="popLayout">
          {subs.map((s, i) => {
            const dueIn = daysUntil(s.dueDate); const isLate = dueIn <= 0;
            const isSwiped = swipedId === s.id;
            return (
              <div key={s.id} style={{ position: "relative", overflow: "hidden", marginBottom: 14, borderRadius: 24 }}>
                {/* Action buttons behind — hidden until swiped */}
                <AnimatePresence>
                  {isSwiped && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ position: "absolute", right: 0, top: 0, bottom: 0, display: "flex", zIndex: 0 }}>
                      <div style={{ width: 70, background: "var(--c-blue)", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                        onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); startEdit(s); setSwipedId(null); }}>
                        <Icon name="Pencil" size={20} color="#fff" />
                      </div>
                      <div style={{ width: 70, background: "#FF6B6B", borderRadius: "0 24px 24px 0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                        onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setDeletingId(s.id); }}>
                        <Icon name="Trash2" size={20} color="#fff" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Swipeable content */}
                <motion.div
                  layout initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0, x: isSwiped ? -140 : 0 }}
                  exit={{ opacity:0, scale:0.95 }} transition={{ duration:0.25, delay:i*0.04, x: { type: "spring", stiffness: 300, damping: 30 } }}
                  className="glass-card" style={{ cursor:"pointer", opacity: s.active ? 1 : 0.5, marginBottom: 0, position: "relative", zIndex: 1 }}
                  drag="x" dragConstraints={{ left: -140, right: 0 }} dragElastic={0} dragSnapToOrigin
                  onDragEnd={(_, info) => { if (info.offset.x < -60) setSwipedId(s.id); else setSwipedId(null); }}
                  onClick={() => { if (!isSwiped) openDetail(s); else setSwipedId(null); }}
                >
                  <div className="row">
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div className="icon-circ" style={{ background:"var(--glass-strong)" }}><Icon name={s.icon} size={20} /></div>
                      <div className="col">
                        <span className="txt-strong">{s.name}</span>
                        <span className="txt-dim" style={{ color: isLate ? "#FF6B6B" : undefined }}>
                          {s.isVariable ? "Variable · " : ""}{isLate ? "Vencido " : ""}{fmtDay(s.dueDate)} → {fmtDay(s.deadline)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span className="txt-strong">{s.isVariable ? "—" : fmt(s.amount)}</span>
                      <Icon name="ChevronRight" size={16} color="var(--text-faint)" />
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>
        </div>
      )}
      <div id="gastos-sentinel" style={{ height:1 }} />
      {loadingMore && <div className="txt-dim" style={{ textAlign:"center", padding:12, fontSize:12 }}>Cargando más...</div>}
      {!hasMore && subs.length > 0 && <div className="txt-dim" style={{ textAlign:"center", padding:"20px 0 30px", fontSize:12 }}>No hay más datos que mostrar</div>}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}>
      </motion.div>

      {/* ── Detail Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && !editing && (
          <div style={{ position:"fixed", inset:0, zIndex:9990, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={closeDetail}>
            <motion.div initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }} transition={{ type:"spring", damping:28, stiffness:300 }}
              style={{ width:"100%", maxWidth:500, maxHeight:"80dvh", borderRadius:"28px 28px 0 0", padding:"24px 22px 34px", overflowY:"auto", background:"var(--sheet)", border:"1px solid var(--glass-border-strong)", boxShadow:"var(--shadow)" }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ width:40, height:5, borderRadius:10, background:"var(--track)", margin:"0 auto 20px" }} />
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div className="icon-circ" style={{ background:"var(--glass-strong)", width:72, height:72, borderRadius:22, margin:"0 auto 12px" }}>
                  <Icon name={selected.icon} size={36} />
                </div>
                <div style={{ fontSize:22, fontWeight:800 }}>{selected.name}</div>
                <div style={{ fontSize:28, fontWeight:800, color:"var(--c-blue)", marginTop:4 }}>
                  {selected.isVariable ? "Variable" : fmt(selected.amount)}
                </div>
                <div className="txt-dim">{FREQS.find((f) => f.id === selected.frequency)?.label} · {selected.category}</div>
              </div>

              <div className="grid2" style={{ marginBottom:18 }}>
                <div className="glass" style={{ padding:14, borderRadius:16, textAlign:"center" }}>
                  <div className="txt-faint" style={{ fontSize:11, marginBottom:4 }}>Día de corte</div>
                  <div className="txt-strong" style={{ fontSize:15, color: daysUntil(selected.dueDate) <= 1 ? "#FF6B6B" : "var(--c-save)" }}>{fmtDay(selected.dueDate)}</div>
                  <div className="txt-dim" style={{ fontSize:11 }}>{daysText(daysUntil(selected.dueDate))}</div>
                </div>
                <div className="glass" style={{ padding:14, borderRadius:16, textAlign:"center" }}>
                  <div className="txt-faint" style={{ fontSize:11, marginBottom:4 }}>Día límite</div>
                  <div className="txt-strong" style={{ fontSize:15, color: daysUntil(selected.deadline) <= 1 ? "#FF6B6B" : "#FF9F43" }}>{fmtDay(selected.deadline)}</div>
                  <div className="txt-dim" style={{ fontSize:11 }}>{daysText(daysUntil(selected.deadline))}</div>
                </div>
              </div>

              <Button onClick={handlePay} disabled={paying} style={{ marginBottom: 8 }}>
                <Icon name="CheckCircle" size={16} /> {paying ? "Registrando..." : selected.isVariable ? "Registrar pago (variable)" : "Registrar pago"}
              </Button>

              <Button type="button" variant="ghost" onClick={closeDetail}>Cerrar</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm (swipe) ────────────────────────────────── */}
      <AnimatePresence>
        {deletingId && (
          <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:30 }} onClick={() => setDeletingId(null)}>
            <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }} transition={{ type:"spring", damping:25, stiffness:350 }}
              style={{ width:"100%", maxWidth:360, borderRadius:24, padding:28, background:"var(--sheet)", border:"1px solid var(--glass-border-strong)", boxShadow:"var(--shadow)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ textAlign:"center", marginBottom:16 }}>
                <div style={{ width:56, height:56, borderRadius:16, background:"rgba(255,107,107,0.12)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto" }}>
                  <Icon name="Trash2" size={28} color="#FF6B6B" />
                </div>
                <div style={{ fontSize:18, fontWeight:800, marginTop:12 }}>Eliminar gasto fijo</div>
                <div className="txt-dim" style={{ fontSize:14, marginTop:4 }}>¿Seguro? Esta acción no se puede deshacer.</div>
              </div>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? "Eliminando..." : "Sí, eliminar"}</Button>
              <div style={{ height:8 }} />
              <Button type="button" variant="ghost" onClick={() => setDeletingId(null)}>Cancelar</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create/Edit Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {editing && (
          <div style={{ position:"fixed", inset:0, zIndex:9995, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems: editMode ? "flex-end" : "center", justifyContent:"center", padding: editMode ? 0 : 20 }} onClick={() => setEditing(false)}>
            <motion.div initial={editMode ? { y:"100%" } : { scale:0.9, opacity:0 }} animate={editMode ? { y:0 } : { scale:1, opacity:1 }} exit={editMode ? { y:"100%" } : { scale:0.9, opacity:0 }} transition={{ type:"spring", damping:28, stiffness:300 }}
              style={{ width:"100%", maxWidth:500, maxHeight: "92dvh", borderRadius: "28px 28px 0 0", padding:"24px 22px 34px", overflowY:"auto", background:"var(--sheet)", border:"1px solid var(--glass-border-strong)", boxShadow:"var(--shadow)" }}
              onClick={(e) => e.stopPropagation()}>
              {editMode && <div style={{ width:40, height:5, borderRadius:10, background:"var(--track)", margin:"0 auto 20px" }} />}

              {editMode ? (
                /* ── Global Edit ────────────────────────────────── */
                <>
                  <div style={{ textAlign:"center", marginBottom:20 }}>
                    <Icon name={fIcon} size={36} />
                    <div style={{ fontSize:20, fontWeight:800, marginTop:8 }}>Editar gasto fijo</div>
                  </div>
                  <form onSubmit={handleSave}>
                    <label className="field-label">Nombre</label>
                    <input className="nexora-input" value={fName} onChange={(e) => setFName(e.target.value)} autoFocus />
                    <label className="field-label">Monto</label>
                    <div style={{ position:"relative", marginBottom:8 }}>
                      <span style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", color:"var(--text-faint)", fontWeight:600 }}>$</span>
                      <input className="nexora-input" style={{ paddingLeft:38, fontSize:18, fontWeight:700, marginBottom:0, opacity: fVariable ? 0.4 : 1 }}
                        placeholder="0" value={fAmount} onChange={(e) => setFAmount(fmtInput(e.target.value))} inputMode="numeric" disabled={fVariable} />
                    </div>
                    <div className="glass-card row" onClick={() => { setFVariable(!fVariable); if (!fVariable) setFAmount(""); }} style={{ cursor:"pointer" }}>
                      <span className="txt-strong">Es un gasto variable</span>
                      <ToggleSwitch checked={fVariable} onChange={() => {}} />
                    </div>
                    <DaySelector label="Día de corte" value={fDue} onChange={setFDue} />
                    <DaySelector label="Día límite" value={fDeadline} onChange={setFDeadline} />
                    <label className="field-label">Categoría</label>
                    <CategorySelect categories={cats.filter((c) => c.type === "expense")} value={fCatId} onChange={(id) => { const cat = cats.find((c) => c.id === id); setFCatId(id); if (cat) { setFCatName(cat.name); setFIcon(cat.icon); } }} placeholder="Elige categoría..." />

                    <div className="glass-card row" onClick={() => toggleActive(selected!)} style={{ cursor:"pointer" }}>
                      <span className="txt-strong">{selected?.active ? "Pausar gasto" : "Reactivar gasto"}</span>
                      <ToggleSwitch checked={selected?.active || false} onChange={() => toggleActive(selected!)} />
                    </div>

                    <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Actualizar"}</Button>
                    <div style={{ height:8 }} />
                    <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
                  </form>
                </>
              ) : (
                /* ── Step by Step Create ─────────────────────────── */
                <>
                  <div style={{ textAlign:"center", marginBottom:20 }}>
                    <div className="eyebrow">Paso {step} de {totalSteps}</div>
                    <div style={{ fontSize:20, fontWeight:800 }}>Nuevo gasto fijo</div>
                  </div>

                  {step === 1 && (
                    <motion.div key="s1" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}>
                      <label className="field-label">¿Cómo se llama este gasto?</label>
                      <input className="nexora-input" placeholder="Ej. Internet, Spotify, Arriendo..." value={fName} onChange={(e) => setFName(e.target.value)} autoFocus />
                      <Button type="button" onClick={nextStep} style={{ marginTop: 8 }}>Siguiente</Button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="s2" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}>
                      <label className="field-label">¿Cuánto cuesta?</label>
                      <div style={{ position:"relative", marginBottom:12 }}>
                        <span style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", color:"var(--text-faint)", fontSize:20, fontWeight:600 }}>$</span>
                        <input className="nexora-input" style={{ paddingLeft:42, fontSize:24, fontWeight:800, marginBottom:0, opacity: fVariable ? 0.4 : 1 }}
                          placeholder="0" value={fAmount} onChange={(e) => setFAmount(fmtInput(e.target.value))} inputMode="numeric" disabled={fVariable} />
                      </div>
                      <div className="glass-card row" onClick={() => { setFVariable(!fVariable); if (!fVariable) setFAmount(""); }} style={{ cursor:"pointer", marginBottom: 0 }}>
                        <span className="txt-strong">Es un gasto variable</span>
                        <ToggleSwitch checked={fVariable} onChange={() => {}} />
                      </div>
                      {fVariable && <div className="txt-dim" style={{ fontSize:11, marginTop:6 }}>El monto se pedirá cada vez que registres el pago.</div>}
                      <div style={{ display:"flex", gap:8, marginTop: 14 }}>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)}>Atrás</Button>
                        <Button size="sm" onClick={nextStep}>Siguiente</Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div key="s3" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}>
                      <label className="field-label">Frecuencia</label>
                      <div className="segmented">{FREQS.map((f) => <div key={f.id} className={`seg ${fFreq === f.id ? "active" : ""}`} onClick={() => setFFreq(f.id)}>{f.label}</div>)}</div>
                      <DaySelector label="Día de corte" value={fDue} onChange={setFDue} />
                      <DaySelector label="Día límite" value={fDeadline} onChange={setFDeadline} />
                      <div style={{ display:"flex", gap:8 }}>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setStep(2)}>Atrás</Button>
                        <Button size="sm" onClick={nextStep}>Siguiente</Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div key="s4" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}>
                      <label className="field-label">Categoría</label>
                      <CategorySelect categories={cats.filter((c) => c.type === "expense")} value={fCatId} onChange={(id) => { const cat = cats.find((c) => c.id === id); setFCatId(id); if (cat) { setFCatName(cat.name); setFIcon(cat.icon); } }} placeholder="Elige categoría..." />
                      <div className="txt-dim" style={{ fontSize:11, marginBottom:14 }}>El icono se asignará automáticamente según la categoría.</div>
                      <div style={{ display:"flex", gap:8 }}>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setStep(3)}>Atrás</Button>
                        <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Crear gasto fijo"}</Button>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN verification modal */}
      <PinModal {...pinModalProps} />
    </>
  );
}
