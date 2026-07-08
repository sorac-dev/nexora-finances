"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TopNav } from "@/src/components/layout/top-nav";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Icon } from "@/src/components/ui/icon";
import { toast } from "sonner";

interface Profile { name: string; email: string; theme: string; }

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try { const r = await fetch("/api/user/profile"); if (r.ok) { const d = await r.json(); setProfile(d); } }
    catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadProfile();
    const onFocus = () => loadProfile();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadProfile]);

  function handleLogout() {
    // Navigate to server-side logout route which handles
    // session deletion and cookie clearing reliably.
    window.location.assign("/logout");
  }

  const userName = profile?.name || "Usuario";
  const userEmail = profile?.email || "";
  const initial = userName.charAt(0).toUpperCase();

  const links = [
    { title: "Perfil", route: "/settings/profile", icon: "User", desc: userName },
    { title: "Notificaciones", route: "/settings/notifications", icon: "Bell", desc: "Pagos, cortes, metas" },
    { title: "Seguridad", route: "/settings/security", icon: "Lock", desc: "Configura el PIN para mayor seguridad" },
    { title: "Apariencia", route: "/settings/appearance", icon: "Palette", desc: profile?.theme === "dark" ? "Oscuro" : "Claro" },
  ];

  return (
    <>
      <TopNav title="Configuración" backHref="/more" />
      <div className="glass-card row" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {loading ? (
            <>
              <Skeleton width={56} height={56} className="rounded-[18px]" />
              <div><Skeleton width={100} height={18} className="mb-2" /><Skeleton width={150} height={14} /></div>
            </>
          ) : (
            <>
              <div className="avatar" style={{ background: "linear-gradient(135deg,#0A84FF,#8B5CF6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {initial}
              </div>
              <div className="col">
                <div className="txt-strong" style={{ fontSize: 16 }}>{userName}</div>
                <div className="txt-dim">{userEmail}</div>
              </div>
            </>
          )}
        </div>
        <Link href="/settings/profile" style={{ color: "var(--text-faint)" }}>
          <Icon name="ChevronRight" size={16} />
        </Link>
      </div>

      <div className="glass-card">
        {links.map((l, i) => (
          <Link key={l.route} href={l.route} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="link-row" style={i === links.length - 1 ? { borderBottom: "none" } : undefined}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="icon-circ" style={{ background: "var(--glass-strong)" }}>
                  <Icon name={l.icon} size={20} />
                </div>
                <div className="col"><span className="txt-strong">{l.title}</span><span className="txt-dim">{l.desc}</span></div>
              </div>
              <span style={{ color: "var(--text-faint)" }}><Icon name="ChevronRight" size={16} /></span>
            </div>
          </Link>
        ))}
      </div>

      <Button variant="danger" style={{ marginTop: 6 }} onClick={handleLogout}>Cerrar sesión</Button>
    </>
  );
}
