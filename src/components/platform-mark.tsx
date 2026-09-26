import { displayPlatform } from "@/lib/data/platforms";

const tones = [
  "from-sky-700 to-indigo-900",
  "from-emerald-700 to-teal-950",
  "from-violet-700 to-fuchsia-950",
  "from-amber-600 to-orange-900",
  "from-rose-700 to-red-950",
];

function hash(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function PlatformMark({ platform, title, compact = false }: { platform: string; title: string; compact?: boolean }) {
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const tone = tones[hash(platform + title) % tones.length];
  return (
    <div className={`relative overflow-hidden rounded-[1.4rem] bg-gradient-to-br ${tone} text-white shadow-sm ${compact ? "h-24" : "aspect-[4/3]"}`}>
      <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full border border-white/20" />
      <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">{displayPlatform(platform)}</span>
        <span className="text-3xl font-black tracking-tight text-white/95">{initials || "GAME"}</span>
      </div>
    </div>
  );
}
