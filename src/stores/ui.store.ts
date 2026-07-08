"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface UIState {
  theme: Theme;
  activeTab: string;
  showOpeningModal: boolean;
  sidebarOpen: boolean;
  isAdmin: boolean;
  isAdminChecked: boolean;
  toasts: { id: string; message: string; type: "success" | "error" | "info" }[];

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setActiveTab: (tab: string) => void;
  setShowOpeningModal: (show: boolean) => void;
  toggleSidebar: () => void;
  setIsAdmin: (isAdmin: boolean) => void;
  addToast: (message: string, type: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "dark",
      activeTab: "home",
      showOpeningModal: false,
      sidebarOpen: false,
      isAdmin: false,
      isAdminChecked: false,
      toasts: [],

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setActiveTab: (activeTab) => set({ activeTab }),
      setShowOpeningModal: (show) => set({ showOpeningModal: show }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setIsAdmin: (isAdmin) => set({ isAdmin, isAdminChecked: true }),
      addToast: (message, type) =>
        set((s) => ({
          toasts: [...s.toasts, { id: crypto.randomUUID(), message, type }],
        })),
      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    { name: "nexora-ui", partialize: (s) => ({ theme: s.theme }) }
  )
);
