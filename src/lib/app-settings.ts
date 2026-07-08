import { prisma } from "@/src/lib/prisma";

// Default values — used when no DB setting exists
const DEFAULTS: Record<string, string> = {
  app_name: process.env.NEXT_PUBLIC_APP_NAME || "Nexora Finance",
  app_logo_url: "",
  app_favicon_url: "",
  primary_color: "#0A84FF",
  accent_color: "#BF5AF2",
  legal_email: process.env.NEXT_PUBLIC_LEGAL_EMAIL || "legal@nexora.app",
  privacy_email: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "privacidad@nexora.app",
  support_email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "soporte@nexora.app",
  legal_address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || "Bogotá D.C., República de Colombia",
  legal_country: process.env.NEXT_PUBLIC_LEGAL_COUNTRY || "Colombia",
  app_domain: process.env.NEXT_PUBLIC_APP_DOMAIN || "nexora.app",
  terms_text: "",
  privacy_text: "",
  cookies_text: "",
  require_email_verification: "",
};

// Cache settings in memory for 60 seconds to avoid DB hits on every request
let cache: Record<string, string> | null = null;
let cacheTime = 0;

async function loadAll(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && now - cacheTime < 60_000) return cache;

  const rows = await prisma.appSetting.findMany();
  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  cache = settings;
  cacheTime = now;
  return settings;
}

/** Get a single setting value */
export async function getSetting(key: string): Promise<string> {
  const all = await loadAll();
  return all[key] || DEFAULTS[key] || "";
}

/** Get all settings (for admin panel) */
export async function getAllSettings(): Promise<Record<string, string>> {
  return loadAll();
}

/** Update a setting (admin only) */
export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  cache = null; // invalidate cache
}

/** Update multiple settings at once */
export async function setSettings(updates: Record<string, string>): Promise<void> {
  const ops = Object.entries(updates).map(([key, value]) =>
    prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  );
  await Promise.all(ops);
  cache = null;
}
