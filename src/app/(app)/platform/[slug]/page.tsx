import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CollectionBrowser } from "@/components/collection-browser";
import { getCollectionListGames, collectionValue } from "@/lib/game-list-data";
import { displayPlatform, platformFromSlug } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import { isAuditCompleted } from "@/lib/data/collection-integrity";
import { searchParamsToString } from "@/lib/list-url-state.logic";

export default async function PlatformPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ slug }, games, query] = await Promise.all([params, getCollectionListGames(), searchParams]);
  const platform = platformFromSlug(slug, [...new Set(games.map((game) => game.platform))]);
  if (!platform) notFound();
  const platformGames = games.filter((game) => game.platform === platform);
  const audited = platformGames.filter((game) => isAuditCompleted(game.audit?.auditStatus)).length;
  const value = collectionValue(platformGames);
  const reviewCount = platformGames.filter((game) => game.needsReview).length;
  return <div><Link href="/collection" className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-800"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Todas as plataformas</Link><header className="mb-4"><p className="section-kicker">PLATAFORMA</p><h1 className="section-title">{displayPlatform(platform)}</h1><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white px-3 py-1.5 font-bold ring-1 ring-slate-200">{platformGames.length} jogos</span><span className="rounded-full bg-white px-3 py-1.5 font-bold ring-1 ring-slate-200">{audited}/{platformGames.length} auditados</span>{reviewCount > 0 && <Link href={`/platform/${slug}?review=1`} className="rounded-full bg-amber-50 px-3 py-1.5 font-bold text-amber-900 ring-1 ring-amber-200">A rever: {reviewCount}</Link>}<span className="rounded-full bg-white px-3 py-1.5 font-bold ring-1 ring-slate-200">{value === null ? "Valor n/d" : formatEuro(value)}</span></div></header><CollectionBrowser games={platformGames} initialSearch={searchParamsToString(query)} /></div>;
}
