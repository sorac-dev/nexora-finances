"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/src/components/ui/icon";
import { toast } from "sonner";

export function VerifyEmailGate({ children }: { children: React.ReactNode }) {
  const [showGate, setShowGate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const retryTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/verification-status");
      if (r.ok) {
        const d = await r.json();
        if (d.loggedIn && !d.verified) {
          setShowGate(true);
          setEmail(d.email || "");
        } else {
          setShowGate(false);
        }
        return d.verified;
      }
    } catch { /* ignore */ }
    return false;
  }, []);

  // Initial check
  useEffect(() => {
    checkStatus().finally(() => setLoading(false));
  }, [checkStatus]);

  // On mount: check if there's an active cooldown from a previous session
  useEffect(() => {
    if (!showGate) return;
    fetch("/api/auth/resend-verification")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.retryAfter) setRetryAfter(d.retryAfter);
      })
      .catch(() => {});
  }, [showGate]);

  // Poll every 10s while gate is shown
  useEffect(() => {
    if (!showGate) return;
    const interval = setInterval(async () => {
      const verified = await checkStatus();
      if (verified) {
        setShowGate(false);
        toast.success("Email verificado. Accediendo...");
        window.location.reload();
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [showGate, checkStatus]);

  // Retry countdown
  useEffect(() => {
    if (retryAfter <= 0) return;
    retryTimer.current = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) { if (retryTimer.current) clearInterval(retryTimer.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (retryTimer.current) clearInterval(retryTimer.current); };
  }, [retryAfter]);

  async function handleResend() {
    setResending(true);
    try {
      const r = await fetch("/api/auth/resend-verification", { method: "POST" });
      const d = await r.json();

      if (d.sent) {
        toast.success("Email reenviado. Revisa tu bandeja de entrada y spam.");
      } else if (d.verified) {
        setShowGate(false);
        toast.success("¡Ya estás verificado!");
        window.location.reload();
      } else if (d.retryAfter) {
        setRetryAfter(d.retryAfter);
        toast.error(d.error || "Espera para reenviar");
      } else {
        toast.error(d.error || "Error al reenviar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setResending(false);
    }
  }

  async function handleCheckNow() {
    const verified = await checkStatus();
    if (verified) {
      setShowGate(false);
      toast.success("¡Email verificado! Redirigiendo...");
      window.location.reload();
    } else {
      toast.info("Aún no se ha verificado. Revisa tu correo y spam.");
    }
  }

  if (loading) return <>{children}</>;

  // Don't render the app at all while the gate is active
  if (showGate) return (
    <AnimatePresence>
      <div style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "#050609",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
              style={{
                width: "100%", maxWidth: 400, padding: "32px 24px",
                textAlign: "center",
              }}
            >
              {/* Mail icon */}
              <div style={{
                width: 80, height: 80, borderRadius: 24, margin: "0 auto 24px",
                background: "rgba(10,132,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="Mail" size={40} color="var(--c-blue)" />
              </div>

              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                Verifica tu correo
              </h1>
              <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 8 }}>
                Enviamos un enlace de verificación a
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 20 }}>
                {email}
              </p>

              <p style={{ fontSize: 13, color: "var(--text-faint)", lineHeight: 1.5, marginBottom: 24 }}>
                Revisa tu bandeja de entrada y la carpeta de <strong style={{ color: "#FF9F43" }}>spam</strong>.
                Si no lo encuentras, puedes reenviarlo.
              </p>

              <button
                onClick={handleResend}
                disabled={resending || retryAfter > 0}
                style={{
                  width: "100%", padding: "14px", borderRadius: 14,
                  border: "none", cursor: retryAfter > 0 ? "not-allowed" : "pointer",
                  background: retryAfter > 0 ? "var(--glass)" : "var(--c-blue)",
                  color: "#fff", fontWeight: 700, fontSize: 15,
                  opacity: retryAfter > 0 ? 0.6 : 1, marginBottom: 12,
                }}>
                {resending ? "Enviando..." :
                  retryAfter > 0
                    ? (retryAfter >= 3600 ? `Reenviar en ${Math.floor(retryAfter / 3600)}h ${Math.floor((retryAfter % 3600) / 60)}m`
                       : retryAfter >= 60 ? `Reenviar en ${Math.floor(retryAfter / 60)}m ${retryAfter % 60}s`
                       : `Reenviar en ${retryAfter}s`)
                    : "Reenviar correo de verificacion"}
              </button>

              {/* Cooldown indicator */}
              {retryAfter > 0 && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 20,
                  background: "rgba(255,159,67,0.08)", border: "1px solid rgba(255,159,67,0.15)",
                  marginBottom: 12,
                }}>
                  <Icon name="Clock" size={14} color="#FF9F43" />
                  <span style={{ fontSize: 13, color: "#FF9F43" }}>
                    {retryAfter >= 3600 ? `${Math.floor(retryAfter / 3600)}h ${Math.floor((retryAfter % 3600) / 60)}m` :
                     retryAfter >= 60 ? `${Math.floor(retryAfter / 60)}m ${retryAfter % 60}s` :
                     `${retryAfter}s`}
                  </span>
                </div>
              )}

              <button
                onClick={handleCheckNow}
                style={{
                  width: "100%", padding: "12px", borderRadius: 14,
                  border: "1px solid var(--glass-border-strong)",
                  background: "var(--glass)", color: "var(--text)",
                  cursor: "pointer", fontWeight: 600, fontSize: 14,
                }}>
                Ya verifiqué mi correo
              </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  // Gate not active — render app normally
  return <>{children}</>;
}
