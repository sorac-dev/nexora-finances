"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Icon } from "@/src/components/ui/icon";
import { loginSchema } from "@/src/schemas/auth.schema";
import { toast } from "sonner";
import { APP_NAME } from "@/src/lib/constants";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          dontRemember: !rememberMe, // false = session with maxAge (1 year extended below), true = session cookie
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[LOGIN] Failed — status:", res.status, "body:", data);
        toast.error(data.message || data.error || "Error al iniciar sesión");
        return;
      }

      // If "Mantener sesión abierta" is checked, extend session to 1 year
      if (rememberMe) {
        await fetch("/api/auth/extend-session", { method: "POST" }).catch(() => {});
      }

      // Redirect to home — use assign() for maximum reliability
      window.location.assign("/");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: "100%", minHeight: "100dvh", position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at 10% 0%, #1a1d30, #050609 50%)",
    }}>
      {/* Blobs */}
      <div className="blob blob1" />
      <div className="blob blob2" />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 420, padding: 24 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: "0 auto 16px",
            background: "linear-gradient(135deg, rgba(10,132,255,0.2), rgba(139,92,246,0.15))",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(10,132,255,0.25)",
          }}>
            <Icon name="Gem" size={36} color="var(--c-blue)" />
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, letterSpacing: -0.3,
            color: "var(--text)", margin: 0,
          }}>
            {APP_NAME}
          </h1>
          <p style={{
            color: "var(--text-dim)", fontSize: 14, margin: "6px 0 0",
            lineHeight: 1.5, maxWidth: 280, marginLeft: "auto", marginRight: "auto",
          }}>
            Controla tus finanzas con inteligencia
          </p>
        </div>

        {/* Form card */}
        <div
          className="glass-strong"
          style={{ padding: "28px 24px", borderRadius: 24 }}
        >
          <h2 style={{
            fontSize: 18, fontWeight: 700, margin: "0 0 20px",
            textAlign: "center", color: "var(--text)",
          }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit}>
            <label className="field-label">Email</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: 16, zIndex: 1 }}>
                <Icon name="Mail" size={16} color="var(--text-faint)" />
              </span>
              <input
                className="nexora-input"
                style={{ paddingLeft: 40 }}
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p style={{ color: "#FF6B6B", fontSize: 12, margin: "-8px 0 8px" }}>{errors.email}</p>
            )}

            <label className="field-label">Contraseña</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: 16, zIndex: 1 }}>
                <Icon name="Lock" size={16} color="var(--text-faint)" />
              </span>
              <input
                className="nexora-input"
                style={{ paddingLeft: 40 }}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {errors.password && (
              <p style={{ color: "#FF6B6B", fontSize: 12, margin: "-8px 0 8px" }}>{errors.password}</p>
            )}

            {/* Remember me */}
            <div
              onClick={() => setRememberMe(!rememberMe)}
              style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
                cursor: "pointer", userSelect: "none",
              }}
            >
              <div style={{
                minWidth: 20, width: 20, height: 20, borderRadius: 6,
                background: rememberMe ? "var(--c-blue)" : "transparent",
                border: rememberMe ? "none" : "2px solid var(--glass-border-strong)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}>
                {rememberMe && <Icon name="Check" size={12} color="#fff" />}
              </div>
              <span style={{ color: "var(--text-dim)", fontSize: 13 }}>
                Mantener sesión abierta
              </span>
            </div>

            <div style={{ textAlign: "right", marginBottom: 12 }}>
              <Link
                href="/forgot-password"
                style={{ color: "var(--c-blue)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>
        </div>

        {/* Register link */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ color: "var(--text-dim)", fontSize: 14 }}>
            ¿No tienes cuenta?{" "}
          </span>
          <Link
            href="/register"
            style={{
              color: "var(--c-blue)", fontSize: 14, fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
