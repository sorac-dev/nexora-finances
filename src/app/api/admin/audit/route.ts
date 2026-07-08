import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/admin-auth";

export async function GET(request: NextRequest) {
  const adminId = await requireAdmin(request);
  if (adminId instanceof NextResponse) return adminId;

  const { searchParams } = request.nextUrl;
  const userId = searchParams.get("userId") || "";
  const action = searchParams.get("action") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "30"));
  const format = searchParams.get("format") || "json";
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo + "T23:59:59.999Z");
  }

  const [logs, total, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    }),
  ]);

  // CSV export
  if (format === "csv") {
    const header = "ID,Usuario ID,Acción,Entidad,Entidad ID,Detalles,IP,Fecha\n";
    const csvEscape = (v: unknown) => {
      const s = String(v ?? "");
      // CSV injection protection: prefix =, +, -, @ with a single quote
      if (/^[=+\-@]/.test(s)) return `'${s}`;
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = logs.map((l: { id: string; userId: string | null; action: string; entity: string; entityId: string | null; details: string | null; ipAddress: string | null; createdAt: Date }) =>
      [l.id, l.userId || "", l.action, l.entity, l.entityId || "", csvEscape(l.details), l.ipAddress || "", l.createdAt.toISOString()]
        .map(csvEscape)
        .join(",")
    ).join("\n");

    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({
    logs,
    total,
    page,
    pages: Math.ceil(total / limit),
    actions: (actions as { action: string }[]).map((a) => a.action),
  });
}
