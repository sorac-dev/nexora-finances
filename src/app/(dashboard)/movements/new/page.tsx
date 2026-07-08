"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/src/components/layout/top-nav";
import { Button } from "@/src/components/ui/button";
import { CategorySelect } from "@/src/components/ui/category-select";
import { Icon } from "@/src/components/ui/icon";
import { toast } from "sonner";

interface Cat { id: string; name: string; icon: string; color: string; type: string; }
interface Card { id: string; name: string; type: string; brand: string; icon: string; color: string; }

const METHODS = [
  { id: "Efectivo", icon: "Banknote", label: "Efectivo" },
  { id: "Transferencia", icon: "ArrowLeftRight", label: "Transferencia" },
  { id: "Débito", icon: "Building2", label: "Débito" },
  { id: "Crédito", icon: "CreditCard", label: "Crédito" },
];

export default function NewMovementPage() {
  const router = useRouter();
  const [cats, setCats] = useState<Cat[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [type, setType] = useState<"Gasto" | "Ingreso">("Gasto");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [catId, setCatId] = useState("");
  const [catName, setCatName] = useState("");
  const [method, setMethod] = useState("Efectivo");
  const [cardId, setCardId] = useState("");
  const [installments, setInstallments] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [cRes, cardsRes] = await Promise.all([fetch("/api/categories"), fetch("/api/cards")]);
      if (cRes.ok) setCats(await cRes.json());
      if (cardsRes.ok) setCards(await cardsRes.json());
      setLoading(false);
    }
    load();
  }, []);

  const needsCard = method === "Débito" || method === "Crédito";
  const filteredCards = cards.filter((c) => {
    if (method === "Crédito") return c.type === "credito";
    if (method === "Débito") return c.type === "debito";
    return false;
  });

  function fmtInput(v: string) { const d = v.replace(/\D/g,""); return d ? parseInt(d,10).toLocaleString("es-CO") : ""; }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseInt(amount.replace(/\D/g, ""));
    if (!amt || amt <= 0) return toast.error("Ingresa un monto válido");
    if (!catId) return toast.error("Selecciona una categoría");
    if (needsCard && !cardId) return toast.error("Selecciona una tarjeta");

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: type === "Ingreso" ? "income" : "expense",
        amount: amt,
        description: desc || catName,
        cat: catName,
        date: new Date().toISOString(),
        method,
      };
      if (cardId) body.cardId = cardId;
      if (method === "Crédito") body.installments = parseInt(installments) || 1;

      const res = await fetch("/api/transactions", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Movimiento guardado");
        router.push("/movements");
        router.refresh();
      } else {
        toast.error("Error al guardar");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setSaving(false); }
  }

  return (
    <>
      <TopNav title="Nuevo movimiento" backHref="/movements" />

      {/* Type selector */}
      <div className="segmented" style={{ marginBottom: 18 }}>
        {["Gasto", "Ingreso"].map((t) => (
          <div key={t} className={`seg ${type === t ? "active" : ""}`} onClick={() => setType(t as typeof type)}>
            <Icon name={t === "Gasto" ? "ArrowUpRight" : "ArrowDownRight"} size={14} /> {t}
          </div>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {/* Amount */}
        <label className="field-label">Monto</label>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", fontSize: 22, fontWeight: 600 }}>$</span>
          <input className="nexora-input" style={{ paddingLeft: 42, fontSize: 26, fontWeight: 800, marginBottom: 0 }} placeholder="0" value={amount} onChange={(e) => setAmount(fmtInput(e.target.value))} inputMode="numeric" autoFocus />
        </div>

        {/* Description */}
        <label className="field-label">Descripción</label>
        <input className="nexora-input" placeholder="Ej. Almuerzo con amigos, Supermercado..." value={desc} onChange={(e) => setDesc(e.target.value)} />

        {/* Category */}
        <label className="field-label">Categoría</label>
        <CategorySelect
          categories={cats.filter((c) => c.type === (type === "Ingreso" ? "income" : "expense"))}
          value={catId}
          onChange={(id) => {
            const cat = cats.find((c) => c.id === id);
            setCatId(id);
            if (cat) setCatName(cat.name);
          }}
          placeholder="Elige categoría..."
        />

        {/* Payment method */}
        <label className="field-label">Método de pago</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {METHODS.map((m) => (
            <div
              key={m.id}
              onClick={() => { setMethod(m.id); setCardId(""); }}
              className="glass"
              style={{
                padding: "12px 14px", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                border: method === m.id ? "2px solid var(--c-blue)" : "1px solid var(--glass-border)",
                background: method === m.id ? "rgba(10,132,255,0.08)" : "var(--glass)",
              }}
            >
              <Icon name={m.icon} size={20} color={method === m.id ? "var(--c-blue)" : "var(--text-dim)"} />
              <span className="txt-strong" style={{ fontSize: 14, color: method === m.id ? "var(--c-blue)" : "var(--text)" }}>{m.label}</span>
            </div>
          ))}
        </div>

        {/* Card selector + installments */}
        {needsCard && (
          <>
            {method === "Crédito" && (
              <>
                <label className="field-label">Número de cuotas</label>
                <select className="nexora-select" value={installments} onChange={(e) => setInstallments(e.target.value)}>
                  {[1,2,3,6,9,12,18,24,36,48].map((n) => <option key={n} value={n}>{n} {n===1?"cuota":"cuotas"}</option>)}
                </select>
              </>
            )}
            <label className="field-label">Tarjeta</label>
            {filteredCards.length === 0 ? (
              <div className="glass" style={{ padding: 14, borderRadius: 14, marginBottom: 12, textAlign: "center" }}>
                <div className="txt-dim" style={{ fontSize: 13 }}>
                  No tienes tarjetas de {method.toLowerCase()}.{" "}
                  <span style={{ color: "var(--c-blue)", cursor: "pointer", fontWeight: 600 }} onClick={() => router.push("/cards")}>
                    Agregar tarjeta
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {filteredCards.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setCardId(c.id)}
                    className="glass"
                    style={{
                      padding: "12px 14px", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                      border: cardId === c.id ? "2px solid var(--c-blue)" : "1px solid var(--glass-border)",
                      background: cardId === c.id ? "rgba(10,132,255,0.06)" : "var(--glass)",
                    }}
                  >
                    <div className="icon-circ" style={{ background: `${c.color}22`, width: 36, height: 36, borderRadius: 10 }}>
                      <Icon name={c.icon || "CreditCard"} size={18} color={c.color} />
                    </div>
                    <div>
                      <span className="txt-strong" style={{ fontSize: 14 }}>{c.name}</span>
                      <span className="txt-dim" style={{ fontSize: 11, marginLeft: 6 }}>{c.brand} · {c.type === "credito" ? "Crédito" : "Débito"}</span>
                    </div>
                    {cardId === c.id && <span style={{ marginLeft: "auto" }}><Icon name="Check" size={18} color="var(--c-blue)" /></span>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : `Registrar ${type.toLowerCase()}`}
        </Button>
      </form>
    </>
  );
}
