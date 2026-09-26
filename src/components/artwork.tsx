"use client";

import { useState } from "react";
import { PlatformMark } from "@/components/platform-mark";

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
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={className}>
        <PlatformMark platform={platform} title={title} />
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
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
      src={`/api/artwork/platform?platform=${encodeURIComponent(platform)}`}
      alt={`${platform} console`}
      platform={platform}
      title={platform}
      className={`overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 ${className}`}
      imageClassName="h-full w-full object-contain p-5 transition duration-300 group-hover:scale-[1.03]"
    />
  );
}

export function GameArtwork({
  title,
  platform,
  className = "aspect-[3/4]",
  eager = false,
}: {
  title: string;
  platform: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <ArtworkFrame
      src={`/api/artwork/game?title=${encodeURIComponent(title)}&platform=${encodeURIComponent(platform)}`}
      alt={`${title} artwork`}
      platform={platform}
      title={title}
      eager={eager}
      className={`overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 ${className}`}
      imageClassName="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.02]"
    />
  );
}
