"use client";

import { Gamepad2 } from "lucide-react";
import { displayPlatform } from "@/lib/data/platforms";

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 3).map((part) => part[0]).join("").toUpperCase();
}

export function WishlistArtwork({ title, platform, className = "aspect-[3/4]" }: { title: string; platform: string; className?: string }) {
  return <div className={`flex flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#203d33] via-[#294a3e] to-[#101f1a] p-3 text-center text-white ${className}`}>
    <Gamepad2 className="mb-2 h-6 w-6 text-[#d9f36a]" />
    <strong className="text-lg font-black">{initials(title) || "GAME"}</strong>
    <span className="mt-1 line-clamp-2 text-[9px] font-bold uppercase tracking-wide text-white/50">{displayPlatform(platform)}</span>
  </div>;
}
