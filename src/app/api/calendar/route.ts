import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/src/lib/db-helpers";
import { getCalendarEvents } from "@/src/lib/ledger";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const { searchParams } = request.nextUrl;
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth()));

  const events = await getCalendarEvents(userId, year, month);
  return NextResponse.json(events);
}
