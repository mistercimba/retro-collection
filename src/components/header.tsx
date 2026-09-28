import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { DesktopNav } from "./desktop-nav";
import { authEnabled } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-black tracking-tight text-slate-950">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white"><Gamepad2 className="h-5 w-5" /></span>
          <span className="hidden sm:inline">Mário&apos;s Retro Collection</span>
          <span className="sm:hidden">Retro Collection</span>
        </Link>
        <DesktopNav />
        <div className="flex items-center gap-2">
          {authEnabled() && <LogoutButton />}
        </div>
      </div>
    </header>
  );
}
