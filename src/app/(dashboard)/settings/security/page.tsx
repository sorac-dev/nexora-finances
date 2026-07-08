"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/src/components/layout/top-nav";
import { Button } from "@/src/components/ui/button";
import { Icon } from "@/src/components/ui/icon";
import { PinModal } from "@/src/components/ui/pin-modal";
import { toast } from "sonner";

export default function SecurityPage() {
  const [hasPin, setHasPin] = useState(false);
  const [lockTimeout, setLockTimeout] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Modal states ──────────────────────────────────────────────────
  const [showSetPin, setShowSetPin] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showDisablePin, setShowDisablePin] = useState(false);

  // Form state for set/change
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPinForChange, setCurrentPinForChange] = useState("");
  const [changeVerified, setChangeVerified] = useState(false); // true after current PIN verified
  const [setting, setSetting] = useState(false);

  // ── Load PIN status ───────────────────────────────────────────────
  useEffect(() => {
    async function check() {
      try {
        const r = await fetch("/api/user/security/pin");
        if (r.ok) {
          const d = await r.json();
          setHasPin(d.hasPin);
          setLockTimeout(d.lockTimeout ?? 0);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    check();
  }, []);

  // ── Set new PIN (initial setup, no current PIN needed) ────────────
  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error("El PIN debe ser exactamente 4 dígitos");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("Los PIN no coinciden");
      return;
    }
    setSetting(true);
    try {
      const r = await fetch("/api/user/security/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: newPin }),
      });
      if (r.ok) {
        setHasPin(true);
        setShowSetPin(false);
        setNewPin("");
        setConfirmPin("");
        toast.success("PIN configurado correctamente");
      } else {
        const d = await r.json();
        toast.error(d.error || "Error al configurar PIN");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSetting(false);
    }
  }

  // ── Step 1: Verify current PIN before allowing change ─────────────
  async function handleVerifyCurrentPin(pin: string): Promise<boolean> {
    try {
      const r = await fetch("/api/user/security/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (r.ok) {
        const { valid } = await r.json();
        if (valid) {
          setCurrentPinForChange(pin); // store for the final API call
          setChangeVerified(true);
          setShowChangePin(false);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // ── Step 2: Save new PIN (after current PIN verified) ─────────────
  async function handleSaveNewPin(e: React.FormEvent) {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error("El nuevo PIN debe ser exactamente 4 dígitos");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("Los PIN no coinciden");
      return;
    }
    setSetting(true);
    try {
      const r = await fetch("/api/user/security/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: newPin, currentPin: currentPinForChange }),
      });
      if (r.ok) {
        setHasPin(true);
        setChangeVerified(false);
        setShowSetPin(false);
        setNewPin("");
        setConfirmPin("");
        setCurrentPinForChange("");
        toast.success("PIN actualizado correctamente");
      } else {
        const d = await r.json();
        toast.error(d.error || "Error al actualizar PIN");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSetting(false);
    }
  }

  // ── Open change flow: verify identity first ────────────────────────
  function startChangeFlow() {
    setChangeVerified(false);
    setNewPin("");
    setConfirmPin("");
    setCurrentPinForChange("");
    setShowSetPin(true);  // show the form area
    setShowChangePin(true); // immediately open PIN modal to verify current PIN
  }

  // ── Disable PIN (via modal) ───────────────────────────────────────
  async function handleDisablePin(pin: string): Promise<boolean> {
    try {
      const r = await fetch("/api/user/security/pin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (r.ok) {
        setHasPin(false);
        setShowDisablePin(false);
        toast.success("PIN desactivado");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <TopNav title="Seguridad" backHref="/settings" />

      {loading ? (
        <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
          <div className="spinner" style={{ width: 24, height: 24, margin: "0 auto" }} />
        </div>
      ) : (
        <>
          {/* PIN status card */}
          <div className="glass-card" style={{ textAlign: "center", padding: "28px 20px" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
              background: hasPin ? "rgba(52,199,89,0.12)" : "rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon
                name={hasPin ? "ShieldCheck" : "Shield"}
                size={32}
                color={hasPin ? "var(--c-save)" : "var(--text-faint)"}
              />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
              {hasPin ? "PIN configurado" : "Sin protección PIN"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5, maxWidth: 280, margin: "0 auto" }}>
              {hasPin
                ? "Tus acciones protegidas requieren el PIN de 4 dígitos."
                : "Configura el PIN para mayor seguridad."}
            </div>
          </div>

          {/* PIN actions */}
          <div style={{ marginTop: 14 }}>
            {!hasPin ? (
              // ── Set PIN form ──────────────────────────────────────
              !showSetPin ? (
                <Button onClick={() => setShowSetPin(true)}>
                  <Icon name="Lock" size={16} color="#fff" /> Configurar PIN
                </Button>
              ) : (
                <form onSubmit={handleSetPin} className="glass-card">
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>
                    Configurar nuevo PIN
                  </div>
                  <label className="field-label">PIN (4 dígitos)</label>
                  <input
                    className="nexora-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    autoFocus
                    style={{ fontSize: 24, textAlign: "center", letterSpacing: 8 }}
                  />
                  <label className="field-label">Confirmar PIN</label>
                  <input
                    className="nexora-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    style={{ fontSize: 24, textAlign: "center", letterSpacing: 8 }}
                  />
                  <Button type="submit" disabled={setting}>
                    {setting ? "Configurando..." : "Guardar PIN"}
                  </Button>
                  <div style={{ height: 8 }} />
                  <Button variant="ghost" type="button" onClick={() => { setShowSetPin(false); setNewPin(""); setConfirmPin(""); }}>
                    Cancelar
                  </Button>
                </form>
              )
            ) : (
              // ── Change / Disable PIN ──────────────────────────────
              !showSetPin ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Button variant="secondary" onClick={startChangeFlow}>
                    Cambiar PIN
                  </Button>
                  <Button variant="danger" onClick={() => setShowDisablePin(true)}>
                    Desactivar PIN
                  </Button>
                </div>
              ) : changeVerified ? (
                <form onSubmit={handleSaveNewPin} className="glass-card">
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>
                    Nuevo PIN
                  </div>
                  <div className="glass" style={{
                    padding: "8px 12px", borderRadius: 12, marginBottom: 14,
                    background: "rgba(52,199,89,0.06)", border: "1px solid rgba(52,199,89,0.2)",
                    fontSize: 12, color: "var(--c-save)", display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <Icon name="ShieldCheck" size={14} color="var(--c-save)" /> PIN actual verificado
                  </div>
                  <label className="field-label">Nuevo PIN (4 dígitos)</label>
                  <input
                    className="nexora-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    autoFocus
                    style={{ fontSize: 24, textAlign: "center", letterSpacing: 8 }}
                  />
                  <label className="field-label">Confirmar nuevo PIN</label>
                  <input
                    className="nexora-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    style={{ fontSize: 24, textAlign: "center", letterSpacing: 8 }}
                  />
                  <Button type="submit" disabled={setting}>
                    {setting ? "Guardando..." : "Guardar nuevo PIN"}
                  </Button>
                  <div style={{ height: 8 }} />
                  <Button variant="ghost" type="button" onClick={() => {
                    setShowSetPin(false); setChangeVerified(false);
                    setNewPin(""); setConfirmPin(""); setCurrentPinForChange("");
                  }}>
                    Cancelar
                  </Button>
                </form>
              ) : (
                <div className="glass-card" style={{ textAlign: "center", padding: "28px 20px" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                    Verifica tu identidad
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>
                    Ingresa tu PIN actual en la ventana emergente.
                  </div>
                  <Button variant="secondary" onClick={() => setShowChangePin(true)}>
                    Intentar de nuevo
                  </Button>
                  <div style={{ height: 8 }} />
                  <Button variant="ghost" onClick={() => {
                    setShowSetPin(false); setChangeVerified(false);
                    setShowChangePin(false);
                  }}>
                    Cancelar
                  </Button>
                </div>
              )
            )}
          </div>

          {/* Auto-lock — only visible when PIN is configured */}
          {hasPin && (
            <div style={{ marginTop: 24 }}>
              <div className="eyebrow">BLOQUEO AUTOMÁTICO</div>
              <div className="glass-card">
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14 }}>
                  Al cerrar la app, vuelve a pedir el PIN después de:
                </div>
                {[
                  { v: 0, label: "Enseguida" },
                  { v: 1, label: "1 minuto" },
                  { v: 5, label: "5 minutos" },
                  { v: 10, label: "10 minutos" },
                ].map((opt) => (
                  <div
                    key={opt.v}
                    className="link-row"
                    style={{ cursor: "pointer" }}
                    onClick={async () => {
                      setLockTimeout(opt.v);
                      await fetch("/api/user/security/pin", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ lockTimeout: opt.v }),
                      });
                    }}
                  >
                    <span className="txt-strong" style={{ fontSize: 14 }}>{opt.label}</span>
                    <Icon
                      name={lockTimeout === opt.v ? "CheckCircle" : "Circle"}
                      size={18}
                      color={lockTimeout === opt.v ? "var(--c-blue)" : "var(--text-faint)"}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Protected actions */}
          <div style={{ marginTop: 24 }}>
            <div className="eyebrow">ACCIONES PROTEGIDAS {hasPin ? "✓" : ""}</div>
            <div className="glass-card">
              {[
                { icon: "CreditCard", label: "Eliminar tarjeta de crédito/débito" },
                { icon: "Receipt", label: "Eliminar movimientos" },
                { icon: "Trash2", label: "Eliminar permanentemente de papelera" },
                { icon: "Trash2", label: "Vaciar papelera" },
                { icon: "DollarSign", label: "Eliminar ingreso" },
                { icon: "Target", label: "Eliminar meta de ahorro" },
                { icon: "ClipboardList", label: "Eliminar gasto fijo" },
                { icon: "User", label: "Acceder a perfil" },
              ].map((a) => (
                <div key={a.label} className="link-row" style={{ padding: "10px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon name={hasPin ? "ShieldCheck" : "Shield"} size={14} color={hasPin ? "var(--c-save)" : "var(--text-faint)"} />
                    <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon name={a.icon} size={14} color="var(--text-dim)" />
                      {a.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Verify current PIN modal (for change) ──────────────────── */}
      <PinModal
        open={showChangePin}
        onClose={() => setShowChangePin(false)}
        title="Verifica tu PIN actual"
        subtitle="Ingresa tu PIN actual para poder cambiarlo"
        onVerify={handleVerifyCurrentPin}
      />

      {/* ── Verify PIN modal (for disable) ─────────────────────────── */}
      <PinModal
        open={showDisablePin}
        onClose={() => setShowDisablePin(false)}
        title="Desactivar PIN"
        subtitle="Ingresa tu PIN actual para desactivar la protección"
        onVerify={handleDisablePin}
      />
    </>
  );
}
