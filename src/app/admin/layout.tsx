"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/src/components/ui/icon";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/users", label: "Usuarios", icon: "Users" },
  { href: "/admin/audit", label: "Auditoría", icon: "Shield" },
  { href: "/admin/system", label: "Sistema", icon: "Server" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const r = await fetch("/api/admin/dashboard");
        if (r.ok) {
          setAuthorized(true);
        } else if (r.status === 401) {
          router.push("/login");
        } else {
          setAuthorized(false);
        }
      } catch {
        // Network error — don't redirect, just deny
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    }
    check();
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "#050609" }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "#050609", color: "#fff", flexDirection: "column", gap: 16, padding: 40, textAlign: "center" }}>
        <Icon name="Shield" size={48} color="#FF6B6B" />
        <div style={{ fontSize: 20, fontWeight: 800 }}>Acceso denegado</div>
        <div style={{ color: "var(--text-dim)", fontSize: 14 }}>No tienes permisos de administrador.</div>
        <Link href="/" style={{ color: "var(--c-blue)", fontSize: 14, fontWeight: 600 }}>Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "#050609" }}>
      {/* Desktop Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, background: "#0a0d14",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        padding: "20px 0",
      }} className="admin-sidebar">
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="Shield" size={20} color="var(--c-blue)" />
            Admin Panel
          </div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Administrador</div>
        </div>
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 10, marginBottom: 2,
                  background: active ? "rgba(10,132,255,0.12)" : "transparent",
                  color: active ? "#fff" : "var(--text-dim)",
                  fontWeight: active ? 700 : 500, fontSize: 14,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  <Icon name={item.icon} size={18} color={active ? "var(--c-blue)" : "var(--text-faint)"} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "0 12px" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              color: "var(--text-dim)", fontSize: 13,
            }}>
              <Icon name="ArrowLeft" size={16} />
              Salir al sitio
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="admin-bottom-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "#0a0d14", borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "none", justifyContent: "space-around", padding: "8px 0 12px",
      }}>
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <Icon name={item.icon} size={18} color={active ? "var(--c-blue)" : "var(--text-faint)"} />
              <span style={{ fontSize: 10, color: active ? "var(--c-blue)" : "var(--text-faint)", fontWeight: active ? 700 : 400 }}>
                {item.label.length > 8 ? item.label.slice(0, 7) + ".." : item.label}
              </span>
            </Link>
          );
        })}
        <Link href="/more" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Icon name="ArrowLeft" size={18} color="var(--text-faint)" />
          <span style={{ fontSize: 10, color: "var(--text-faint)" }}>Salir</span>
        </Link>
      </nav>

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px 80px", maxWidth: 1200 }}>
        {children}
      </main>

      <style jsx>{`
        @media (max-width: 767px) {
          .admin-sidebar { display: none !important; }
          .admin-bottom-nav { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
