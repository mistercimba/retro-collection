import Link from "next/link";
import { AlertTriangle, BadgeEuro, Box, Disc3 } from "lucide-react";
import type { CollectionGame } from "@/lib/data/types";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import { GameArtwork } from "./artwork";
import { StatusPill } from "./status-pill";

export function GameCard({ game, sale = false }: { game: CollectionGame; sale?: boolean }) {
  return (
    <Link
      href={`/game/${encodeURIComponent(game.collectionId)}`}
      className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <GameArtwork title={game.title} platform={game.platform} className="aspect-[3/4] w-full" />
      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">{displayPlatform(game.platform)}</p>
            <h3 className="mt-1 line-clamp-2 font-bold leading-tight text-slate-950 group-hover:text-blue-800">{game.title}</h3>
          </div>
          {game.needsReview && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-label="A rever" />}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <StatusPill tone={game.overallStatus.toLowerCase().includes("incomplete") ? "warn" : "neutral"}>
            {game.overallStatus || "Estado n/d"}
          </StatusPill>
          {sale && <StatusPill tone="bad">Para venda</StatusPill>}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Disc3 className="h-3.5 w-3.5" />{game.region || "Região n/d"}</span>
          <span className="flex items-center gap-1.5"><Box className="h-3.5 w-3.5" />{game.edition || "Edição n/d"}</span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">{game.conditionGrade || "Condição n/d"}</span>
          <span className="flex items-center gap-1 text-sm font-bold text-slate-900">
            <BadgeEuro className="h-4 w-4 text-blue-700" />
            {formatEuro(game.marketValueEur)}
          </span>
        </div>
      </div>
    </Link>
  );
}
