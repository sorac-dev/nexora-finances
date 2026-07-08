import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";

export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin(request);
  if (adminId instanceof NextResponse) return adminId;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;

    if (!file) return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 422 });
    if (!["logo", "favicon"].includes(type)) return NextResponse.json({ error: "Tipo inválido" }, { status: 422 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Formato no permitido. Usa PNG, JPEG, WebP, SVG o ICO." }, { status: 422 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Archivo demasiado grande (máx. 5MB)" }, { status: 422 });

    // Dynamic import to avoid Turbopack tracing at build time
    const { default: fs } = await import("fs");
    const path = await import("path");

    const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const ext = file.type === "image/x-icon" || file.type === "image/vnd.microsoft.icon"
      ? "ico" : file.type.split("/")[1] || "png";
    const filename = type === "logo" ? `logo.${ext}` : `favicon.${ext}`;
    const filepath = path.join(dir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    const publicUrl = `/uploads/${filename}?v=${Date.now()}`;
    return NextResponse.json({ url: publicUrl, filename, size: file.size });
  } catch {
    return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 });
  }
}
