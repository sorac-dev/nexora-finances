import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, ensureUser } from "@/src/lib/db-helpers";
import { z } from "zod";

// WARNING: Role is intentionally excluded from this schema.
// Users can NEVER self-assign ADMIN role.
const updateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  currency: z.enum(["COP","USD","MXN","EUR"]),
  country: z.enum(["Colombia","México","Chile","España"]),
  language: z.enum(["es","en"]).optional(),
});

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const user = await ensureUser(userId);
  return NextResponse.json({
    id: user.id, name: user.name, email: user.email, currency: user.currency,
    country: user.country, language: user.language, theme: user.theme,
    timezone: user.timezone, salaryDay: user.salaryDay,
  });
}

export async function PUT(request: NextRequest) {
  const userId = await getUserId(request);
  await ensureUser(userId);
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", errors: parsed.error.issues }, { status: 422 });

  const { name, email, currency, country, language } = parsed.data;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: name.trim(), email: email.trim().toLowerCase(), currency, country, language: language || "es" },
  });

  return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, currency: user.currency, country: user.country, language: user.language, theme: user.theme } });
}
