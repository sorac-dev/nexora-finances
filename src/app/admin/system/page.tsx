"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/src/components/ui/icon";
import { toast } from "sonner";

interface SystemData {
  smtp: { configured: boolean; host: string };
  vapid: { configured: boolean; subject: string };
  pushSubscriptions: number;
  rateLimits: { key: string; count: number; expiresAt: string }[];
  database: { users: number; transactions: number; sessions: number; auditLogs: number };
  app: { env: string; demoMode: boolean; version: string };
}

interface AppSettings { [key: string]: string }

const CONTACT_FIELDS = [
  { key: "support_email", label: "Email soporte", type: "email" },
  { key: "legal_email", label: "Email legal", type: "email" },
  { key: "privacy_email", label: "Email privacidad", type: "email" },
  { key: "legal_address", label: "Dirección legal", type: "text" },
  { key: "legal_country", label: "País", type: "text" },
  { key: "app_domain", label: "Dominio", type: "text" },
];

export default function AdminSystemPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [settings, setSettings] = useState<AppSettings>({});
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFav, setUploadingFav] = useState(false);

  async function handleUpload(file: File, type: "logo" | "favicon") {
    if (type === "logo") setUploadingLogo(true); else setUploadingFav(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      const r = await fetch("/api/admin/upload", { method: "POST", body: form });
      if (r.ok) {
        const d = await r.json();
        const key = type === "logo" ? "app_logo_url" : "app_favicon_url";
        setSettings((s) => ({ ...s, [key]: d.url }));
        toast.success(`${type === "logo" ? "Logo" : "Favicon"} subido`);
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || "Error al subir");
      }
    } catch { toast.error("Error al subir"); }
    finally { if (type === "logo") setUploadingLogo(false); else setUploadingFav(false); }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/system").then((r) => r.ok ? r.json() : null),
      fetch("/api/admin/settings").then((r) => r.ok ? r.json() : null),
    ]).then(([sys, sett]) => {
      setData(sys);
      if (sett) setSettings(sett);
    });
  }, []);

  async function saveSettings() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (r.ok) toast.success("Configuración guardada");
      else toast.error("Error al guardar");
    } catch { toast.error("Error"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 24 }}>Sistema</h1>

      {/* App Settings */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 16 }}>⚙️ Configuración de la app</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 28 }}>

        {/* Brand */}
        <div className="glass" style={{ padding: 20, borderRadius: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Marca</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="field-label" style={{ fontSize: 12 }}>Nombre de la app</label>
              <input className="nexora-input" value={settings.app_name || ""} onChange={(e) => setSettings((s) => ({ ...s, app_name: e.target.value }))} />
            </div>

            {/* Logo upload */}
            <div>
              <label className="field-label" style={{ fontSize: 12 }}>Logo</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {settings.app_logo_url ? (
                  <img src={settings.app_logo_url.split("?")[0]} alt="Logo" style={{ width: 48, height: 48, borderRadius: 12, objectFit: "contain", background: "var(--glass)" }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--glass)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="Image" size={20} color="var(--text-faint)" />
                  </div>
                )}
                <label style={{
                  background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 10,
                  padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  color: "var(--text)", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Icon name="Upload" size={14} />
                  {uploadingLogo ? "Subiendo..." : settings.app_logo_url ? "Cambiar logo" : "Subir logo"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "logo"); }} />
                </label>
                {settings.app_logo_url && (
                  <button onClick={() => setSettings((s) => ({ ...s, app_logo_url: "" }))}
                    style={{ background: "none", border: "none", color: "#FF6B6B", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    Quitar
                  </button>
                )}
              </div>
              {settings.app_logo_url && (
                <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4, fontFamily: "monospace" }}>
                  {settings.app_logo_url}
                </div>
              )}
            </div>

            {/* Favicon upload */}
            <div>
              <label className="field-label" style={{ fontSize: 12 }}>Favicon</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {settings.app_favicon_url ? (
                  <img src={settings.app_favicon_url.split("?")[0]} alt="Favicon" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain", background: "var(--glass)" }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: "var(--glass)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="Globe" size={14} color="var(--text-faint)" />
                  </div>
                )}
                <label style={{
                  background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 10,
                  padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  color: "var(--text)", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Icon name="Upload" size={14} />
                  {uploadingFav ? "Subiendo..." : settings.app_favicon_url ? "Cambiar favicon" : "Subir favicon"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "favicon"); }} />
                </label>
                {settings.app_favicon_url && (
                  <button onClick={() => setSettings((s) => ({ ...s, app_favicon_url: "" }))}
                    style={{ background: "none", border: "none", color: "#FF6B6B", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    Quitar
                  </button>
                )}
              </div>
              {settings.app_favicon_url && (
                <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4, fontFamily: "monospace" }}>
                  {settings.app_favicon_url}
                </div>
              )}
            </div>

            {/* Colors */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="field-label" style={{ fontSize: 12 }}>Color primario</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="color" value={settings.primary_color || "#0A84FF"}
                    onChange={(e) => setSettings((s) => ({ ...s, primary_color: e.target.value }))}
                    style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", background: "transparent" }} />
                  <input className="nexora-input" value={settings.primary_color || ""}
                    onChange={(e) => setSettings((s) => ({ ...s, primary_color: e.target.value }))}
                    style={{ marginBottom: 0, fontFamily: "monospace", fontSize: 12 }} />
                </div>
              </div>
              <div>
                <label className="field-label" style={{ fontSize: 12 }}>Color acento</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="color" value={settings.accent_color || "#BF5AF2"}
                    onChange={(e) => setSettings((s) => ({ ...s, accent_color: e.target.value }))}
                    style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", background: "transparent" }} />
                  <input className="nexora-input" value={settings.accent_color || ""}
                    onChange={(e) => setSettings((s) => ({ ...s, accent_color: e.target.value }))}
                    style={{ marginBottom: 0, fontFamily: "monospace", fontSize: 12 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="glass" style={{ padding: 20, borderRadius: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Contacto</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {CONTACT_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="field-label" style={{ fontSize: 12 }}>{f.label}</label>
                <input className="nexora-input" type={f.type}
                  value={settings[f.key] || ""}
                  onChange={(e) => setSettings((s) => ({ ...s, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        style={{
          background: "var(--c-blue)", border: "none", borderRadius: 12, padding: "12px 28px",
          color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14, width: "100%",
          marginBottom: 40,
        }}
      >
        {saving ? "Guardando..." : "Guardar configuración"}
      </button>

      {/* System Status */}
      {!data ? (
        <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" style={{ width: 28, height: 28, margin: "0 auto" }} /></div>
      ) : (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 16 }}>📊 Estado del sistema</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginBottom: 28 }}>
            <StatusCard label="SMTP" ok={data.smtp.configured} detail={data.smtp.host} />
            <StatusCard label="VAPID (Push)" ok={data.vapid.configured} detail={`${data.pushSubscriptions} suscripciones`} />
            <div className="glass" style={{ padding: 16, borderRadius: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Aplicación</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                v{data.app.version} · {data.app.env} · Demo: {data.app.demoMode ? "ON" : "OFF"}
              </div>
            </div>
            <div className="glass" style={{ padding: 16, borderRadius: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Base de datos</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: 3 }}>
                <span>👥 {data.database.users.toLocaleString()} usuarios</span>
                <span>💳 {data.database.transactions.toLocaleString()} transacciones</span>
                <span>🔑 {data.database.sessions.toLocaleString()} sesiones</span>
                <span>📋 {data.database.auditLogs.toLocaleString()} registros de auditoría</span>
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Rate limits activos</h2>
          <div className="glass" style={{ borderRadius: 16, overflow: "hidden" }}>
            {data.rateLimits.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>Sin rate limits activos</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <th style={th}>Key</th><th style={th}>Intentos</th><th style={th}>Expira</th>
                </tr></thead>
                <tbody>
                  {data.rateLimits.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <td style={td}>{r.key}</td>
                      <td style={td}><span style={{ fontWeight: 700, color: r.count >= 5 ? "#FF6B6B" : "var(--text)" }}>{r.count}</span></td>
                      <td style={td}>{new Date(r.expiresAt).toLocaleString("es-CO")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="glass" style={{ padding: 16, borderRadius: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: ok ? "var(--c-save)" : "#FF6B6B" }} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
        <span style={{ fontSize: 12, color: ok ? "var(--c-save)" : "#FF6B6B" }}>{ok ? "OK" : "No configurado"}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{detail}</div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 12px", color: "var(--text-dim)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "8px 12px", color: "var(--text)" };
