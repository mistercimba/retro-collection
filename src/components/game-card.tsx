import Link from "next/link";
import { AlertTriangle, BadgeEuro } from "lucide-react";
import type { CollectionListGame } from "@/lib/game-list-data";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import { GameArtwork } from "./artwork";
import { StatusPill } from "./status-pill";
import { MarketSearchLinks } from "./market-search-links";

export function GameCard({ game, sale = false }: { game: CollectionListGame; sale?: boolean }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md">
      <Link href={`/game/${encodeURIComponent(game.collectionId)}`} className="group flex min-w-0 gap-3 p-3.5">
        <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} className="h-[5.75rem] w-[4.3rem] shrink-0 rounded-lg bg-slate-50" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-bold uppercase tracking-[.12em] text-emerald-800">{displayPlatform(game.platform)}</span>
              <span className="mt-1 line-clamp-2 block text-sm font-extrabold leading-tight text-slate-950 group-hover:text-emerald-800">{game.title}</span>
            </span>
            {game.needsReview && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-label="A rever" />}
          </span>
          <span className="mt-1 truncate text-[11px] text-slate-500">{game.genre || "Género não disponível"}</span>
          <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
            <StatusPill tone={game.overallStatus.toLowerCase().includes("incomplete") ? "warn" : "neutral"}>{game.overallStatus || "Estado n/d"}</StatusPill>
            {sale && <StatusPill tone="bad">Para vender</StatusPill>}
            <span className="ml-auto flex items-center gap-1 text-xs font-bold text-slate-900"><BadgeEuro className="h-3.5 w-3.5 text-emerald-800" />{formatEuro(game.currentValueEur)}</span>
          </span>
          <span className="mt-1 truncate text-[10px] text-slate-400">{game.region || "Região n/d"}{game.edition ? ` · ${game.edition}` : ""}{game.conditionGrade ? ` · ${game.conditionGrade}` : ""}</span>
        </span>
      </Link>
      {sale && <div className="border-t border-slate-100 px-3.5 py-2.5"><p className="mb-1 text-[10px] font-semibold text-slate-500">{game.priceEstimate.value !== null ? `PriceCharting · ${game.priceEstimate.basis} · ${game.priceEstimate.date || "snapshot"}` : game.currentValueEur !== null ? "Valor registado na coleção" : "Valor não disponível"}{game.cexCashEur !== null ? ` · CeX cash ${formatEuro(game.cexCashEur)}` : ""}</p><MarketSearchLinks title={game.title} platform={game.platform} compact /></div>}
    </article>
  );
}
