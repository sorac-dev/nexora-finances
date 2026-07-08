import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/server/auth/better-auth-config";
import { prisma } from "@/src/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ verified: false, loggedIn: false });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, email: true },
    });

    return NextResponse.json({
      verified: !!user?.emailVerified,
      loggedIn: true,
      email: user?.email || "",
    });
  } catch {
    return NextResponse.json({ verified: false, loggedIn: false });
  }
}
