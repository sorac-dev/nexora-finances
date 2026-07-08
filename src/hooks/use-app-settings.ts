"use client";

import { useState, useEffect } from "react";

// Static fallbacks — used before the API responds
const FALLBACKS: Record<string, string> = {
  app_name: "Nexora Finance",
  support_email: "soporte@nexora.app",
  legal_email: "legal@nexora.app",
  privacy_email: "privacidad@nexora.app",
  legal_address: "Bogotá D.C., República de Colombia",
  legal_country: "Colombia",
  app_domain: "nexora.app",
  app_url: "http://localhost:3000",
  terms_text: "",
  privacy_text: "",
  cookies_text: "",
};

export function useAppSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(FALLBACKS);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setSettings((prev) => ({ ...prev, ...d })); })
      .catch(() => {});
  }, []);

  return settings;
}
