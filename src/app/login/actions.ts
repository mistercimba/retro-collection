"use server";

import { redirect } from "next/navigation";
import { passwordMatches, setAuthCookie } from "@/lib/auth";

export type LoginState = {
  error?: string;
};

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) return { error: "Password incorreta." };
  await setAuthCookie();
  redirect("/");
}
