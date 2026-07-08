import { NextRequest, NextResponse } from "next/server";

// This route uses Node.js fs/path — must not be statically analyzed
export const dynamic = "force-dynamic";

function uploadDir(): string {
  return process.env.UPLOAD_DIR || "public/uploads";
}

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Dynamic import to avoid Turbopack tracing at build time
  const { default: fs } = await import("fs");
  const path = await import("path");

  const dir = uploadDir();
  const filepath = path.join(dir, filename);

  if (!fs.existsSync(filepath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = fs.readFileSync(filepath);
  const ext = path.extname(filename).toLowerCase();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
