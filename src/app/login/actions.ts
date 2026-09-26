"use server";

import { redirect } from "next/navigation";
import { passwordMatches, setAuthCookie } from "@/lib/auth";

export async function loginAction(_: { error?: string }, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) return { error: "Password incorreta." };
  await setAuthCookie();
  redirect("/");
}
