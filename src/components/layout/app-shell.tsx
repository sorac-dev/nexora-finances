"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { TabBar } from "./tab-bar";
import { useUIStore } from "@/src/stores/ui.store";
import { useEffect } from "react";

const TAB_ROUTES = ["/", "/movements", "/cards", "/gastos-fijos", "/more"];
const HIDE_TABBAR_ROUTES = [
  "/movements/new",
  "/calendar",
  "/stats",
  "/alerts",
  "/settings",
  "/trash",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const showTabBar =
    !HIDE_TABBAR_ROUTES.some((r) => pathname.startsWith(r)) &&
    TAB_ROUTES.some((r) => pathname === r || (r !== "/" && pathname.startsWith(r)));

  // Sync tab with route
  useEffect(() => {
    if (pathname === "/") setActiveTab("home");
    else if (pathname.startsWith("/movements")) setActiveTab("movements");
    else if (pathname.startsWith("/cards")) setActiveTab("cards");
    else if (pathname.startsWith("/gastos-fijos")) setActiveTab("gastos-fijos");
    else if (pathname.startsWith("/goals")) setActiveTab("more");
    else if (
      pathname.startsWith("/more") ||
      pathname.startsWith("/calendar") ||
      pathname.startsWith("/stats") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/alerts")
    )
      setActiveTab("more");
  }, [pathname, setActiveTab]);

  return (
    <div className="phone-shell">
      {/* Background blobs */}
      <div className="blob blob1" />
      <div className="blob blob2" />
      <div className="blob blob3" />

      <div
        id="app-scroll-container"
        className={`app-content ${!showTabBar ? "no-tabbar" : ""}`}
        style={{
          position:"relative", flex:1, overflowY:"auto",
          padding: showTabBar ? "0 20px 90px" : "0 20px 16px",
          WebkitOverflowScrolling:"touch",
        }}
      >
        {children}
      </div>

      {showTabBar && <TabBar />}

      {/* FAB — shown on home + movements list */}
      {(pathname === "/" || (pathname.startsWith("/movements") && !pathname.startsWith("/movements/new") && !pathname.includes("/movements/"))) && (
        <Link href="/movements/new" className="fab">+</Link>
      )}
    </div>
  );
}
