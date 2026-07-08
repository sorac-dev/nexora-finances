import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";

/**
 * DELETE /api/transactions/trash — permanently delete all trashed transactions.
 * Requires the user to be authenticated.
 */
export async function DELETE(_request: NextRequest) {
  const userId = await getUserId(_request);

  const result = await prisma.transaction.deleteMany({
    where: { userId, deletedAt: { not: null } },
  });

  return NextResponse.json({ success: true, deleted: result.count });
}
