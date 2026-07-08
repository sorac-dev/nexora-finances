"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Icon } from "@/src/components/ui/icon";
import { toast } from "sonner";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "info">(
    token ? "loading" : "info"
  );
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) return;

    // Verify the token via Better Auth API
    fetch(`/api/auth/verify-email?token=${token}`)
      .then(async (r) => {
        if (r.ok || r.redirected) {
          setStatus("success");
          toast.success("¡Email verificado! Redirigiendo...");
          setTimeout(() => router.push("/"), 1500);
        } else {
          const body = await r.text();
          setStatus("error");
          setErrorMsg(body || "El enlace es inválido o ya expiró.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Error de conexión al verificar.");
      });
  }, [token, router]);

  return (
    <div style={{
      width: "100%", minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 20,
      background: "radial-gradient(circle at 30% 20%, #1a1d2b, #050609 60%)",
    }}>
      <div className="glass-strong" style={{ width: "100%", maxWidth: 440, padding: 32, borderRadius: 28, textAlign: "center" }}>

        {/* Loading */}
        {status === "loading" && (
          <>
            <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto 12px" }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
              Verificando...
            </h1>
            <p className="txt-dim">Estamos verificando tu dirección de correo electrónico.</p>
          </>
        )}

        {/* Success */}
        {status === "success" && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
              background: "rgba(52,199,89,0.12)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="CheckCircle" size={36} color="var(--c-save)" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--c-save)", marginBottom: 8 }}>
              ¡Email verificado!
            </h1>
            <p className="txt-dim" style={{ marginBottom: 20, lineHeight: 1.5 }}>
              Tu cuenta ha sido verificada correctamente. Serás redirigido al inicio...
            </p>
          </>
        )}

        {/* Error */}
        {status === "error" && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
              background: "rgba(255,107,107,0.12)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="AlertCircle" size={36} color="#FF6B6B" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#FF6B6B", marginBottom: 8 }}>
              Error de verificación
            </h1>
            <p className="txt-dim" style={{ marginBottom: 20, lineHeight: 1.5 }}>
              {errorMsg || "El enlace de verificación no es válido o ha expirado."}
            </p>
            <Link href="/login">
              <Button>Volver al inicio de sesión</Button>
            </Link>
          </>
        )}

        {/* Info (no token — informational page after registration) */}
        {status === "info" && (
          <>
            <Icon name="Mail" size={48} color="var(--c-blue)" />
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: "12px 0 4px", color: "var(--text)" }}>
              Revisa tu email
            </h1>
            <p className="txt-dim" style={{ marginBottom: 20, lineHeight: 1.5 }}>
              Te enviamos un enlace de verificación. Haz clic en él para activar tu cuenta.
              Si no lo ves, revisa tu carpeta de spam.
            </p>
          </>
        )}
      </div>

      {/* Only show this button outside when NOT in error state (error has its own button inside) */}
      {status !== "error" && (
        <div style={{ marginTop: 16 }}>
          <Link href="/login">
            <Button variant="ghost">Volver al inicio de sesión</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050609" }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
