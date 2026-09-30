"use client";

import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { displayPlatform } from "@/lib/data/platforms";

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 3).map((part) => part[0]).join("").toUpperCase();
}

export function WishlistArtwork({
  title,
  platform,
  artworkSrc = null,
  className = "aspect-[3/4]",
  eager = false,
}: {
  title: string;
  platform: string;
  artworkSrc?: string | null;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showArtwork = Boolean(artworkSrc) && !failed;

  if (showArtwork) {
    return <div className={`overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 ${className}`}>
      <img
        src={artworkSrc!}
        alt={`${title} cover`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
      />
    </div>;
  }

  return <div className={`flex flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#203d33] via-[#294a3e] to-[#101f1a] p-3 text-center text-white ${className}`}>
    <Gamepad2 className="mb-2 h-6 w-6 text-[#d9f36a]" />
    <strong className="text-lg font-black">{initials(title) || "GAME"}</strong>
    <span className="mt-1 line-clamp-2 text-[9px] font-bold uppercase tracking-wide text-white/50">{displayPlatform(platform)}</span>
  </div>;
}
