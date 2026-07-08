"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { Icon, ICON_GROUPS } from "@/src/components/ui/icon";
import { DaySelector } from "@/src/components/ui/day-selector";
import { PinModal } from "@/src/components/ui/pin-modal";
import { usePinGuard } from "@/src/hooks/use-pin-guard";
import { toast } from "sonner";

interface Card { id: string; name: string; brand: string; type: string; cutDay: number; dueDay: number; color: string; icon: string; gradient: string; }

const BRANDS = ["VISA","MASTERCARD","AMEX","DINERS"];
const COLORS = ["#3B82F6","#8B5CF6","#14B8A6","#F59E0B","#FF6B6B","#34C759","#FF375F","#FF9F0A","#5856D6","#30D158","#AC8E68","#FFD60A","#AF52DE","#FF2D55","#E8635A","#FF9500","#8E8E93","#64D2FF","#00C7BE","#BF5AF2","#FF6482","#007AFF","#FF6B35","#2EB87D"];

export default function CardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { guardWithPin, pinModalProps } = usePinGuard();

  // Edit
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fName, setFName] = useState(""); const [fBrand, setFBrand] = useState("VISA");
  const [fType, setFType] = useState("credito"); const [fCut, setFCut] = useState(1);
  const [fDue, setFDue] = useState(15); const [fIcon, setFIcon] = useState("CreditCard");
  const [fColor, setFColor] = useState("#3B82F6"); const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const r = await fetch("/api/cards"); if (r.ok) setCards(await r.json()); }
    catch { toast.error("Error al cargar"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function startCreate() {
    setEditId(null); setFName(""); setFBrand("VISA"); setFType("credito");
    setFCut(1); setFDue(15); setFIcon("CreditCard"); setFColor("#3B82F6"); setEditing(true);
  }
  function startEdit(c: Card) {
    setEditId(c.id); setFName(c.name); setFBrand(c.brand); setFType(c.type);
    setFCut(c.cutDay); setFDue(c.dueDay); setFIcon(c.icon || "CreditCard"); setFColor(c.color); setEditing(true);
  }

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault();
    if (!fName.trim()) return toast.error("Elige un nombre");
    if (fCut < 1 || fCut > 31 || fDue < 1 || fDue > 31) return toast.error("Días inválidos");
    setSaving(true);
    const p = { name:fName.trim(), brand:fBrand, type:fType, cutDay:fCut, dueDay:fDue, icon:fIcon, color:fColor };
    try {
      if (editId) {
        await fetch(`/api/cards/${editId}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(p) });
        toast.success("Tarjeta actualizada");
      } else {
        await fetch("/api/cards", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(p) });
        toast.success("Tarjeta creada");
      }
      setEditing(false); setEditId(null); await load();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  const doDeleteCard = useCallback(async (id: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/cards/${id}`, { method:"DELETE" });
      setCards((prev) => prev.filter((c) => c.id !== id));
      toast.success("Tarjeta eliminada"); setDeletingId(null); setSwipedId(null);
    } catch { toast.error("Error"); }
    finally { setDeleting(false); }
  }, []);

  function handleDeleteCard() {
    const id = deletingId;
    if (!id) return;
    guardWithPin(
      () => doDeleteCard(id),
      "Eliminar tarjeta",
      "Ingresa tu PIN para confirmar la eliminación"
    );
  }

  return (
    <>
      <h1 className="page-title" style={{ fontSize:24 }}>Tarjetas</h1>

      {loading ? <CardSkeleton /> : cards.length === 0 ? (
        <EmptyState icon="CreditCard" title="Sin tarjetas" description="Agrega tus tarjetas para registrar movimientos." />
      ) : (
        <div onClick={() => setSwipedId(null)}>
        <AnimatePresence mode="popLayout">
          {cards.map((c, i) => {
            const isSwiped = swipedId === c.id;
            return (
            <div key={c.id} style={{ position:"relative", overflow:"hidden", marginBottom:14, borderRadius:22 }}>
              <AnimatePresence>
                {isSwiped && (
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                    style={{ position:"absolute", right:0, top:0, bottom:0, display:"flex", zIndex:0 }}>
                    <div style={{ width:70, background:"var(--c-blue)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
                      onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); startEdit(c); setSwipedId(null); }}>
                      <Icon name="Pencil" size={20} color="#fff" />
                    </div>
                    <div style={{ width:70, background:"#FF6B6B", borderRadius:"0 22px 22px 0", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
                      onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setDeletingId(c.id); }}>
                      <Icon name="Trash2" size={20} color="#fff" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div layout initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0, x:isSwiped ? -140 : 0 }}
                exit={{ opacity:0, scale:0.95 }} transition={{ duration:0.25, delay:i*0.04, x:{ type:"spring", stiffness:300, damping:30 } }}
                className="credit-card-visual" style={{ background:c.gradient, marginBottom:0, cursor:"pointer", position:"relative", zIndex:1 }}
                drag="x" dragConstraints={{ left:-140, right:0 }} dragElastic={0} dragSnapToOrigin
                onDragEnd={(_, info) => { if (info.offset.x < -60) setSwipedId(c.id); else setSwipedId(null); }}
                onClick={() => { if (!isSwiped) router.push(`/cards/${c.id}`); else setSwipedId(null); }}>
                <div className="row" style={{ position:"relative", zIndex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Icon name={c.icon||"CreditCard"} size={22} color="#fff" />
                    <span style={{ fontWeight:700 }}>{c.name}</span>
                  </div>
                  <span style={{ fontSize:12, opacity:0.8, fontWeight:700 }}>{c.brand}</span>
                </div>
                <div style={{ position:"relative", zIndex:1, marginTop:8 }}>
                  <div style={{ fontSize:13, opacity:0.8, display:"flex", alignItems:"center", gap:6 }}>
                    <Icon name={c.type==="credito"?"CreditCard":"Building2"} size={14} />
                    {c.type==="credito"?"Crédito":"Débito"}
                  </div>
                  {c.type==="credito" && <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>Corte: día {c.cutDay} · Pago: día {c.dueDay}</div>}
                  <div className="row" style={{ marginTop:10, fontSize:12, opacity:0.85 }}>
                    <span>Explorar</span><Icon name="ChevronRight" size={14} />
                  </div>
                </div>
              </motion.div>
            </div>
          )})}
        </AnimatePresence>
        </div>
      )}

      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}>
        <Button variant="secondary" onClick={startCreate}>+ Agregar tarjeta</Button>
      </motion.div>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deletingId && (
          <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:30 }} onClick={() => setDeletingId(null)}>
            <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }} transition={{ type:"spring", damping:25, stiffness:350 }}
              style={{ width:"100%", maxWidth:360, borderRadius:24, padding:28, background:"var(--sheet)", border:"1px solid var(--glass-border-strong)", boxShadow:"var(--shadow)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ textAlign:"center", marginBottom:16 }}>
                <div style={{ width:56, height:56, borderRadius:16, background:"rgba(255,107,107,0.12)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto" }}>
                  <Icon name="Trash2" size={28} color="#FF6B6B" /></div>
                <div style={{ fontSize:18, fontWeight:800, marginTop:12 }}>Eliminar tarjeta</div>
                <div className="txt-dim" style={{ fontSize:14, marginTop:4 }}>¿Seguro? También se eliminarán sus movimientos.</div>
              </div>
              <Button variant="danger" onClick={handleDeleteCard} disabled={deleting}>{deleting?"Eliminando...":"Sí, eliminar"}</Button>
              <div style={{ height:8 }} /><Button type="button" variant="ghost" onClick={() => setDeletingId(null)}>Cancelar</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {editing && (
          <div style={{ position:"fixed", inset:0, zIndex:9995, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={() => setEditing(false)}>
            <motion.div initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }} transition={{ type:"spring", damping:28, stiffness:300 }}
              style={{ width:"100%", maxWidth:500, maxHeight:"90dvh", borderRadius:"28px 28px 0 0", padding:"24px 22px 34px", overflowY:"auto", background:"var(--sheet)", border:"1px solid var(--glass-border-strong)", boxShadow:"var(--shadow)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ width:40, height:5, borderRadius:10, background:"var(--track)", margin:"0 auto 20px" }} />
              <div style={{ textAlign:"center", marginBottom:20 }}><Icon name={fIcon} size={36} color={fColor} /><div style={{ fontSize:20, fontWeight:800, marginTop:8 }}>{editId?"Editar tarjeta":"Nueva tarjeta"}</div></div>
              <div className="credit-card-visual" style={{ background:`linear-gradient(135deg, ${fColor}dd, ${fColor})`, marginBottom:20 }}>
                <div className="row" style={{ position:"relative", zIndex:1 }}><div style={{ display:"flex", alignItems:"center", gap:8 }}><Icon name={fIcon} size={22} color="#fff" /><span style={{ fontWeight:700 }}>{fName||"Nombre"}</span></div><span style={{ fontSize:12, opacity:0.8, fontWeight:700 }}>{fBrand}</span></div>
                <div style={{ position:"relative", zIndex:1, marginTop:8 }}><div style={{ fontSize:13, opacity:0.9, display:"flex", alignItems:"center", gap:6 }}><Icon name={fType==="credito"?"CreditCard":"Building2"} size={14} />{fType==="credito"?"Crédito":"Débito"}</div>{fType==="credito"&&<div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>Corte: día {fCut} · Pago: día {fDue}</div>}</div>
              </div>
              <form onSubmit={handleSaveCard}>
                <label className="field-label">Nombre</label><input className="nexora-input" placeholder="Ej. Visa Personal" value={fName} onChange={(e) => setFName(e.target.value)} autoFocus />
                <label className="field-label">Franquicia</label>
                <div className="chip-row">{BRANDS.map((b) => <span key={b} className={`chip ${fBrand===b?"active":""}`} onClick={() => setFBrand(b)}>{b}</span>)}</div>
                <label className="field-label">Tipo</label>
                <div className="segmented">
                  {[{ id:"credito", icon:"CreditCard", label:"Crédito" },{ id:"debito", icon:"Building2", label:"Débito" }].map((t) => (
                    <div key={t.id} className={`seg ${fType===t.id?"active":""}`} onClick={() => setFType(t.id)}><Icon name={t.icon} size={14} /> {t.label}</div>
                  ))}
                </div>
                {fType==="credito" && <div style={{ display:"flex", gap:12 }}><div style={{ flex:1 }}><DaySelector label="Día de corte" value={fCut} onChange={setFCut} /></div><div style={{ flex:1 }}><DaySelector label="Día de pago" value={fDue} onChange={setFDue} /></div></div>}
                <label className="field-label">Icono</label>
                <div style={{ maxHeight:200, overflowY:"auto", marginBottom:14 }}>
                  {ICON_GROUPS.map((group) => (
                    <div key={group.label} style={{ marginBottom:8 }}><div className="txt-faint" style={{ fontSize:10, marginBottom:4 }}>{group.label}</div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {group.icons.map((i) => (
                          <motion.div key={i} whileTap={{ scale:0.85 }} onClick={() => setFIcon(i)}
                            style={{ width:46, height:46, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", background:fIcon===i?fColor:"var(--glass)", border:fIcon===i?`2px solid ${fColor}`:"1px solid var(--glass-border-strong)", boxShadow:fIcon===i?`0 0 12px ${fColor}44`:undefined }}>
                            <Icon name={i} size={22} color={fIcon===i?"#fff":"var(--text-dim)"} /></motion.div>
                        ))}
                      </div></div>
                  ))}
                </div>
                <label className="field-label">Color</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
                  {COLORS.map((c) => (
                    <motion.div key={c} whileTap={{ scale:0.85 }} onClick={() => setFColor(c)}
                      style={{ width:38, height:38, borderRadius:"50%", background:c, cursor:"pointer", border:fColor===c?"2px solid var(--text)":"2px solid transparent", boxShadow:fColor===c?`0 0 0 3px ${c}44`:undefined, position:"relative" }}>
                      {fColor===c && <Icon name="Check" size={18} color="#fff" />}</motion.div>
                  ))}
                </div>
                <Button type="submit" disabled={saving}>{saving?"Guardando...":editId?"Actualizar tarjeta":"Crear tarjeta"}</Button>
                <div style={{ height:8 }} /><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN verification modal */}
      <PinModal {...pinModalProps} />
    </>
  );
}
