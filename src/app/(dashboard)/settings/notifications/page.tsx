"use client";

import { useState, useEffect } from "react";
import { TopNav } from "@/src/components/layout/top-nav";
import { ToggleSwitch } from "@/src/components/ui/toggle-switch";
import { Button } from "@/src/components/ui/button";
import { Icon } from "@/src/components/ui/icon";
import { usePushNotifications } from "@/src/hooks/use-push";
import { toast } from "sonner";

const DEFAULT_PREFS = {
  upcoming: true, cut: true, goals: true, unclassified: false,
  daysBefore3: true, daysBefore1: true, sameDay: true,
};

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Load prefs from server
  useEffect(() => {
    fetch("/api/user/notification-prefs")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setPrefs(d); })
      .finally(() => setPrefsLoaded(true));
  }, []);

  const update = async (key: keyof typeof prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await fetch("/api/user/notification-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  };

  const { permission, subscribed, loading, supported, subscribe, unsubscribe } = usePushNotifications();
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  async function handleTogglePush() {
    if (subscribed) {
      await unsubscribe();
      toast.success("Notificaciones push desactivadas");
    } else {
      // Check current permission state
      const perm = ("Notification" in window ? Notification.permission : "denied") as string;
      if (perm === "denied") {
        toast.error("Permiso bloqueado. Actívalo en: Ajustes del navegador > Notificaciones", {
          duration: 6000,
        });
        return;
      }
      const ok = await subscribe();
      if (ok) {
        toast.success("Notificaciones push activadas");
      } else if (Notification.permission === "denied") {
        toast.error("No aceptaste el permiso. Actívalo en: Ajustes del navegador > Notificaciones", {
          duration: 7000,
        });
      } else {
        toast.error("No se pudo activar. Verifica tu conexión e intenta de nuevo.");
      }
    }
  }

  async function handleCheckNow() {
    setCheckingAlerts(true);
    try {
      const r = await fetch("/api/notifications/check");
      if (r.ok) {
        const d = await r.json();
        if (d.sent > 0) toast.success(`${d.sent} notificaciones enviadas`);
        else if (d.alerts > 0) toast.info(`${d.alerts} alertas pendientes. Activa notificaciones push para recibirlas.`);
        else toast.success("Estás al día, sin alertas pendientes");
      }
    } catch { toast.error("Error al verificar"); }
    finally { setCheckingAlerts(false); }
  }

  async function handleTestPush() {
    if (!subscribed) {
      toast.error("Primero activa las notificaciones push");
      return;
    }
    setTestingPush(true);
    try {
      const r = await fetch("/api/notifications/test", { method: "POST" });
      if (r.ok) {
        const d = await r.json();
        if (d.sent > 0) {
          toast.success(`Notificación de prueba enviada. Revisa tu celular.`);
        } else if (d.error) {
          toast.error(d.error);
        } else {
          toast.error("No se pudo enviar. Revisa tu conexión.");
        }
      }
    } catch { toast.error("Error al enviar prueba"); }
    finally { setTestingPush(false); }
  }

  return (
    <>
      <TopNav title="Notificaciones" backHref="/settings" />

      {/* Push notification permission */}
      <div className="glass-strong" style={{ padding: 18, borderRadius: 20, marginBottom: 16 }}>
        <div className="row" style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="icon-circ" style={{ background: "var(--glass-strong)" }}>
              <Icon name="Bell" size={20} color={subscribed ? "var(--c-save)" : "var(--text-dim)"} />
            </div>
            <div>
              <span className="txt-strong" style={{ fontSize: 15 }}>Notificaciones push</span>
              <div className="txt-dim" style={{ fontSize: 11 }}>
                {!supported ? "No compatible con este navegador"
                  : subscribed ? "Activadas — recibirás alertas en tu celular"
                  : permission === "denied" ? "Bloqueadas — actívalas en configuración del navegador"
                  : "Recibe alertas aunque tengas la app cerrada"}
              </div>
            </div>
          </div>
        </div>
        {supported && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant={subscribed ? "danger" : "primary"} size="sm" onClick={handleTogglePush} disabled={loading}
              style={{ width: "auto" }}>
              <Icon name={subscribed ? "BellOff" : "Bell"} size={16} />
              {loading ? "..." : subscribed ? "Desactivar push" : "Activar notificaciones push"}
            </Button>
            {subscribed && (
              <Button variant="secondary" size="sm" onClick={handleTestPush} disabled={testingPush}
                style={{ width: "auto" }}>
                <Icon name="Send" size={14} />
                {testingPush ? "Enviando..." : "Probar notificación"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Check now button */}
      <div className="glass" style={{ padding: 14, borderRadius: 18, marginBottom: 16, textAlign: "center" }}>
        <div className="txt-dim" style={{ fontSize: 12, marginBottom: 8 }}>
          Verifica si tienes alertas pendientes ahora mismo
        </div>
        <Button size="sm" variant="secondary" onClick={handleCheckNow} disabled={checkingAlerts} style={{ width: "auto" }}>
          <Icon name="RefreshCw" size={14} /> {checkingAlerts ? "Verificando..." : "Verificar ahora"}
        </Button>
      </div>

      {/* Alert preferences */}
      <div className="eyebrow">Preferencias de alertas</div>
      <div className="glass-card">
        {[
          { key: "upcoming" as const, label: "Pagos próximos" },
          { key: "cut" as const, label: "Fechas de corte de tarjetas" },
          { key: "goals" as const, label: "Progreso de metas" },
          { key: "unclassified" as const, label: "Movimientos sin clasificar" },
        ].map((r, i) => (
          <div key={r.key} className="link-row" style={i === 3 ? { borderBottom: "none" } : undefined}>
            <span className="txt-strong">{r.label}</span>
            <ToggleSwitch checked={prefs[r.key]} onChange={() => update(r.key)} />
          </div>
        ))}
      </div>

      <div className="eyebrow" style={{ marginTop: 16 }}>¿Con cuánta anticipación?</div>
      <div className="glass-card">
        {[
          { key: "daysBefore3" as const, label: "3 días antes" },
          { key: "daysBefore1" as const, label: "1 día antes" },
          { key: "sameDay" as const, label: "El mismo día" },
        ].map((r, i) => (
          <div key={r.key} className="link-row" style={i === 2 ? { borderBottom: "none" } : undefined}>
            <span className="txt-strong">{r.label}</span>
            <ToggleSwitch checked={prefs[r.key]} onChange={() => update(r.key)} />
          </div>
        ))}
      </div>
    </>
  );
}
