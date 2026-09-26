import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "retro_access";

function expectedToken(): string | null {
  const password = process.env.APP_PASSWORD;
  return password ? createHash("sha256").update(`retro-collection:${password}`).digest("hex") : null;
}

export function authEnabled(): boolean {
  return Boolean(expectedToken());
}

export async function isAuthenticated(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return true;
  const actual = (await cookies()).get(COOKIE)?.value;
  if (!actual || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/login");
}

export async function setAuthCookie(): Promise<void> {
  const token = expectedToken();
  if (!token) return;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAuthCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export function passwordMatches(candidate: string): boolean {
  const password = process.env.APP_PASSWORD;
  if (!password) return true;
  const a = Buffer.from(candidate);
  const b = Buffer.from(password);
  return a.length === b.length && timingSafeEqual(a, b);
}
