"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Icon } from "@/src/components/ui/icon";
import { TurnstileWidget } from "@/src/components/ui/turnstile-widget";
import { loginSchema } from "@/src/schemas/auth.schema";
import { toast } from "sonner";
import { APP_NAME } from "@/src/lib/constants";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError("");
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (!turnstileToken) {
      setServerError("Completa la verificación de seguridad");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, turnstileToken, dontRemember: !rememberMe }),
      });
      if (!res.ok) {
        setServerError("Email o contraseña incorrectos. Intenta de nuevo.");
        setTurnstileToken("");
        return;
      }

      if (rememberMe) {
        await fetch("/api/auth/extend-session", { method: "POST" }).catch(() => {});
      }

      window.location.assign("/");
    } catch {
      setServerError("Error de conexión. Revisa tu internet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: "100%", maxWidth: "100vw", minHeight: "100dvh", position: "relative",
      overflowY: "auto", overflowX: "hidden",
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
                style={{ paddingLeft: 40, paddingRight: 42 }}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 14, top: 16, zIndex: 1, cursor: "pointer" }}>
                <Icon name={showPassword ? "EyeOff" : "Eye"} size={16} color="var(--text-faint)" />
              </span>
            </div>
            {errors.password && (
              <p style={{ color: "#FF6B6B", fontSize: 12, margin: "-8px 0 8px" }}>{errors.password}</p>
            )}

            {/* Server error — inline on card, not toast */}
            {serverError && (
              <div style={{
                padding: "10px 14px", borderRadius: 12, marginBottom: 14,
                background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)",
                color: "#FF6B6B", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Icon name="AlertCircle" size={16} color="#FF6B6B" />
                {serverError}
              </div>
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

            {/* Turnstile */}
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken("")}
            />

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
