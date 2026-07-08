"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/src/components/ui/icon";

interface SafeUser {
  id: string; name: string; email: string; role: string;
  emailVerified: boolean; createdAt: string; hasPin: boolean;
  stats: { sessions: number; transactions: number; goals: number; creditCards: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("q", search);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => { setUsers(d.users); setTotal(d.total); setPages(d.pages); })
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 20 }}>
        Usuarios <span style={{ color: "var(--text-dim)", fontSize: 16, fontWeight: 500 }}>({total})</span>
      </h1>

      {/* Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          className="nexora-input"
          placeholder="Buscar por nombre o email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setSearch(q), setPage(1))}
          style={{ marginBottom: 0, maxWidth: 360 }}
        />
        <button onClick={() => { setSearch(q); setPage(1); }}
          style={{ background: "var(--c-blue)", border: "none", borderRadius: 12, padding: "8px 16px", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          Buscar
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" style={{ width: 24, height: 24, margin: "0 auto" }} /></div>
      ) : (
        <>
          {/* Desktop table / Mobile cards */}
          <div className="hide-mobile">
            <div className="glass" style={{ borderRadius: 16, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <th style={th}>Nombre</th>
                    <th style={th}>Email</th>
                    <th style={th}>Rol</th>
                    <th style={th}>PIN</th>
                    <th style={th}>Registro</th>
                    <th style={th}>Stats</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <td style={td}><span style={{ fontWeight: 600 }}>{u.name}</span></td>
                      <td style={td}>{u.email}</td>
                      <td style={td}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: u.role === "ADMIN" ? "rgba(139,92,246,0.15)" : "rgba(10,132,255,0.1)",
                          color: u.role === "ADMIN" ? "#BF5AF2" : "var(--c-blue)" }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={td}>{u.hasPin ? "✅" : "—"}</td>
                      <td style={td}>{new Date(u.createdAt).toLocaleDateString("es-CO")}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                          {u.stats.transactions} tx · {u.stats.goals} metas · {u.stats.creditCards} cards
                        </span>
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
          </div>

          {/* Mobile cards */}
          <div className="show-mobile" style={{ display: "none", flexDirection: "column", gap: 8 }}>
            {users.map((u) => (
              <Link key={u.id} href={`/admin/users/${u.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="glass" style={{ padding: 14, borderRadius: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: u.role === "ADMIN" ? "rgba(139,92,246,0.15)" : "rgba(10,132,255,0.1)",
                      color: u.role === "ADMIN" ? "#BF5AF2" : "var(--c-blue)" }}>
                      {u.role}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>{u.email}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                    {new Date(u.createdAt).toLocaleDateString("es-CO")} · {u.stats.transactions} tx · {u.hasPin ? "PIN ✅" : "Sin PIN"}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
              {Array.from({ length: pages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  style={{
                    width: 34, height: 34, borderRadius: 10, border: "none", cursor: "pointer",
                    background: page === i + 1 ? "var(--c-blue)" : "var(--glass)",
                    color: page === i + 1 ? "#fff" : "var(--text)", fontWeight: 600, fontSize: 13,
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <style jsx>{`
        @media (max-width: 767px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", color: "var(--text-dim)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "10px 14px", color: "var(--text)" };
