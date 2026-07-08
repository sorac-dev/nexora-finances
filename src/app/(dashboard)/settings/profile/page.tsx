"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/src/components/layout/top-nav";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { PinModal } from "@/src/components/ui/pin-modal";
import { toast } from "sonner";
import { z } from "zod";

// ─── Validation (mirrors server schema) ─────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  email: z.string().email("Email inválido").max(255),
  currency: z.enum(["COP", "USD", "MXN", "EUR"]),
  country: z.enum(["Colombia", "México", "Chile", "España"]),
  language: z.enum(["es", "en"]),
});

// ─── Types ───────────────────────────────────────────────────────────

interface Profile {
  name: string;
  email: string;
  currency: string;
  country: string;
  language: string;
  theme: string;
}

const CURRENCIES = ["COP ($)", "USD ($)", "MXN ($)", "EUR (€)"];
const CURRENCY_CODES = ["COP", "USD", "MXN", "EUR"];
const COUNTRIES = ["Colombia", "México", "Chile", "España"];

// ─── Component ───────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("COP");
  const [country, setCountry] = useState("Colombia");
  const [language, setLanguage] = useState("es");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // PIN protection
  const [pinVerified, setPinVerified] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [checkingPinStatus, setCheckingPinStatus] = useState(true);

  // ── Load ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [profileRes, pinRes] = await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/user/security/pin"),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
          setName(data.name);
          setEmail(data.email);
          setCurrency(data.currency);
          setCountry(data.country);
          setLanguage(data.language || "es");
        } else if (profileRes.status === 401) {
          toast.error("No autorizado. Inicia sesión.");
        } else {
          toast.error("Error al cargar perfil");
        }

        if (pinRes.ok) {
          const pinData = await pinRes.json();
          setHasPin(pinData.hasPin);
          setPinVerified(!pinData.hasPin); // No PIN → already "verified"
        }
      } catch {
        toast.error("Error de conexión");
      } finally {
        setLoading(false);
        setCheckingPinStatus(false);
      }
    }
    load();
  }, []);

  // ── PIN verification ──────────────────────────────────────────
  async function handlePinVerify(pin: string): Promise<boolean> {
    try {
      const r = await fetch("/api/user/security/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (r.ok) {
        const { valid } = await r.json();
        if (valid) {
          setPinVerified(true);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // ── Track changes ─────────────────────────────────────────────
  function updateField<T>(setter: (v: T) => void, original: T, value: T) {
    setter(value);
    if (profile) {
      const changed =
        (name !== value && setter === setName) ||
        (email !== value && setter === setEmail) ||
        (currency !== value && setter === setCurrency) ||
        (country !== value && setter === setCountry) ||
        (language !== value && setter === setLanguage);
      // Re-check all fields
      const allChanged =
        name !== (setter === setName ? value : name) ||
        email !== (setter === setEmail ? value : email) ||
        currency !== (setter === setCurrency ? value : currency) ||
        country !== (setter === setCountry ? value : country) ||
        language !== (setter === setLanguage ? value : language);
      setHasChanges(allChanged);
    }
  }

  // ── Save ──────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const parsed = profileSchema.safeParse({ name, email, currency: "COP", country: "Colombia", language });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const field = i.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = i.message;
      });
      setErrors(fieldErrors);
      toast.error("Revisa los campos marcados");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res.status === 401) {
        toast.error("No autorizado");
        return;
      }

      if (res.status === 422) {
        const data = await res.json();
        const fieldErrors: Record<string, string> = {};
        data.errors?.forEach((e: { field: string; message: string }) => {
          fieldErrors[e.field] = e.message;
        });
        setErrors(fieldErrors);
        toast.error("Datos inválidos");
        return;
      }

      if (!res.ok) {
        toast.error("Error al guardar");
        return;
      }

      const data = await res.json();
      setProfile(data.user);
      setName(data.user.name);
      setEmail(data.user.email);
      setCurrency(data.user.currency);
      setCountry(data.user.country);
      setLanguage(data.user.language);
      setHasChanges(false);
      toast.success("Perfil actualizado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <TopNav title="Perfil" backHref="/settings" />

      {!pinVerified && !checkingPinStatus ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: "0 auto 20px",
            background: "rgba(10,132,255,0.12)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 36 }}>🔒</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Perfil protegido
          </div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5, maxWidth: 260, margin: "0 auto 0" }}>
            Ingresa tu PIN de seguridad en la ventana emergente para continuar.
          </div>
        </div>
      ) : loading ? (
        <div style={{ padding: "20px 0" }}>
          <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 20px" }}>
            <Skeleton width={90} height={90} className="rounded-[22px]" />
          </div>
          <Skeleton height={44} className="mb-3" />
          <Skeleton height={44} className="mb-3" />
          <Skeleton height={44} className="mb-3" />
        </div>
      ) : (
        <>
          {/* Avatar */}
          <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 20px" }}>
            <div
              className="avatar"
              style={{
                width: 90, height: 90, fontSize: 38,
                background: "linear-gradient(135deg,#0A84FF,#8B5CF6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff",
              }}
            >
              {profile?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          </div>

          <form onSubmit={handleSave}>
            {/* Name */}
            <label className="field-label">Nombre</label>
            <input
              className="nexora-input"
              value={name}
              onChange={(e) => { setName(e.target.value); updateField(setName, profile?.name || "", e.target.value); }}
              maxLength={100}
            />
            {errors.name && <p style={{ color: "#FF6B6B", fontSize: 12, margin: "-8px 0 8px" }}>{errors.name}</p>}

            {/* Email */}
            <label className="field-label">Correo</label>
            <input
              className="nexora-input"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); updateField(setEmail, profile?.email || "", e.target.value); }}
              autoComplete="email"
            />
            {errors.email && <p style={{ color: "#FF6B6B", fontSize: 12, margin: "-8px 0 8px" }}>{errors.email}</p>}

            {/* Currency — locked to COP for now */}
            <label className="field-label">Moneda</label>
            <div className="nexora-select" style={{ opacity: 0.7, cursor: "not-allowed", display: "flex", alignItems: "center" }}>
              🇨🇴 COP ($)
            </div>

            {/* Country — locked to Colombia for now */}
            <label className="field-label">País</label>
            <div className="nexora-select" style={{ opacity: 0.7, cursor: "not-allowed", display: "flex", alignItems: "center" }}>
              Colombia
            </div>

            {/* Language */}
            <label className="field-label">Idioma</label>
            <select
              className="nexora-select"
              value={language}
              onChange={(e) => { setLanguage(e.target.value); updateField(setLanguage, profile?.language || "", e.target.value); }}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>

            {/* Save */}
            <Button type="submit" disabled={saving || !hasChanges}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </>
      )}

      {/* PIN verification modal for profile access */}
      <PinModal
        open={hasPin && !pinVerified && !checkingPinStatus}
        onClose={() => {}}
        title="Verificación de seguridad"
        subtitle="Ingresa tu PIN para acceder a la configuración del perfil"
        onVerify={handlePinVerify}
      />
    </>
  );
}
