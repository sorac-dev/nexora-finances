"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TopNav } from "@/src/components/layout/top-nav";
import { EmptyState } from "@/src/components/ui/empty-state";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { Icon } from "@/src/components/ui/icon";
import { toast } from "sonner";

interface Alert {
  icon: string; text: string; sub: string; tone: "urgent" | "warn" | "info";
}

const TONE_COLORS: Record<string, string> = { urgent: "#FF6B6B", warn: "#FF9F43", info: "#5AC8FA" };

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/alerts");
      if (r.ok) setAlerts(await r.json());
    } catch { toast.error("Error al cargar alertas"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <TopNav title="Centro de alertas" backHref="/more" />

      {loading ? <CardSkeleton /> : alerts.length === 0 ? (
        <EmptyState icon="CheckCircle" title="Estás al día" description="No tienes alertas pendientes. ¡Buen trabajo!" />
      ) : (
        alerts.map((a, i) => (
          <Link
            key={i}
            href={a.icon === "CreditCard" || a.icon === "Banknote" ? "/cards" : a.icon === "Target" ? "/goals" : "/gastos-fijos"}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="glass-card" style={{ borderLeft: `4px solid ${TONE_COLORS[a.tone]}`, cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="icon-circ" style={{ background: `${TONE_COLORS[a.tone]}18`, width: 40, height: 40, borderRadius: 12 }}>
                  <Icon name={a.icon} size={20} color={TONE_COLORS[a.tone]} />
                </div>
                <div className="col" style={{ flex: 1 }}>
                  <div className="txt-strong" style={{ fontSize: 14 }}>{a.text}</div>
                  <div className="txt-dim" style={{ marginTop: 3, fontSize: 12 }}>{a.sub}</div>
                </div>
                <Icon name="ChevronRight" size={14} color="var(--text-faint)" />
              </div>
            </div>
          </Link>
        ))
      )}
    </>
  );
}
