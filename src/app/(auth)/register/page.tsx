"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Icon } from "@/src/components/ui/icon";
import { TurnstileWidget } from "@/src/components/ui/turnstile-widget";
import { registerSchema } from "@/src/schemas/auth.schema";
import { toast } from "sonner";
import { APP_NAME } from "@/src/lib/constants";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [serverError, setServerError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError("");
    const parsed = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (!acceptedTerms) { setServerError("Debes aceptar los términos y condiciones"); return; }
    if (!turnstileToken) { setServerError("Completa la verificación de seguridad"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-up/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, turnstileToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setServerError(data.message || "Error al registrarse. Verifica tus datos.");
        return;
      }
      toast.success("¡Cuenta creada! Revisa tu email para verificarla.");
      router.push("/verify-email");
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
      paddingTop: 40, paddingBottom: 40,
      background: "radial-gradient(ellipse at 10% 0%, #1a1d30, #050609 50%)",
    }}>
      <div className="blob blob1" />
      <div className="blob blob2" />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 420, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, margin: "0 auto 10px",
            background: "linear-gradient(135deg, rgba(52,199,89,0.15), rgba(10,132,255,0.12))",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(52,199,89,0.2)",
          }}>
            <Icon name="UserPlus" size={36} color="var(--c-save)" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.3, color: "var(--text)", margin: 0 }}>
            {APP_NAME}
          </h1>
          <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "6px 0 0" }}>
            Comienza tu viaje financiero
          </p>
        </div>

        <div className="glass-strong" style={{ padding: "28px 24px", borderRadius: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px", textAlign: "center", color: "var(--text)" }}>
            Crear cuenta
          </h2>

          <form onSubmit={handleSubmit}>
            <label className="field-label">Nombre</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: 16, zIndex: 1 }}>
                <Icon name="User" size={16} color="var(--text-faint)" />
              </span>
              <input className="nexora-input" style={{ paddingLeft: 40 }} placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {errors.name && <p style={{ color: "#FF6B6B", fontSize: 12, margin: "-8px 0 8px" }}>{errors.name}</p>}

            <label className="field-label">Email</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: 16, zIndex: 1 }}>
                <Icon name="Mail" size={16} color="var(--text-faint)" />
              </span>
              <input className="nexora-input" style={{ paddingLeft: 40 }} type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            {errors.email && <p style={{ color: "#FF6B6B", fontSize: 12, margin: "-8px 0 8px" }}>{errors.email}</p>}

            <label className="field-label">Contraseña</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: 16, zIndex: 1 }}>
                <Icon name="Lock" size={16} color="var(--text-faint)" />
              </span>
              <input
                className="nexora-input"
                style={{ paddingLeft: 40, paddingRight: 42 }}
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <span onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: 16, zIndex: 1, cursor: "pointer" }}>
                <Icon name={showPassword ? "EyeOff" : "Eye"} size={16} color="var(--text-faint)" />
              </span>
            </div>
            <p style={{ color: "var(--text-faint)", fontSize: 11, margin: "-4px 0 10px 4px" }}>
              Mínimo 8 caracteres, 1 mayúscula y 1 número
            </p>
            {errors.password && <p style={{ color: "#FF6B6B", fontSize: 12, margin: "-8px 0 8px" }}>{errors.password}</p>}

            <label className="field-label">Confirmar contraseña</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: 16, zIndex: 1 }}>
                <Icon name="Lock" size={16} color="var(--text-faint)" />
              </span>
              <input
                className="nexora-input"
                style={{ paddingLeft: 40, paddingRight: 42 }}
                type={showConfirm ? "text" : "password"}
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <span onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 14, top: 16, zIndex: 1, cursor: "pointer" }}>
                <Icon name={showConfirm ? "EyeOff" : "Eye"} size={16} color="var(--text-faint)" />
              </span>
            </div>
            {errors.confirmPassword && <p style={{ color: "#FF6B6B", fontSize: 12, margin: "-8px 0 8px" }}>{errors.confirmPassword}</p>}

            {/* Server error — inline on card */}
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

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "14px 0" }}>
              <div onClick={() => setAcceptedTerms(!acceptedTerms)} style={{
                minWidth: 20, width: 20, height: 20, borderRadius: 6, cursor: "pointer",
                border: acceptedTerms ? "none" : "2px solid var(--glass-border-strong)",
                background: acceptedTerms ? "var(--c-blue)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginTop: 2, transition: "all 0.15s",
              }}>
                {acceptedTerms && <Icon name="Check" size={14} color="#fff" />}
              </div>
              <span style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
                Acepto los{" "}
                <a href="/terms" style={{ color: "var(--c-blue)", textDecoration: "none", fontWeight: 600 }}>Términos y Condiciones</a>,{" "}
                <a href="/privacy" style={{ color: "var(--c-blue)", textDecoration: "none", fontWeight: 600 }}>Política de Privacidad</a>{" "}
                y{" "}
                <a href="/cookies" style={{ color: "var(--c-blue)", textDecoration: "none", fontWeight: 600 }}>Política de Cookies</a>.
              </span>
            </div>

            {/* Turnstile */}
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken("")}
            />

            <Button type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ color: "var(--text-dim)", fontSize: 14 }}>¿Ya tienes cuenta? </span>
          <Link href="/login" style={{ color: "var(--c-blue)", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
