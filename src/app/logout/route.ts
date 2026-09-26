import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  await clearAuthCookie();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
