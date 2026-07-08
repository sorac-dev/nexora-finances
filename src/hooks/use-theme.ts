"use client";

import { useUIStore } from "@/src/stores/ui.store";

export function useTheme() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const setTheme = useUIStore((s) => s.setTheme);

  return { theme, toggleTheme, setTheme, isDark: theme === "dark" };
}
