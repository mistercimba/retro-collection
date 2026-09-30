import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { authEnabled } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export function Header() {
  return <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f3ea]/95 backdrop-blur-xl md:hidden">
    <div className="flex h-15 items-center justify-between px-4">
      <Link href="/" className="flex items-center gap-2.5 font-black tracking-tight text-slate-950">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#17382e] text-[#d9f36a]"><Gamepad2 className="h-5 w-5" /></span>
        <span>Retro Collection</span>
      </Link>
      {authEnabled() && <LogoutButton />}
    </div>
  </header>;
}
