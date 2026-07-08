"use client";

import { TopNav } from "@/src/components/layout/top-nav";
import { useTheme } from "@/src/hooks/use-theme";
import { Icon } from "@/src/components/ui/icon";

const OPTIONS = [
  { id: "dark" as const, label: "Oscuro", icon: "Moon" },
  { id: "light" as const, label: "Claro", icon: "Sun" },
];

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <TopNav title="Apariencia" backHref="/settings" />
      <div className="glass-card">
        {OPTIONS.map((opt) => (
          <div key={opt.id} className="link-row" onClick={() => setTheme(opt.id)} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="icon-circ" style={{ background: "var(--glass-strong)" }}>
                <Icon name={opt.icon} size={20} />
              </div>
              <span className="txt-strong">{opt.label}</span>
            </div>
            {theme === opt.id && <Icon name="Check" size={20} color="var(--c-blue)" />}
          </div>
        ))}
      </div>
    </>
  );
}
