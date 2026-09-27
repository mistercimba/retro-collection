import { notFound } from "next/navigation";
import { CollectionBrowser } from "@/components/collection-browser";
import { getCollectionGames } from "@/lib/data/collection-service";
import { displayPlatform, platformFromSlug } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import { isAuditCompleted } from "@/lib/data/collection-integrity";

export default async function PlatformPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const games = await getCollectionGames();
  const platforms = [...new Set(games.map((game) => game.platform))];
  const platform = platformFromSlug(slug, platforms);
  if (!platform) notFound();
  const platformGames = games.filter((game) => game.platform === platform);
  const audited = platformGames.filter((game) => isAuditCompleted(game.audit?.auditStatus)).length;
  const value = platformGames.reduce((sum, game) => sum + (game.marketValueEur ?? 0), 0);
  return <div><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Plataforma</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{displayPlatform(platform)}</h1><div className="mt-3 flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-white px-3 py-1.5 font-bold shadow-sm ring-1 ring-slate-200">{platformGames.length} itens</span><span className="rounded-full bg-white px-3 py-1.5 font-bold shadow-sm ring-1 ring-slate-200">{audited}/{platformGames.length} auditados</span><span className="rounded-full bg-white px-3 py-1.5 font-bold shadow-sm ring-1 ring-slate-200">{formatEuro(value)}</span></div></div><CollectionBrowser games={platformGames} /></div>;
}
