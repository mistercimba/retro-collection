"use client";

import { useState } from "react";
import { displayPlatform } from "@/lib/data/platforms";
import { PLATFORM_ARTWORK } from "@/data/platform-artwork";
import { GAME_ARTWORK } from "@/data/game-artwork";
import { GameArtworkPlaceholder } from "@/components/game-artwork-placeholder";

function ArtworkFrame({
  src,
  alt,
  platform,
  title,
  className,
  imageClassName,
  eager = false,
}: {
  src: string | null;
  alt: string;
  platform: string;
  title: string;
  className: string;
  imageClassName: string;
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src) && failedSrc === src;
  if (!src || failed) return <GameArtworkPlaceholder title={title} platform={platform} className={className} />;

  return (
    <div className={`relative ${className}`}>
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailedSrc(src)}
          className={imageClassName}
        />
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
  catalogArtwork = false,
}: {
  collectionId: string;
  title: string;
  platform: string;
  className?: string;
  eager?: boolean;
  catalogArtwork?: boolean;
}) {
  return (
    <ArtworkFrame
      src={GAME_ARTWORK[collectionId] ?? (catalogArtwork ? `/api/catalog-artwork/${encodeURIComponent(collectionId)}` : null)}
      alt={`${title} PAL cover`}
      platform={platform}
      title={title}
      eager={eager}
      className={`overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 ${className}`}
      imageClassName="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.02]"
    />
  );
}
