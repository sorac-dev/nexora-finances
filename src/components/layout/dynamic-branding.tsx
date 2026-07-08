"use client";

import { useEffect } from "react";

/**
 * Reads app settings from the public API and dynamically updates:
 * - Page title
 * - Favicon link
 * - Apple touch icon
 * Falls back to defaults if no settings are configured.
 */
export function DynamicBranding() {
  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((s) => {
        if (!s) return;

        // Update page title
        if (s.app_name) {
          document.title = s.app_name;
        }

        // Update favicon
        if (s.app_favicon_url) {
          let link = document.querySelector("link[data-dynamic-favicon]") as HTMLLinkElement;
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            link.setAttribute("data-dynamic-favicon", "true");
            document.head.appendChild(link);
          }
          link.href = s.app_favicon_url;

          // Also update apple-touch-icon
          let appleLink = document.querySelector("link[data-dynamic-apple]") as HTMLLinkElement;
          if (!appleLink) {
            appleLink = document.createElement("link");
            appleLink.rel = "apple-touch-icon";
            appleLink.setAttribute("data-dynamic-apple", "true");
            document.head.appendChild(appleLink);
          }
          appleLink.href = s.app_favicon_url;
        }

        // Update theme color
        if (s.primary_color) {
          const meta = document.querySelector("meta[name='theme-color']");
          if (meta) meta.setAttribute("content", s.primary_color);
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
