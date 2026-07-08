import { NextResponse } from "next/server";
import { getAllSettings } from "@/src/lib/app-settings";

/**
 * Public settings endpoint — no auth required.
 * Returns all non-sensitive app configuration.
 * Secrets (DB URL, SMTP credentials, API keys) are NEVER exposed here.
 */
export async function GET() {
  const all = await getAllSettings();
  return NextResponse.json(all);
}
