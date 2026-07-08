import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin(request);
  if (adminId instanceof NextResponse) return adminId;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string; // "logo" or "favicon"

    if (!file) return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 422 });
    if (!["logo", "favicon"].includes(type)) return NextResponse.json({ error: "Tipo inválido" }, { status: 422 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Formato no permitido. Usa PNG, JPEG, WebP, SVG o ICO." }, { status: 422 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Archivo demasiado grande (máx. 5MB)" }, { status: 422 });

    // Determine extension
    const ext = file.type === "image/x-icon" || file.type === "image/vnd.microsoft.icon"
      ? "ico" : file.type.split("/")[1] || "png";
    const filename = type === "logo" ? `logo.${ext}` : `favicon.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    // Return public URL
    const publicUrl = `/uploads/${filename}?v=${Date.now()}`;

    return NextResponse.json({ url: publicUrl, filename, size: file.size });
  } catch {
    return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 });
  }
}
