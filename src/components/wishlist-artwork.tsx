"use client";

import { useState } from "react";
import { GameArtworkPlaceholder } from "@/components/game-artwork-placeholder";

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
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showArtwork = Boolean(artworkSrc) && artworkSrc !== failedSrc;

  if (showArtwork) {
    return <div className={`overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 ${className}`}>
      <img
        src={artworkSrc!}
        alt={`${title} cover`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailedSrc(artworkSrc)}
        className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
      />
    </div>;
  }

  return <GameArtworkPlaceholder title={title} platform={platform} className={className} />;
}
