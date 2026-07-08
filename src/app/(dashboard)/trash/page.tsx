"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopNav } from "@/src/components/layout/top-nav";
import { EmptyState } from "@/src/components/ui/empty-state";
import { ListSkeleton } from "@/src/components/ui/skeleton";
import { Button } from "@/src/components/ui/button";
import { Icon } from "@/src/components/ui/icon";
import { PinModal } from "@/src/components/ui/pin-modal";
import { usePinGuard } from "@/src/hooks/use-pin-guard";
import { fmt } from "@/src/utils/format";
import { toast } from "sonner";

interface Tx {
  id: string; type: string; name: string; cat: string; amount: number;
  date: string; dateRaw: string; icon: string; daysLeft: number | null;
}

const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function getDateLabel(dateRaw: string) {
  const d = new Date(dateRaw);
  return `${d.getDate()} de ${MONTHS_SHORT[d.getMonth()]}. ${d.getFullYear()}`;
}

export default function TrashPage() {
  const [trash, setTrash] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);
  const { guardWithPin, pinModalProps } = usePinGuard();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions?trash=true&limit=100");
      if (res.ok) {
        const d = await res.json();
        setTrash(d.data);
      }
    } catch { toast.error("Error al cargar"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Restore ──────────────────────────────────────────────────────
  async function handleRestore(tx: Tx) {
    setRestoring(tx.id);
    try {
      const r = await fetch(`/api/transactions/${tx.id}`, { method: "PATCH" });
      if (r.ok) {
        setTrash((prev) => prev.filter((t) => t.id !== tx.id));
        toast.success("Movimiento restaurado");
      }
    } catch { toast.error("Error"); }
    finally { setRestoring(null); }
  }

  // ── Permanent delete ─────────────────────────────────────────────
  async function doDeletePermanent(id: string) {
    try {
      const r = await fetch(`/api/transactions/${id}?permanent=true`, { method: "DELETE" });
      if (r.ok) {
        setTrash((prev) => prev.filter((t) => t.id !== id));
        toast.success("Eliminado permanentemente");
      }
    } catch { toast.error("Error"); }
  }

  function handleDeletePermanent(tx: Tx) {
    guardWithPin(
      () => doDeletePermanent(tx.id),
      "Eliminar permanentemente",
      "Ingresa tu PIN para eliminar este movimiento para siempre"
    );
  }

  // ── Empty trash ──────────────────────────────────────────────────
  async function doEmptyTrash() {
    setEmptying(true);
    try {
      const r = await fetch("/api/transactions/trash", { method: "DELETE" });
      if (r.ok) {
        const d = await r.json();
        toast.success(`${d.deleted} movimientos eliminados`);
        setTrash([]);
      }
    } catch { toast.error("Error"); }
    finally { setEmptying(false); }
  }

  function handleEmptyTrash() {
    guardWithPin(
      () => doEmptyTrash(),
      "Vaciar papelera",
      "Ingresa tu PIN para eliminar TODOS los movimientos de la papelera"
    );
  }

  return (
    <>
      <TopNav title="Papelera" backHref="/more" />

      {/* Info & empty button */}
      {!loading && trash.length > 0 && (
        <div className="glass" style={{
          padding: "12px 16px", borderRadius: 16, marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="Trash2" size={18} color="#FF6B6B" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{trash.length} en papelera</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Se eliminan después de 30 días</div>
            </div>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={handleEmptyTrash}
            disabled={emptying}
            style={{ width: "auto", whiteSpace: "nowrap" }}
          >
            {emptying ? "Vaciando..." : "Vaciar todo"}
          </Button>
        </div>
      )}

      {/* List */}
      {loading ? <ListSkeleton rows={5} /> : trash.length === 0 ? (
        <EmptyState icon="Trash2" title="Papelera vacía" description="No hay movimientos eliminados." />
      ) : (
        <AnimatePresence mode="popLayout">
          {trash.map((t, i) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.2, delay: (i % 10) * 0.02 }}
              className="glass-card"
              style={{ padding: 10, marginBottom: 6, opacity: 0.75 }}
            >
              <div className="row">
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                  <div className="icon-circ" style={{ background: "var(--glass-strong)", width: 36, height: 36, borderRadius: 10 }}>
                    <Icon name={t.icon || "Package"} size={18} />
                  </div>
                  <div className="col">
                    <span className="txt-strong" style={{ fontSize: 13 }}>{t.name}</span>
                    <span className="txt-dim" style={{ fontSize: 11 }}>{t.cat} · {getDateLabel(t.dateRaw)}</span>
                  </div>
                </div>
                <span className={t.type === "income" ? "amount-pos" : "amount-neg"} style={{ fontSize: 13 }}>
                  {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                </span>
              </div>

              {/* Actions */}
              <div className="row" style={{ marginTop: 8, gap: 8 }}>
                {t.daysLeft != null && (
                  <span style={{ fontSize: 10, color: t.daysLeft <= 5 ? "#FF6B6B" : "var(--text-faint)", flex: 1 }}>
                    {t.daysLeft} día{t.daysLeft !== 1 ? "s" : ""} restante{t.daysLeft !== 1 ? "s" : ""}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRestore(t)}
                  disabled={restoring === t.id}
                  style={{ padding: "4px 10px", fontSize: 11, width: "auto" }}
                >
                  <Icon name="Undo2" size={12} /> Restaurar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeletePermanent(t)}
                  style={{ padding: "4px 10px", fontSize: 11, width: "auto", color: "#FF6B6B" }}
                >
                  <Icon name="Trash2" size={12} /> Eliminar
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* PIN verification modal */}
      <PinModal {...pinModalProps} />
    </>
  );
}
