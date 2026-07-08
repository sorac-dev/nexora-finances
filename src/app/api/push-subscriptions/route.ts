import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  return NextResponse.json(subs);
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json();
  const existing = await prisma.pushSubscription.findFirst({ where: { userId, endpoint: body.endpoint } });
  if (!existing) {
    await prisma.pushSubscription.create({
      data: { userId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, userAgent: request.headers.get("user-agent") || "" },
    });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json();
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint: body.endpoint } });
  return NextResponse.json({ success: true });
}
