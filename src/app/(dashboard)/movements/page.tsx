"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "@/src/components/ui/empty-state";
import { ListSkeleton } from "@/src/components/ui/skeleton";
import { Icon } from "@/src/components/ui/icon";
import { Button } from "@/src/components/ui/button";
import { PinModal } from "@/src/components/ui/pin-modal";
import { usePinGuard } from "@/src/hooks/use-pin-guard";
import { fmt } from "@/src/utils/format";
import { toast } from "sonner";

interface Tx {
  id: string; type: string; name: string; cat: string; amount: number;
  date: string; dateRaw: string; icon: string; deletedAt?: string | null; daysLeft?: number | null;
}

const FILTERS = ["Todos", "Ingreso", "Gasto"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function isToday(dateRaw: string) {
  const d = new Date(dateRaw);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}
function getDateLabel(dateRaw: string) {
  const d = new Date(dateRaw);
  return `${d.getDate()} de ${MONTHS_SHORT[d.getMonth()]}. del ${d.getFullYear()}`;
}
function isSameDay(a: string, b: string) {
  return a.split("T")[0] === b.split("T")[0];
}

export default function MovementsPage() {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [fType, setFType] = useState("all"); // all, income, expense
  const [fCard, setFCard] = useState("all"); // all, credito, debito, none
  const [fCat, setFCat] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const activeFilters = fType !== "all" || fCard !== "all" || fCat !== "" || fDateFrom !== "";
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadRef = { current: null as ((append?: boolean) => Promise<void>) | null };
  const { guardWithPin, pinModalProps } = usePinGuard();

  const load = useCallback(async (append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "15" });
      const currentCursor = append ? cursorStack[cursorStack.length - 1] : null;
      if (currentCursor) params.set("cursor", currentCursor);
      const [txRes, catsRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        !append ? fetch("/api/categories") : Promise.resolve(null),
      ]);
      if (txRes.ok) {
        const d = await txRes.json();
        if (append) { setTxs((prev) => [...prev, ...d.data]); setCursorStack((s) => [...s, d.nextCursor]); }
        else { setTxs(d.data); setCursorStack(d.nextCursor ? [d.nextCursor] : []); }
        setHasMore(d.hasMore);
      }
      if (catsRes?.ok) setCats(await catsRes.json());
    } catch { toast.error("Error al cargar"); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [cursorStack]);

  // Store load in ref so IntersectionObserver doesn't recreate
  loadRef.current = load;

  useEffect(() => { load(); }, []); // eslint-disable-line

  // Lazy load with IntersectionObserver
  useEffect(() => {
    if (!hasMore) return;
    const container = document.getElementById("app-scroll-container");
    const sentinel = document.getElementById("movements-sentinel");
    if (!container || !sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore && hasMore) {
        loadRef.current?.(true);
      }
    }, { root: container, rootMargin: "200px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore]);

  const doDelete = useCallback(async (tx: Tx) => {
    try {
      const r = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
      if (r.ok) {
        setTxs((prev) => prev.filter((t) => t.id !== tx.id));
        toast.success("Enviado a la papelera");
      }
    } catch { toast.error("Error al eliminar"); }
  }, []);

  function handleDelete(tx: Tx) {
    guardWithPin(
      () => doDelete(tx),
      "Eliminar movimiento",
      "Ingresa tu PIN para confirmar la eliminación"
    );
  }

  const filtered = (() => {
    let list = txs;
    if (fType === "income") list = list.filter((t) => t.type === "income");
    if (fType === "expense") list = list.filter((t) => t.type === "expense");
    if (fCat) list = list.filter((t) => t.cat === fCat);
    if (fDateFrom) list = list.filter((t) => t.dateRaw >= fDateFrom);
    if (fDateTo) list = list.filter((t) => t.dateRaw <= fDateTo);
    return list;
  })();

  // Group by date
  let currentMonth = "";
  let currentDate = "";

  return (
    <>
      {/* Fixed header */}
      <div style={{
        position:"sticky", top:0, zIndex:10,
        paddingBottom:8, margin:"0px -20px 0", padding:"10px 20px 8px",
        backdropFilter:"blur(20px) saturate(180%)", WebkitBackdropFilter:"blur(20px) saturate(180%)",
      }}>
        <div className="row" style={{ marginBottom: 4 }}>
          <h1 className="page-title" style={{ fontSize: 24, margin: 0 }}>Movimientos</h1>
        </div>

        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" variant={activeFilters ? "primary" : "secondary"} onClick={() => setShowFilters(true)} style={{ width:"auto", gap:6 }}>
            <Icon name="SlidersHorizontal" size={14} /> Filtros {activeFilters ? "✓" : ""}
          </Button>
          {activeFilters && (
            <Button size="sm" variant="ghost" onClick={() => { setFType("all"); setFCard("all"); setFCat(""); setFDateFrom(""); setFDateTo(""); }}
              style={{ width:"auto", fontSize:12, color:"var(--c-blue)" }}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {loading ? <ListSkeleton rows={5} /> : filtered.length === 0 ? (
        <EmptyState icon="Receipt" title="Sin movimientos" description="No encontramos movimientos." />
      ) : (
        <div onClick={() => setSwipedId(null)}>
        <AnimatePresence mode="popLayout">
          {filtered.map((t, i) => {
            const d = new Date(t.dateRaw);
            const monthKey = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
            const dateKey = t.dateRaw.split("T")[0];
            const showMonth = monthKey !== currentMonth;
            const showDate = dateKey !== currentDate;
            if (showMonth) currentMonth = monthKey;
            if (showDate) currentDate = dateKey;

            return (
              <motion.div key={t.id} layout initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:-40 }} transition={{ duration:0.2, delay:(i % 10) * 0.02 }}>
                {/* Month header */}
                {showMonth && (
                  <div style={{
                    display:"flex", alignItems:"center", gap:10, marginTop: i > 0 ? 20 : 0, marginBottom: 10,
                  }}>
                    <div style={{ flex:1, height:2, background: "var(--c-blue)", opacity:0.3, borderRadius:1 }} />
                    <span className="txt-strong" style={{ fontSize:13, color:"var(--c-blue)", whiteSpace:"nowrap" }}>
                      Movimientos de {monthKey}
                    </span>
                    <div style={{ flex:1, height:2, background: "var(--c-blue)", opacity:0.3, borderRadius:1 }} />
                  </div>
                )}

                {/* Date header */}
                {showDate && !isToday(t.dateRaw) && (
                  <div className="txt-dim" style={{ fontSize:11, paddingLeft:4, marginBottom:4, marginTop: showMonth ? 0 : 10 }}>
                    {getDateLabel(t.dateRaw)}
                  </div>
                )}

                {/* Transaction row with swipe */}
                <div style={{ position:"relative", overflow:"hidden", marginBottom:4, borderRadius:18 }}>
                  {swipedId === t.id && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      style={{ position:"absolute", right:0, top:0, bottom:0, width:70, background:"#FF6B6B", borderRadius:"0 18px 18px 0", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", zIndex:0 }}
                      onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDelete(t); setSwipedId(null); }}>
                      <Icon name="Trash2" size={20} color="#fff" />
                    </motion.div>
                  )}
                  <motion.div
                    animate={{ x: swipedId === t.id ? -70 : 0 }}
                    transition={{ x: { type:"spring", stiffness:300, damping:30 } }}
                    className="glass-card" style={{ padding:10, marginBottom:0, cursor:"pointer", position:"relative", zIndex:1 }}
                    drag="x" dragConstraints={{ left:-70, right:0 }} dragElastic={0}
                    dragSnapToOrigin
                    onDragEnd={(_, info) => { if (info.offset.x < -40) setSwipedId(t.id); else setSwipedId(null); }}
                    onClick={() => {
                      if (swipedId === t.id) { setSwipedId(null); return; }
                      router.push(`/movements/${t.id}`);
                    }}>
                    <div className="row">
                      <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
                        <div className="icon-circ" style={{ background:"var(--glass-strong)", width:36, height:36, borderRadius:10 }}>
                          <Icon name={t.icon || "Package"} size={18} />
                        </div>
                        <div className="col">
                          <span className="txt-strong" style={{ fontSize:13 }}>{t.name}</span>
                          <span className="txt-dim" style={{ fontSize:11 }}>{t.cat}</span>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span className={t.type === "income" ? "amount-pos" : "amount-neg"} style={{ fontSize:13 }}>
                          {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        </div>
      )}

      {/* PIN verification modal */}
      <PinModal {...pinModalProps} />

      <div id="movements-sentinel" style={{ height:1 }} />
      {loadingMore && <div className="txt-dim" style={{ textAlign:"center", padding:12, fontSize:12 }}>Cargando más...</div>}
      {!hasMore && txs.length > 0 && <div className="txt-dim" style={{ textAlign:"center", padding:"20px 0 30px", fontSize:12 }}>No hay más datos que mostrar</div>}
      {/* Filter Modal */}
      <AnimatePresence>
        {showFilters && (
          <div style={{ position:"fixed", inset:0, zIndex:9995, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
            onClick={() => setShowFilters(false)}>
            <motion.div initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }} transition={{ type:"spring", damping:28, stiffness:300 }}
              style={{ width:"100%", maxWidth:500, borderRadius:"28px 28px 0 0", padding:"24px 22px 34px", background:"var(--sheet)", border:"1px solid var(--glass-border-strong)", boxShadow:"var(--shadow)" }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ width:40, height:5, borderRadius:10, background:"var(--track)", margin:"0 auto 20px" }} />
              <div style={{ fontSize:20, fontWeight:800, textAlign:"center", marginBottom:20 }}>Filtros</div>

              <label className="field-label">Tipo de movimiento</label>
              <div className="segmented">
                {[{ v:"all", l:"Todos" },{ v:"income", l:"Ingresos" },{ v:"expense", l:"Gastos" }].map((o) => (
                  <div key={o.v} className={`seg ${fType===o.v?"active":""}`} onClick={() => setFType(o.v)}>{o.l}</div>
                ))}
              </div>

              <label className="field-label">Método de pago</label>
              <div className="segmented">
                {[{ v:"all", l:"Todos" },{ v:"Efectivo", l:"Efectivo" },{ v:"Transferencia", l:"Transf." },{ v:"Débito", l:"Débito" },{ v:"Crédito", l:"Crédito" }].map((o) => (
                  <div key={o.v} className={`seg ${fCard===o.v?"active":""}`} onClick={() => setFCard(o.v)}>{o.l}</div>
                ))}
              </div>

              <label className="field-label">Categoría</label>
              <div style={{ maxHeight:200, overflowY:"auto", borderRadius:14, border:"1px solid var(--glass-border-strong)", marginBottom:14 }}>
                <div
                  onClick={() => setFCat("")}
                  style={{ padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
                    background: fCat === "" ? "var(--c-blue)" : "transparent",
                    color: fCat === "" ? "#fff" : "var(--text)", fontWeight: fCat === "" ? 700 : 500,
                    fontSize:13, borderRadius:"13px 13px 0 0" }}>
                  <Icon name="Layers" size={14} color={fCat === "" ? "#fff" : "var(--text-dim)"} /> Todas las categorías
                </div>
                {cats.map((c) => (
                  <div key={c.id}
                    onClick={() => setFCat(fCat === c.name ? "" : c.name)}
                    style={{ padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
                      background: fCat === c.name ? "rgba(10,132,255,0.1)" : "transparent",
                      borderTop:"1px solid var(--glass-border)",
                      fontWeight: fCat === c.name ? 700 : 500, fontSize:13 }}>
                    <Icon name={c.name === fCat ? "CheckCircle" : "Circle"} size={16} color={fCat === c.name ? "var(--c-blue)" : "var(--text-faint)"} />
                    {c.name}
                  </div>
                ))}
              </div>

              <label className="field-label">Desde</label>
              <input className="nexora-input" type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)} />
              <label className="field-label">Hasta</label>
              <input className="nexora-input" type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)} />

              <Button onClick={() => setShowFilters(false)}>Aplicar filtros</Button>
              <div style={{ height:8 }} />
              <Button type="button" variant="ghost" onClick={() => { setFType("all"); setFCard("all"); setFCat(""); setFDateFrom(""); setFDateTo(""); }}>Limpiar todo</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}
