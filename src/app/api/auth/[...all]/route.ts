import { auth } from "@/src/server/auth/better-auth-config";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return auth.handler(request);
}

export async function POST(request: NextRequest) {
  return auth.handler(request);
}
