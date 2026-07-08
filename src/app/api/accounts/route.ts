import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId, toNumber } from "@/src/lib/db-helpers";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const account = await prisma.financialAccount.findFirst({ where: { userId, deletedAt: null } });
  if (!account) {
    return NextResponse.json({ balance: 0, name: "Cuenta Principal" });
  }
  return NextResponse.json({ balance: toNumber(account.balance), name: account.name });
}
