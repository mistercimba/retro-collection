import { ImageOff } from "lucide-react";
import { displayPlatform } from "@/lib/data/platforms";

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function GameArtworkPlaceholder({
  title,
  platform,
  className = "aspect-[3/4]",
}: {
  title: string;
  platform: string;
  className?: string;
}) {
  return <div
    role="img"
    aria-label={`Capa indisponível: ${title} · ${displayPlatform(platform)}`}
    className={`flex flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#203d33] via-[#294a3e] to-[#101f1a] p-3 text-center text-white ${className}`}
  >
    <span className="text-[8px] font-black uppercase tracking-[0.16em] text-white/45">Capa indisponível</span>
    <ImageOff className="mt-3 h-5 w-5 text-[#d9f36a]" aria-hidden="true" />
    <strong className="mt-2 text-lg font-black tracking-tight">{initials(title) || "GAME"}</strong>
    <span className="mt-1 line-clamp-2 text-[9px] font-bold uppercase tracking-wide text-white/55">{displayPlatform(platform)}</span>
  </div>;
}
