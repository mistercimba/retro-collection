import { redirect } from "next/navigation";
import { authEnabled, isAuthenticated } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (!authEnabled() || await isAuthenticated()) redirect("/");
  return <main className="grid min-h-screen place-items-center bg-[var(--archive-paper)] px-4"><LoginForm /></main>;
}
