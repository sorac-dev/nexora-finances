"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/src/hooks/use-theme";
import { ToggleSwitch } from "@/src/components/ui/toggle-switch";
import { Icon } from "@/src/components/ui/icon";

const ITEMS = [
  { icon: "Calendar", label: "Calendario", route: "/calendar" },
  { icon: "BarChart3", label: "Estadísticas", route: "/stats" },
  { icon: "Target", label: "Metas", route: "/goals" },
  { icon: "Tag", label: "Categorías", route: "/settings/categories" },
  { icon: "Bell", label: "Centro de alertas", route: "/alerts" },
  { icon: "Settings", label: "Configuración", route: "/settings" },
  { icon: "Trash2", label: "Papelera", route: "/trash" },
];

// Module-level cache: only fetch admin status once per page load
let _adminCache: boolean | null = null;
let _adminPromise: Promise<boolean> | null = null;

async function checkIsAdmin(): Promise<boolean> {
  if (_adminCache !== null) return _adminCache;
  if (_adminPromise) return _adminPromise;

  _adminPromise = fetch("/api/admin/dashboard")
    .then((r) => { _adminCache = r.ok; return r.ok; })
    .catch(() => { _adminCache = false; return false; });

  return _adminPromise;
}

export default function MorePage() {
  const { theme, toggleTheme } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkIsAdmin().then(setIsAdmin);
  }, []);

  return (
    <>
      <h1 className="page-title" style={{ fontSize: 24 }}>Más</h1>

      <div className="glass-card">
        {ITEMS.map((item, i) => (
          <Link key={item.route} href={item.route} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="link-row" style={i === ITEMS.length - 1 && !isAdmin ? { borderBottom: "none" } : undefined}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="icon-circ" style={{ background: "var(--glass-strong)" }}>
                  <Icon name={item.icon} size={20} />
                </div>
                <span className="txt-strong">{item.label}</span>
              </div>
              <span style={{ color: "var(--text-faint)" }}>
                <Icon name="ChevronRight" size={16} />
              </span>
            </div>
          </Link>
        ))}

        {/* Admin panel — only visible to admin users */}
        {isAdmin && (
          <Link href="/admin" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="link-row" style={{ borderBottom: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="icon-circ" style={{ background: "rgba(139,92,246,0.12)" }}>
                  <Icon name="Shield" size={20} color="#BF5AF2" />
                </div>
                <span className="txt-strong" style={{ color: "#BF5AF2" }}>Panel Admin</span>
              </div>
              <span style={{ color: "var(--text-faint)" }}>
                <Icon name="ChevronRight" size={16} />
              </span>
            </div>
          </Link>
        )}
      </div>

      <div className="glass-card row" onClick={toggleTheme} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="icon-circ" style={{ background: "var(--glass-strong)" }}>
            <Icon name={theme === "dark" ? "Moon" : "Sun"} size={20} />
          </div>
          <span className="txt-strong">Modo {theme === "dark" ? "oscuro" : "claro"}</span>
        </div>
        <ToggleSwitch checked={theme === "dark"} onChange={toggleTheme} />
      </div>
    </>
  );
}
