"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/src/components/ui/icon";

interface DashboardData {
  users: { total: number; today: number; week: number; active: number };
  transactions: number;
  goals: number;
  cards: number;
  security: { pinUsers: number; pinRate: number };
  pushSentToday: number;
  recentUsers: { id: string; name: string; email: string; role: string; emailVerified: boolean; createdAt: string }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.ok ? r.json() : null)
      .then(setData);
  }, []);

  if (!data) return <div style={{ padding: 40, textAlign: "center" }}><div className="spinner" style={{ width: 28, height: 28, margin: "0 auto" }} /></div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 24 }}>Dashboard</h1>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KPI icon="Users" label="Usuarios totales" value={data.users.total} color="var(--c-blue)" />
        <KPI icon="UserPlus" label="Nuevos hoy" value={data.users.today} color="var(--c-save)" />
        <KPI icon="UserCheck" label="Activos hoy" value={data.users.active} color="#BF5AF2" />
        <KPI icon="Receipt" label="Transacciones" value={data.transactions} color="#FF9F43" />
        <KPI icon="Target" label="Metas" value={data.goals} color="#34C759" />
        <KPI icon="CreditCard" label="Tarjetas" value={data.cards} color="#8B5CF6" />
        <KPI icon="Shield" label="Con PIN" value={`${data.security.pinRate}%`} color="var(--c-income)" />
        <KPI icon="Bell" label="Push enviados hoy" value={data.pushSentToday} color="#5AC8FA" />
      </div>

      {/* Recent users */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Últimos usuarios</h2>
      </div>
      <div className="glass" style={{ borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
              <th style={th}>Nombre</th>
              <th style={th} className="hide-mobile">Email</th>
              <th style={th}>Rol</th>
              <th style={th} className="hide-mobile">Registro</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {data.recentUsers.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }} className="show-mobile">{u.email}</div>
                </td>
                <td style={td} className="hide-mobile">{u.email}</td>
                <td style={td}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: u.role === "ADMIN" ? "rgba(139,92,246,0.15)" : "rgba(10,132,255,0.1)",
                    color: u.role === "ADMIN" ? "#BF5AF2" : "var(--c-blue)",
                  }}>
                    {u.role}
                  </span>
                </td>
                <td style={td} className="hide-mobile">
                  {new Date(u.createdAt).toLocaleDateString("es-CO")}
                </td>
                <td style={td}>
                  <Link href={`/admin/users/${u.id}`} style={{ color: "var(--c-blue)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        @media (max-width: 767px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
        .show-mobile { display: none; }
      `}</style>
    </div>
  );
}

function KPI({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="glass" style={{ padding: 16, borderRadius: 14 }}>
      <Icon name={icon} size={20} color={color} />
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", color: "var(--text-dim)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "10px 14px", color: "var(--text)" };
