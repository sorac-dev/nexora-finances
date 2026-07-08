import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";

const DEFAULTS = {
  upcoming: true, cut: true, goals: true, unclassified: false,
  daysBefore3: true, daysBefore1: true, sameDay: true,
};

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notifPrefs: true } });
  const prefs = (user?.notifPrefs as Record<string, boolean>) || {};
  return NextResponse.json({ ...DEFAULTS, ...prefs });
}

export async function PUT(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json();
  await prisma.user.update({
    where: { id: userId },
    data: { notifPrefs: body },
  });
  return NextResponse.json({ success: true });
}
