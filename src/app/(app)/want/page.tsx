import Link from "next/link";
import { getStats, getWantlist } from "@/lib/data/collection-service";
import { displayPlatform, platformReleaseYear, platformSlug, sortPlatformsByRelease } from "@/lib/data/platforms";

export const metadata = { title: "Wishlist" };

export default async function WantPage() {
  const [targets, stats] = await Promise.all([getWantlist(), getStats()]);
  const active = targets.filter((target) => target.planState !== "inactive" && target.matchState !== "acquired");
  const names = [...new Set([...stats.platforms.map((item) => item.platform), ...active.map((target) => target.platform)])];
  const groups = sortPlatformsByRelease(names.map((platform) => ({
    platform,
    count: active.filter((target) => target.platform === platform).length,
  })).filter((item) => item.count > 0));

  return <div className="space-y-5 pb-8">
    <header><p className="text-xs font-black uppercase tracking-[.14em] text-rose-700">Wishlist</p><h1 className="mt-1 text-2xl font-black text-slate-950">{active.length} jogos em falta</h1><p className="mt-1 text-sm text-slate-500">Escolhe uma consola.</p></header>
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => <Link key={group.platform} href={"/platform/" + platformSlug(group.platform) + "?tab=wishlist"} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-rose-300">
        <div className="flex items-baseline justify-between gap-2"><strong className="text-sm font-black text-slate-950">{displayPlatform(group.platform)}</strong><span className="text-[11px] text-slate-400">{platformReleaseYear(group.platform) < 9990 ? platformReleaseYear(group.platform) : "—"}</span></div>
        <p className="mt-2 text-xs text-slate-500">{group.count} alvos</p>
      </Link>)}
    </section>
  </div>;
}
