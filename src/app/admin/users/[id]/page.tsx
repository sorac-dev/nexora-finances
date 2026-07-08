"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/src/components/ui/icon";
import { toast } from "sonner";

interface UserDetail {
  id: string; name: string; email: string; role: string; emailVerified: boolean;
  isDisabled: boolean; hasPin: boolean; lockTimeout: number;
  createdAt: string; updatedAt: string;
  sessions: { id: string; ipAddress: string; createdAt: string; expiresAt: string }[];
  sessionCount: number;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setUser);
  }, [id]);

  async function handleAction(body: Record<string, unknown>, successMsg: string) {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        toast.success(successMsg);
        const updated = await r.json();
        setUser((prev) => prev ? { ...prev, ...updated } : prev);
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || "Error");
      }
    } catch { toast.error("Error"); }
    finally { setLoading(false); }
  }

  async function handleForceLogout() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (r.ok) {
        const d = await r.json();
        toast.success(`${d.sessionsDeleted} sesiones cerradas`);
        setUser((prev) => prev ? { ...prev, sessions: [], sessionCount: 0 } : prev);
      }
    } catch { toast.error("Error"); }
    finally { setLoading(false); }
  }

  if (!user) return <div style={{ padding: 40, textAlign: "center" }}><div className="spinner" style={{ width: 28, height: 28, margin: "0 auto" }} /></div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/admin/users")} className="top-nav-btn" style={{ width: 36, height: 36, borderRadius: 10 }}>
          <Icon name="ArrowLeft" size={18} />
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{user.name}</h1>
        <span style={{
          padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
          background: user.role === "ADMIN" ? "rgba(139,92,246,0.15)" : "rgba(10,132,255,0.1)",
          color: user.role === "ADMIN" ? "#BF5AF2" : "var(--c-blue)",
        }}>
          {user.role}
        </span>
        {user.isDisabled && (
          <span style={{
            padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: "rgba(255,107,107,0.15)", color: "#FF6B6B",
          }}>
            Bloqueado
          </span>
        )}
      </div>

      {/* Info cards — no financial data */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        <InfoCard label="Email" value={user.email} />
        <InfoCard label="Email verificado" value={user.emailVerified ? "Sí ✓" : "No ✗"}
          color={user.emailVerified ? "var(--c-save)" : "#FF6B6B"} />
        <InfoCard label="Registro" value={new Date(user.createdAt).toLocaleDateString("es-CO")} />
        <InfoCard label="PIN" value={user.hasPin ? "Configurado" : "No configurado"}
          color={user.hasPin ? "var(--c-save)" : "var(--text-dim)"} />
        <InfoCard label="Sesiones activas" value={String(user.sessionCount)} />
      </div>

      {/* Actions */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Acciones administrativas</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>

        {/* Email verification toggle */}
        <button onClick={() => handleAction(
          { emailVerified: !user.emailVerified },
          user.emailVerified ? "Email marcado como NO verificado" : "Email verificado manualmente"
        )} disabled={loading}
          style={btnStyle(user.emailVerified ? "#FF9F43" : "var(--c-save)")}>
          <Icon name={user.emailVerified ? "MailX" : "MailCheck"} size={14} />
          {user.emailVerified ? "Marcar email como NO verificado" : "Verificar email manualmente"}
        </button>

        {/* Role toggle */}
        <button onClick={() => handleAction(
          { role: user.role === "ADMIN" ? "USER" : "ADMIN" },
          user.role === "ADMIN" ? "Degradado a User" : "Ascendido a Admin"
        )} disabled={loading}
          style={btnStyle(user.role === "ADMIN" ? "#FF9F43" : "#BF5AF2")}>
          <Icon name={user.role === "ADMIN" ? "ArrowDown" : "ArrowUp"} size={14} />
          {user.role === "ADMIN" ? "Degradar a User" : "Ascender a Admin"}
        </button>

        {/* Block / Unblock */}
        <button onClick={() => handleAction(
          { toggleDisabled: true },
          user.isDisabled ? "Cuenta desbloqueada" : "Cuenta bloqueada"
        )} disabled={loading}
          style={btnStyle(user.isDisabled ? "var(--c-save)" : "#FF6B6B")}>
          <Icon name={user.isDisabled ? "Unlock" : "Lock"} size={14} />
          {user.isDisabled ? "Desbloquear cuenta" : "Bloquear cuenta"}
        </button>

        {/* Remove PIN */}
        {user.hasPin && (
          <button onClick={() => handleAction(
            { removePin: true },
            "PIN eliminado forzosamente"
          )} disabled={loading}
            style={btnStyle("#FF9F43")}>
            <Icon name="ShieldOff" size={14} />
            Quitar PIN forzosamente
          </button>
        )}

        {/* Force logout */}
        {user.sessionCount > 0 && (
          <button onClick={handleForceLogout} disabled={loading}
            style={btnStyle("#FF6B6B")}>
            <Icon name="LogOut" size={14} />
            Forzar cierre de todas las sesiones ({user.sessionCount})
          </button>
        )}
      </div>

      {/* Active sessions list */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Sesiones activas</h2>
      <div className="glass" style={{ borderRadius: 16, overflow: "hidden" }}>
        {user.sessions.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>Sin sesiones activas</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
              <th style={th}>IP</th><th style={th}>Inicio</th><th style={th}>Expira</th>
            </tr></thead>
            <tbody>
              {user.sessions.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={td}>{s.ipAddress || "N/A"}</td>
                  <td style={td}>{new Date(s.createdAt).toLocaleString("es-CO")}</td>
                  <td style={td}>{new Date(s.expiresAt).toLocaleString("es-CO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="glass" style={{ padding: 14, borderRadius: 14 }}>
      <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 14, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    background: "transparent", border: `1px solid ${color}44`, borderRadius: 12,
    padding: "12px 16px", color, cursor: "pointer", fontWeight: 600, fontSize: 13,
    display: "flex", alignItems: "center", gap: 8, width: "100%",
    textAlign: "left" as const,
  };
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 12px", color: "var(--text-dim)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "8px 12px", color: "var(--text)" };
