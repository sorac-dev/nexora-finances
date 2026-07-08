"use client";

import { useTheme } from "@/src/hooks/use-theme";
import { Icon } from "@/src/components/ui/icon";

interface TopNavProps {
  title: string;
  backHref?: string;
  onBack?: () => void;
}

export function TopNav({ title, onBack }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();

  const handleBack = () => {
    if (onBack) { onBack(); } else { window.history.back(); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 14px", position: "relative", zIndex: 2 }}>
      <div className="top-nav-btn" onClick={handleBack}>
        <Icon name="ChevronLeft" size={18} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
      <div className="top-nav-btn" onClick={toggleTheme}>
        <Icon name={theme === "dark" ? "Sun" : "Moon"} size={18} />
      </div>
    </div>
  );
}
