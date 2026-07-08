import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function uploadDir(): string {
  // process.cwd() inside a function avoids Turbopack tracing the whole project
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const UPLOAD_DIR = uploadDir();

  // Security: only allow safe filenames
  if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filepath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = fs.readFileSync(filepath);
  const ext = path.extname(filename).toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
