"use client";

import { useState } from "react";
import { displayPlatform } from "@/lib/data/platforms";
import { PLATFORM_ARTWORK } from "@/data/platform-artwork";

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function ArtworkFrame({
  src,
  alt,
  platform,
  title,
  className,
  imageClassName,
  eager = false,
}: {
  src: string;
  alt: string;
  platform: string;
  title: string;
  className: string;
  imageClassName: string;
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;

  return (
    <div className={`relative ${className}`}>
      {failed ? (
        <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 p-4 text-white">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">
            {displayPlatform(platform)}
          </span>
          <span className="text-3xl font-black tracking-tight text-white/90">
            {initials(title) || "GAME"}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailedSrc(src)}
          className={imageClassName}
        />
      )}
    </div>
  );
}

export function PlatformArtwork({
  platform,
  className = "h-40",
}: {
  platform: string;
  className?: string;
}) {
  return (
    <ArtworkFrame
      src={PLATFORM_ARTWORK[platform] ?? "/platforms/__missing__.png"}
      alt={`${displayPlatform(platform)} console`}
      platform={platform}
      title={displayPlatform(platform)}
      className={`overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 ${className}`}
      imageClassName="h-full w-full object-contain p-5 transition duration-300 group-hover:scale-[1.03]"
    />
  );
}

export function GameArtwork({
  collectionId,
  title,
  platform,
  className = "aspect-[3/4]",
  eager = false,
}: {
  collectionId: string;
  title: string;
  platform: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <ArtworkFrame
      src={`/covers/${encodeURIComponent(collectionId)}.png`}
      alt={`${title} PAL cover`}
      platform={platform}
      title={title}
      eager={eager}
      className={`overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 ${className}`}
      imageClassName="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.02]"
    />
  );
}
