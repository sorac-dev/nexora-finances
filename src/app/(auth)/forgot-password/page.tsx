"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Icon } from "@/src/components/ui/icon";
import { forgotPasswordSchema } from "@/src/schemas/auth.schema";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) { toast.error("Ingresa un email válido"); return; }
    setLoading(true);
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: `${appUrl}/reset-password`,
        }),
      });
      setSent(true);
      toast.success("Si el email está registrado, recibirás un enlace de recuperación.");
    } catch { toast.error("Error de conexión"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      width: "100%", minHeight: "100dvh", position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at 10% 0%, #1a1d30, #050609 50%)",
    }}>
      <div className="blob blob1" />
      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 420, padding: 24 }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: "0 auto 14px",
            background: "linear-gradient(135deg, rgba(255,159,67,0.12), rgba(10,132,255,0.1))",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(255,159,67,0.2)",
          }}>
            <Icon name="Key" size={30} color="#FF9F43" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>
            Recuperar contraseña
          </h1>
        </div>

        {sent ? (
          <div className="glass-strong" style={{ padding: "32px 24px", borderRadius: 24, textAlign: "center" }}>
            <Icon name="Mail" size={40} color="var(--c-save)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "12px 0 6px", color: "var(--text)" }}>Email enviado</h2>
            <p className="txt-dim" style={{ fontSize: 14, marginBottom: 20 }}>Revisa tu bandeja de entrada.</p>
            <Link href="/login"><Button variant="ghost">Volver al inicio de sesión</Button></Link>
          </div>
        ) : (
          <div className="glass-strong" style={{ padding: "28px 24px", borderRadius: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", textAlign: "center", color: "var(--text)" }}>
              ¿Olvidaste tu contraseña?
            </h2>
            <p className="txt-dim" style={{ fontSize: 13, textAlign: "center", marginBottom: 20 }}>
              Te enviaremos un enlace para restablecerla.
            </p>
            <form onSubmit={handleSubmit}>
              <label className="field-label">Email</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: 16, zIndex: 1 }}>
                  <Icon name="Mail" size={16} color="var(--text-faint)" />
                </span>
                <input className="nexora-input" style={{ paddingLeft: 40 }} type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar instrucciones"}</Button>
            </form>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <Link href="/login" style={{ color: "var(--c-blue)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
