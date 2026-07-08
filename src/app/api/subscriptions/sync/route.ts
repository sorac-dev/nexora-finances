import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUserId } from "@/src/lib/db-helpers";

/**
 * Sync all subscription due dates to their correct positions.
 * Each subscription keeps its day-of-month, but we reset the month/year
 * to the next occurrence based on today's date.
 * This fixes dates that were incorrectly advanced before the payment flow was fixed.
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const now = new Date();
  const today = now.getDate();

  const subs = await prisma.recurringPayment.findMany({
    where: { userId, deletedAt: null, active: true },
    select: { id: true, dueDate: true, deadline: true },
  });

  let fixed = 0;
  for (const sub of subs) {
    const dueDay = new Date(sub.dueDate).getDate();
    const deadDay = new Date(sub.deadline).getDate();

    // Calculate correct due date: this month if day hasn't passed, else next month
    let correctDue = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
    if (correctDue.getTime() < now.getTime() - 86400000) {
      correctDue.setMonth(correctDue.getMonth() + 1);
    }

    let correctDead = new Date(now.getFullYear(), now.getMonth(), Math.min(deadDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
    if (correctDead.getTime() < now.getTime() - 86400000) {
      correctDead.setMonth(correctDead.getMonth() + 1);
    }

    const newDue = correctDue.toISOString().split("T")[0];
    const newDead = correctDead.toISOString().split("T")[0];

    // Only update if changed
    const oldDue = sub.dueDate instanceof Date ? sub.dueDate.toISOString().split("T")[0] : String(sub.dueDate).split("T")[0];
    if (newDue !== oldDue || newDead !== String(sub.deadline).split("T")[0]) {
      await prisma.recurringPayment.update({
        where: { id: sub.id },
        data: { dueDate: new Date(newDue), deadline: new Date(newDead) },
      });
      fixed++;
    }
  }

  return NextResponse.json({ fixed });
}
