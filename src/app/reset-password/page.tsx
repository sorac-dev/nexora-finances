"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Icon } from "@/src/components/ui/icon";
import { resetPasswordSchema } from "@/src/schemas/auth.schema";
import { toast } from "sonner";
import Link from "next/link";

// ─── Inner component (needs useSearchParams inside Suspense) ─────────

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Better Auth redirects to /reset-password?token=TOKEN
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // If no token is present in the URL, show invalid link immediately
  const hasToken = Boolean(token);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // — Client-side validation (XSS-safe: zod strips, never eval'd) —
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Better Auth accepts token in body or query string
        body: JSON.stringify({ token, newPassword: parsed.data.password }),
      });

      if (res.ok) {
        setDone(true);
        toast.success("¡Contraseña restablecida! Ya puedes iniciar sesión.");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data?.message || "El enlace expiró o es inválido.";
        toast.error(msg);
      }
    } catch {
      toast.error("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // ── Token missing ────────────────────────────────────────────────
  if (!hasToken) {
    return (
      <div className="glass-strong" style={{ width: "100%", maxWidth: 420, padding: 32, borderRadius: 24, textAlign: "center" }}>
        <Icon name="AlertCircle" size={40} color="#FF6B6B" />
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "12px 0 6px", color: "var(--text)" }}>
          Enlace inválido
        </h1>
        <p className="txt-dim" style={{ marginBottom: 20 }}>
          Este enlace no contiene un token de recuperación válido. Solicita uno nuevo.
        </p>
        <Link href="/forgot-password">
          <Button>Solicitar nuevo enlace</Button>
        </Link>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────
  if (done) {
    return (
      <div className="glass-strong" style={{ width: "100%", maxWidth: 420, padding: 32, borderRadius: 24, textAlign: "center" }}>
        <Icon name="CheckCircle" size={40} color="var(--c-save)" />
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "12px 0 6px", color: "var(--text)" }}>
          ¡Contraseña actualizada!
        </h1>
        <p className="txt-dim" style={{ marginBottom: 20 }}>
          Redirigiendo al inicio de sesión...
        </p>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────
  return (
    <div className="glass-strong" style={{ width: "100%", maxWidth: 420, padding: 32, borderRadius: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: "0 auto 14px",
          background: "linear-gradient(135deg, rgba(10,132,255,0.12), rgba(139,92,246,0.1))",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid rgba(10,132,255,0.2)",
        }}>
          <Icon name="Lock" size={30} color="var(--c-blue)" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>
          Nueva contraseña
        </h1>
        <p className="txt-dim" style={{ fontSize: 13, margin: "6px 0 0" }}>
          Elige una contraseña segura para tu cuenta.
        </p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="new-password">
        <label className="field-label">Contraseña</label>
        <div style={{ position: "relative", marginBottom: errors.password ? 4 : 14 }}>
          <span style={{ position: "absolute", left: 14, top: 16, zIndex: 1 }}>
            <Icon name="Lock" size={16} color="var(--text-faint)" />
          </span>
          <input
            className="nexora-input"
            style={{ paddingLeft: 40 }}
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        {errors.password && (
          <p style={{ color: "#FF6B6B", fontSize: 12, margin: "0 0 10px" }}>{errors.password}</p>
        )}

        <label className="field-label">Confirmar contraseña</label>
        <div style={{ position: "relative", marginBottom: errors.confirmPassword ? 4 : 14 }}>
          <span style={{ position: "absolute", left: 14, top: 16, zIndex: 1 }}>
            <Icon name="Lock" size={16} color="var(--text-faint)" />
          </span>
          <input
            className="nexora-input"
            style={{ paddingLeft: 40 }}
            type="password"
            placeholder="Repite la contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        {errors.confirmPassword && (
          <p style={{ color: "#FF6B6B", fontSize: 12, margin: "0 0 10px" }}>{errors.confirmPassword}</p>
        )}

        <Button type="submit" disabled={loading} style={{ marginTop: 8, width: "100%" }}>
          {loading ? "Restableciendo..." : "Restablecer contraseña"}
        </Button>
      </form>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <Link href="/login" style={{ color: "var(--c-blue)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          ← Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}

// ─── Page wrapper with Suspense (required for useSearchParams) ───────

export default function ResetPasswordPage() {
  return (
    <div style={{
      width: "100%", minHeight: "100dvh", position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      background: "radial-gradient(ellipse at 10% 0%, #1a1d30, #050609 50%)",
    }}>
      <div className="blob blob1" />
      <div style={{ position: "relative", zIndex: 2, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Suspense fallback={null}>
          <ResetPasswordInner />
        </Suspense>
      </div>
    </div>
  );
}
