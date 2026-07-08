"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/src/components/ui/icon";

interface LogEntry {
  id: string; userId: string | null; action: string; entity: string;
  entityId: string | null; details: string | null; ipAddress: string | null;
  createdAt: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [actions, setActions] = useState<string[]>([]);
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (filterAction) params.set("action", filterAction);
    if (filterUser) params.set("userId", filterUser);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    fetch(`/api/admin/audit?${params}`)
      .then((r) => r.json())
      .then((d) => { setLogs(d.logs); setTotal(d.total); setPages(d.pages); setActions(d.actions || []); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page]); // eslint-disable-line

  function exportCSV() {
    const params = new URLSearchParams({ format: "csv", limit: "10000" });
    if (filterAction) params.set("action", filterAction);
    if (filterUser) params.set("userId", filterUser);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.open(`/api/admin/audit?${params}`, "_blank");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>
          Auditoría <span style={{ color: "var(--text-dim)", fontSize: 16, fontWeight: 500 }}>({total})</span>
        </h1>
        <button onClick={exportCSV} style={{
          background: "var(--c-save)", border: "none", borderRadius: 10, padding: "8px 16px",
          color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13,
        }}>
          <Icon name="Download" size={14} color="#fff" /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <select className="nexora-select" value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          style={{ width: "auto", minWidth: 160 }}>
          <option value="">Todas las acciones</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input className="nexora-input" placeholder="User ID" value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setPage(1); }} style={{ width: 200, marginBottom: 0 }} />
        <input className="nexora-input" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} style={{ width: 160, marginBottom: 0 }} />
        <input className="nexora-input" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} style={{ width: 160, marginBottom: 0 }} />
        <button onClick={() => { setFilterAction(""); setFilterUser(""); setDateFrom(""); setDateTo(""); setPage(1); load(); }}
          style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: "6px 14px", color: "var(--text)", cursor: "pointer", fontSize: 12 }}>
          Limpiar
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" style={{ width: 24, height: 24, margin: "0 auto" }} /></div>
      ) : (
        <div className="glass" style={{ borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <th style={th}>Fecha</th>
                <th style={th}>Acción</th>
                <th style={th} className="hide-mobile">Usuario</th>
                <th style={th}>Entidad</th>
                <th style={th} className="hide-mobile">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={td}>{new Date(l.createdAt).toLocaleString("es-CO")}</td>
                  <td style={td}>
                    <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: l.action.includes("DENIED") ? "rgba(255,107,107,0.15)" : "rgba(10,132,255,0.1)",
                      color: l.action.includes("DENIED") ? "#FF6B6B" : "var(--c-blue)" }}>
                      {l.action}
                    </span>
                  </td>
                  <td style={td} className="hide-mobile">{l.userId?.slice(0, 8)}...</td>
                  <td style={td}>{l.entity}{l.entityId ? `:${l.entityId.slice(0, 6)}` : ""}</td>
                  <td style={td} className="hide-mobile">{l.ipAddress || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 16 }}>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              style={{
                width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
                background: page === i + 1 ? "var(--c-blue)" : "var(--glass)",
                color: page === i + 1 ? "#fff" : "var(--text)", fontWeight: 600, fontSize: 12,
              }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`@media (max-width: 767px) { .hide-mobile { display: none !important; } }`}</style>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 12px", color: "var(--text-dim)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "8px 12px", color: "var(--text)" };
