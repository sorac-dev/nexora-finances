"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopNav } from "@/src/components/layout/top-nav";
import { Button } from "@/src/components/ui/button";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { Icon } from "@/src/components/ui/icon";
import { fmt } from "@/src/utils/format";
import { toast } from "sonner";

interface Tx {
  id: string; type: string; name: string; cat: string; amount: number;
  date: string; dateRaw: string; icon: string; cardId?: string;
  cardName?: string; method?: string; installments?: number;
}

export default function MovementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const txId = params.id as string;
  const [tx, setTx] = useState<Tx | null>(null);
  const [card, setCard] = useState<{ name: string; brand: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      // Get the transaction
      const txsRes = await fetch(`/api/transactions?page=1&limit=100`);
      if (txsRes.ok) {
        const d = await txsRes.json();
        const found = d.data.find((t: Tx) => t.id === txId);
        if (found) {
          setTx(found);
          // If it has a card, load card info
          if (found.cardId) {
            try {
              const cardRes = await fetch(`/api/cards/${found.cardId}`);
              if (cardRes.ok) setCard(await cardRes.json());
            } catch {}
          }
        }
      }
    } catch { toast.error("Error al cargar"); }
    finally { setLoading(false); }
  }, [txId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <><TopNav title="Cargando..." backHref="/movements" /><CardSkeleton /></>;
  if (!tx) return <><TopNav title="No encontrado" backHref="/movements" /><div className="txt-dim" style={{ textAlign:"center", padding:40 }}>Movimiento no encontrado</div></>;

  return (
    <>
      <TopNav title="" backHref="/movements" />

      {/* Icon + Amount */}
      <div style={{ textAlign:"center", marginTop:20, marginBottom:24 }}>
        <div className="icon-circ" style={{ background:"var(--glass-strong)", width:72, height:72, borderRadius:22, margin:"0 auto 12px" }}>
          <Icon name={tx.icon || "Package"} size={36} color="var(--c-blue)" />
        </div>
        <div className="txt-strong" style={{ fontSize:20 }}>{tx.name}</div>
        <div className={tx.type === "income" ? "amount-pos" : "amount-neg"} style={{ fontSize:36, fontWeight:800, marginTop:4 }}>
          {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
        </div>
      </div>

      {/* Full details */}
      <div className="glass" style={{ padding:16, borderRadius:20, marginBottom:16 }}>
        <div className="row" style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Icon name="Calendar" size={16} color="var(--text-faint)" />
            <span className="txt-faint" style={{ fontSize:12 }}>Fecha y hora</span>
          </div>
          <span className="txt-strong" style={{ fontSize:13, textAlign:"right", maxWidth:"60%" }}>{tx.date}</span>
        </div>
        <div className="row" style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Icon name="Tag" size={16} color="var(--text-faint)" />
            <span className="txt-faint" style={{ fontSize:12 }}>Categoría</span>
          </div>
          <span className="txt-strong" style={{ fontSize:13 }}>{tx.cat}</span>
        </div>
        <div className="row" style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Icon name={tx.type === "income" ? "ArrowDownRight" : "ArrowUpRight"} size={16} color={tx.type === "income" ? "var(--c-save)" : "#FF6B6B"} />
            <span className="txt-faint" style={{ fontSize:12 }}>Tipo</span>
          </div>
          <span className="txt-strong" style={{ fontSize:13, color: tx.type === "income" ? "var(--c-save)" : "#FF6B6B" }}>
            {tx.type === "income" ? "Ingreso" : "Gasto"}
          </span>
        </div>

        {card && (
          <div className="row" style={{ marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Icon name="CreditCard" size={16} color="var(--text-faint)" />
              <span className="txt-faint" style={{ fontSize:12 }}>Tarjeta</span>
            </div>
            <span className="txt-strong" style={{ fontSize:13 }}>{card.name} · {card.brand} · {card.type === "credito" ? "Crédito" : "Débito"}</span>
          </div>
        )}

        {tx.installments && tx.installments > 1 && (
          <div className="row" style={{ marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Icon name="Layers" size={16} color="var(--text-faint)" />
              <span className="txt-faint" style={{ fontSize:12 }}>Cuotas</span>
            </div>
            <span className="txt-strong" style={{ fontSize:13 }}>{tx.installments} cuotas</span>
          </div>
        )}

        {tx.method && (
          <div className="row">
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Icon name="Banknote" size={16} color="var(--text-faint)" />
              <span className="txt-faint" style={{ fontSize:12 }}>Método</span>
            </div>
            <span className="txt-strong" style={{ fontSize:13 }}>{tx.method}</span>
          </div>
        )}
      </div>

      {/* ID */}
      <div className="txt-faint" style={{ textAlign:"center", fontSize:10, marginTop:16 }}>
        ID: {tx.id}
      </div>
    </>
  );
}
