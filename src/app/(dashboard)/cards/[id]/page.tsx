"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TopNav } from "@/src/components/layout/top-nav";
import { Button } from "@/src/components/ui/button";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { Icon } from "@/src/components/ui/icon";
import { PinModal } from "@/src/components/ui/pin-modal";
import { usePinGuard } from "@/src/hooks/use-pin-guard";
import { fmt } from "@/src/utils/format";
import { toast } from "sonner";

interface Card { id: string; name: string; brand: string; type: string; cutDay: number; dueDay: number; color: string; icon: string; gradient: string; }
interface Tx { id: string; type: string; name: string; cat: string; amount: number; date: string; icon: string; cardName?: string; installments?: number; }
interface Cat { id: string; name: string; icon: string; color: string; type: string; }

function fmtInput(v: string) { const d = v.replace(/\D/g,""); return d ? parseInt(d,10).toLocaleString("es-CO") : ""; }
function parseFmt(s: string) { return parseInt(s.replace(/\D/g,""),10) || 0; }

export default function CardDetailPage() {
  const params = useParams();
  const cardId = params.id as string;

  const [card, setCard] = useState<Card | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  // Tx detail
  const [txDetail, setTxDetail] = useState<Tx | null>(null);
  // Edit tx
  const [editingTx, setEditingTx] = useState<Tx | null>(null);
  const [fTxName, setFTxName] = useState(""); const [fTxCat, setFTxCat] = useState("");
  const [fTxAmount, setFTxAmount] = useState(""); const [savingTx, setSavingTx] = useState(false);
  const [deletingTx, setDeletingTx] = useState<Tx | null>(null);

  // Pay card
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const { guardWithPin, pinModalProps } = usePinGuard();

  const load = useCallback(async () => {
    try {
      const [cardRes, txsRes, catsRes] = await Promise.all([
        fetch(`/api/cards/${cardId}`),
        fetch(`/api/transactions?cardId=${cardId}`),
        fetch("/api/categories"),
      ]);
      if (cardRes.ok) setCard(await cardRes.json());
      if (txsRes.ok) { const d = await txsRes.json(); setTxs(d.data); }
      if (catsRes.ok) setCats(await catsRes.json());
    } catch { toast.error("Error al cargar"); }
    finally { setLoading(false); }
  }, [cardId]);

  useEffect(() => { load(); }, [load]);

  // Edit tx
  function openEditTx(tx: Tx) { setEditingTx(tx); setFTxName(tx.name); setFTxCat(tx.cat); setFTxAmount(tx.amount.toLocaleString("es-CO")); }
  async function handleSaveTx(e: React.FormEvent) {
    e.preventDefault(); if (!editingTx) return;
    const amount = parseFmt(fTxAmount);
    if (!fTxName.trim()) return toast.error("Describe el movimiento");
    if (amount <= 0) return toast.error("Ingresa un monto válido");
    setSavingTx(true);
    try {
      const r = await fetch(`/api/transactions/${editingTx.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name: fTxName.trim(), cat: fTxCat, amount }) });
      if (!r.ok) throw new Error(""); const u = await r.json();
      setTxs((prev) => prev.map((t) => t.id === editingTx.id ? { ...t, ...u } : t));
      toast.success("Actualizado"); setEditingTx(null);
    } catch { toast.error("Error"); }
    finally { setSavingTx(false); }
  }
  async function doDeleteTx(id: string) {
    try { await fetch(`/api/transactions/${id}`, { method:"DELETE" }); setTxs((prev) => prev.filter((t) => t.id !== id)); toast.success("Eliminado"); setDeletingTx(null); }
    catch { toast.error("Error"); }
  }

  function handleDeleteTx() {
    if (!deletingTx) return;
    const id = deletingTx.id;
    guardWithPin(
      () => doDeleteTx(id),
      "Eliminar movimiento",
      "Ingresa tu PIN para eliminar este movimiento de la tarjeta"
    );
  }

  // Pay
  async function handlePay() {
    if (!card) return;
    const amount = parseFmt(payAmount);
    if (amount <= 0) return toast.error("Ingresa el monto pagado");
    setPaying(true);
    try {
      await fetch("/api/transactions", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ type:"expense", amount, description: `Pago ${card.name}`, cat:"Servicios", date:new Date().toISOString(), method:"Transferencia", cardId: card.id }) });
      toast.success(`Pago de ${fmt(amount)} registrado`);
      setPayAmount("");
      await load();
    } catch { toast.error("Error"); }
    finally { setPaying(false); }
  }

  // Check if in payment window AND not already paid this cycle
  const now = new Date();
  const todayDay = now.getDate();

  // Determine the most recent cut date (when the current billing cycle started)
  const cutPassedThisMonth = todayDay >= (card?.cutDay || 1);
  const lastCutDate = new Date(now.getFullYear(), cutPassedThisMonth ? now.getMonth() : now.getMonth() - 1, card?.cutDay || 1);

  // Check if already paid this cycle (any "Pago" transaction after the last cut)
  const alreadyPaidThisCycle = txs.some(
    (t) => t.type === "expense" && t.name.toLowerCase().includes("pago") && new Date(t.date) >= lastCutDate
  );

  const inPaymentWindow = card && card.type === "credito" && card.cutDay && card.dueDay &&
    todayDay >= card.cutDay && todayDay <= card.dueDay &&
    !alreadyPaidThisCycle;

  const totalSpent = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  if (loading) return <><TopNav title="Cargando..." backHref="/cards" /><CardSkeleton /></>;
  if (!card) return <><TopNav title="No encontrada" backHref="/cards" /><div className="txt-dim" style={{ textAlign:"center", padding:40 }}>Tarjeta no encontrada</div></>;

  return (
    <>
      <TopNav title={card.name} backHref="/cards" />

      {/* Card visual */}
      <div className="credit-card-visual" style={{ background: card.gradient, marginBottom: 16 }}>
        <div className="row" style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Icon name={card.icon || "CreditCard"} size={24} color="#fff" />
            <span style={{ fontWeight:700, fontSize:18 }}>{card.name}</span>
          </div>
          <span style={{ fontSize:12, opacity:0.8, fontWeight:700 }}>{card.brand}</span>
        </div>
        <div style={{ position:"relative", zIndex:1, marginTop:10 }}>
          <div style={{ fontSize:13, opacity:0.9, fontWeight:600 }}>
            <Icon name={card.type === "credito" ? "CreditCard" : "Building2"} size={14} /> {card.type === "credito" ? "Crédito" : "Débito"}
          </div>
          {card.type === "credito" && (
            <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>Corte: día {card.cutDay} · Pago: día {card.dueDay}</div>
          )}
        </div>
      </div>

      {/* Pay button for credit cards */}
      {card.type === "credito" && (
        <div className="glass" style={{ padding:14, borderRadius:18, marginBottom:16, textAlign:"center" }}>
          {alreadyPaidThisCycle ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <Icon name="CheckCircle" size={20} color="var(--c-save)" />
              <span style={{ fontWeight: 700, color: "var(--c-save)", fontSize: 14 }}>Ya pagado este ciclo</span>
            </div>
          ) : inPaymentWindow ? (
            <>
              <div className="txt-dim" style={{ fontSize:12, marginBottom:8 }}>
                Estás en período de pago (día {card.cutDay} al {card.dueDay})
              </div>
              <div style={{ position:"relative", marginBottom:10 }}>
                <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--text-faint)", fontWeight:600 }}>$</span>
                <input className="nexora-input" style={{ paddingLeft:34, fontSize:20, fontWeight:700, marginBottom:0, textAlign:"center" }}
                  placeholder="¿Cuánto pagaste?" value={payAmount} onChange={(e) => setPayAmount(fmtInput(e.target.value))} inputMode="numeric" />
              </div>
              <Button onClick={handlePay} disabled={paying} size="sm">
                <Icon name="CheckCircle" size={16} /> {paying ? "Registrando..." : "Registrar pago"}
              </Button>
            </>
          ) : todayDay < (card.cutDay || 1) ? (
            <div className="txt-dim" style={{ fontSize:13 }}>
              Período de pago: día {card.cutDay} al {card.dueDay}
            </div>
          ) : (
            <div className="txt-dim" style={{ fontSize:13, color:"#FF6B6B" }}>
              Período de pago vencido (día {card.dueDay})
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="row" style={{ marginBottom:16, gap:8 }}>
        <div className="glass" style={{ flex:1, padding:"10px 12px", borderRadius:14, textAlign:"center" }}>
          <div className="txt-faint" style={{ fontSize:10 }}>Movimientos</div>
          <div className="txt-strong" style={{ fontSize:15 }}>{txs.length}</div>
        </div>
        <div className="glass" style={{ flex:1, padding:"10px 12px", borderRadius:14, textAlign:"center" }}>
          <div className="txt-faint" style={{ fontSize:10 }}>Total gastado</div>
          <div className="txt-strong" style={{ fontSize:15, color:"#FF6B6B" }}>{fmt(totalSpent)}</div>
        </div>
      </div>

      {/* Transactions */}
      <div className="eyebrow">Movimientos</div>
      {txs.length === 0 ? (
        <div className="txt-dim" style={{ textAlign:"center", padding:30, fontSize:13 }}>Sin movimientos con esta tarjeta</div>
      ) : (
        txs.map((tx) => (
          <div key={tx.id} className="glass-card" style={{ padding:10, marginBottom:6, cursor:"pointer" }} onClick={() => setTxDetail(tx)}>
            <div className="row">
              <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
                <div className="icon-circ" style={{ background:"var(--glass-strong)", width:36, height:36, borderRadius:10 }}>
                  <Icon name={tx.icon || "Package"} size={18} />
                </div>
                <div>
                  <div className="txt-strong" style={{ fontSize:13 }}>{tx.name}</div>
                  <div className="txt-dim" style={{ fontSize:11 }}>{tx.cat} · {tx.date}</div>
                </div>
              </div>
              <span className={tx.type === "income" ? "amount-pos" : "amount-neg"} style={{ fontSize:14 }}>
                {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
              </span>
            </div>
          </div>
        ))
      )}

      {/* Tx Detail Modal */}
      <AnimatePresence>
        {txDetail && (
          <div style={{ position:"fixed", inset:0, zIndex:9995, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
            onClick={() => setTxDetail(null)}>
            <motion.div initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
              transition={{ type:"spring", damping:28, stiffness:300 }}
              style={{ width:"100%", maxWidth:500, borderRadius:"28px 28px 0 0", padding:"20px 22px 28px", background:"var(--sheet)", border:"1px solid var(--glass-border-strong)", boxShadow:"var(--shadow)" }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ width:40, height:5, borderRadius:10, background:"var(--track)", margin:"0 auto 16px" }} />

              {/* Header with icon + amount + actions */}
              <div className="row" style={{ marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div className="icon-circ" style={{ background:"var(--glass-strong)", width:48, height:48, borderRadius:14 }}>
                    <Icon name={txDetail.icon || "Package"} size={24} />
                  </div>
                  <div>
                    <div className="txt-strong" style={{ fontSize:16 }}>{txDetail.name}</div>
                    <div className="txt-dim" style={{ fontSize:12 }}>{txDetail.cat}</div>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div className={txDetail.type === "income" ? "amount-pos" : "amount-neg"} style={{ fontSize:22, fontWeight:800 }}>
                    {txDetail.type === "income" ? "+" : "-"}{fmt(txDetail.amount)}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="glass" style={{ padding:14, borderRadius:16, marginBottom:14 }}>
                <div className="row" style={{ marginBottom:6 }}>
                  <span className="txt-faint" style={{ fontSize:11 }}>Fecha</span>
                  <span className="txt-strong" style={{ fontSize:13 }}>{txDetail.date}</span>
                </div>
                <div className="row" style={{ marginBottom:6 }}>
                  <span className="txt-faint" style={{ fontSize:11 }}>Tipo</span>
                  <span className="txt-strong" style={{ fontSize:13 }}>{txDetail.type === "income" ? "Ingreso" : "Gasto"}</span>
                </div>
                {txDetail.installments && txDetail.installments > 1 && (
                  <div className="row" style={{ marginBottom:6 }}>
                    <span className="txt-faint" style={{ fontSize:11 }}>Cuotas</span>
                    <span className="txt-strong" style={{ fontSize:13 }}>{txDetail.installments} cuotas</span>
                  </div>
                )}
                <div className="row">
                  <span className="txt-faint" style={{ fontSize:11 }}>Tarjeta</span>
                  <span className="txt-strong" style={{ fontSize:13 }}>{txDetail.cardName || card.name}</span>
                </div>
              </div>

              {/* Close + Actions row */}
              <div className="row">
                <Button type="button" variant="ghost" size="sm" onClick={() => setTxDetail(null)}>Cerrar</Button>
                <div style={{ display:"flex", gap:8 }}>
                  <div className="top-nav-btn" style={{ width:36, height:36, borderRadius:12 }}
                    onClick={() => { openEditTx(txDetail); setTxDetail(null); }}>
                    <Icon name="Pencil" size={16} />
                  </div>
                  <div className="top-nav-btn" style={{ width:36, height:36, borderRadius:12, background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.25)" }}
                    onClick={() => { setDeletingTx(txDetail); setTxDetail(null); }}>
                    <Icon name="Trash2" size={16} color="#FF6B6B" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Tx Modal */}
      <AnimatePresence>
        {editingTx && (
          <div style={{ position:"fixed", inset:0, zIndex:9995, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:30 }}
            onClick={() => setEditingTx(null)}>
            <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
              transition={{ type:"spring", damping:25, stiffness:350 }}
              style={{ width:"100%", maxWidth:400, borderRadius:24, padding:28, background:"var(--sheet)", border:"1px solid var(--glass-border-strong)", boxShadow:"var(--shadow)" }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ textAlign:"center", marginBottom:20 }}><Icon name="Pencil" size={32} color="var(--c-blue)" /><div style={{ fontSize:18, fontWeight:800, marginTop:8 }}>Editar movimiento</div></div>
              <form onSubmit={handleSaveTx}>
                <label className="field-label">Descripción</label><input className="nexora-input" value={fTxName} onChange={(e) => setFTxName(e.target.value)} autoFocus />
                <label className="field-label">Categoría</label>
                <select className="nexora-select" value={fTxCat} onChange={(e) => setFTxCat(e.target.value)}>{cats.map((c) => <option key={c.id}>{c.name}</option>)}</select>
                <label className="field-label">Monto</label>
                <div style={{ position:"relative", marginBottom:12 }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--text-faint)", fontWeight:600 }}>$</span>
                <input className="nexora-input" style={{ paddingLeft:34, fontSize:18, fontWeight:700, marginBottom:0 }} value={fTxAmount} onChange={(e) => setFTxAmount(fmtInput(e.target.value))} inputMode="numeric" /></div>
                <Button type="submit" disabled={savingTx}>{savingTx ? "Guardando..." : "Actualizar"}</Button>
                <div style={{ height:8 }} /><Button type="button" variant="ghost" onClick={() => setEditingTx(null)}>Cancelar</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Tx Confirm */}
      <AnimatePresence>
        {deletingTx && (
          <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:30 }} onClick={() => setDeletingTx(null)}>
            <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }} transition={{ type:"spring", damping:25, stiffness:350 }}
              style={{ width:"100%", maxWidth:360, borderRadius:24, padding:28, background:"var(--sheet)", border:"1px solid var(--glass-border-strong)", boxShadow:"var(--shadow)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ textAlign:"center", marginBottom:16 }}><div style={{ width:56, height:56, borderRadius:16, background:"rgba(255,107,107,0.12)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto" }}><Icon name="Trash2" size={28} color="#FF6B6B" /></div></div>
              <div style={{ textAlign:"center", marginBottom:12 }}><div style={{ fontSize:18, fontWeight:800 }}>Eliminar movimiento</div></div>
              <Button variant="danger" onClick={handleDeleteTx}>Sí, eliminar</Button>
              <div style={{ height:8 }} /><Button type="button" variant="ghost" onClick={() => setDeletingTx(null)}>Cancelar</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN verification modal */}
      <PinModal {...pinModalProps} />
    </>
  );
}
