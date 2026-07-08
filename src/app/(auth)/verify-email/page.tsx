"use client";

import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Icon } from "@/src/components/ui/icon";

export default function VerifyEmailPage() {
  return (
    <div style={{
      width: "100%", minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 20,
      background: "radial-gradient(circle at 30% 20%, #1a1d2b, #050609 60%)",
    }}>
      <div className="glass-strong" style={{ width: "100%", maxWidth: 440, padding: 32, borderRadius: 28, textAlign: "center" }}>
        <Icon name="Mail" size={48} color="var(--c-blue)" />
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "12px 0 4px", color: "var(--text)" }}>
          Revisa tu email
        </h1>
        <p className="txt-dim" style={{ marginBottom: 20, lineHeight: 1.5 }}>
          Te enviamos un enlace de verificación. Haz clic en él para activar tu cuenta.
          Si no lo ves, revisa tu carpeta de spam.
        </p>
        <Link href="/login">
          <Button variant="secondary">Ir al inicio de sesión</Button>
        </Link>
      </div>
    </div>
  );
}
