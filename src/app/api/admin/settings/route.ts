import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminAudit } from "@/src/lib/admin-auth";
import { getAllSettings, setSettings } from "@/src/lib/app-settings";

export async function GET(request: NextRequest) {
  const adminId = await requireAdmin(request);
  if (adminId instanceof NextResponse) return adminId;

  const settings = await getAllSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const adminId = await requireAdmin(request);
  if (adminId instanceof NextResponse) return adminId;

  const body = await request.json().catch(() => ({}));

  // Only allow known setting keys
  const allowed = new Set([
    "app_name", "app_logo_url", "app_favicon_url",
    "primary_color", "accent_color",
    "legal_email", "privacy_email", "support_email",
    "legal_address", "legal_country", "app_domain",
  ]);

  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (allowed.has(key) && typeof value === "string") {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No hay campos válidos" }, { status: 422 });
  }

  await setSettings(updates);
  await adminAudit(adminId, "ADMIN_UPDATE_SETTINGS", "app_settings", null, updates, request);

  return NextResponse.json({ success: true, updated: updates });
}
