import Link from "next/link";
import { ArrowRight, CircleDollarSign, Database, LibraryBig, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { QuickSearch } from "@/components/quick-search";
import { dataMode, getAllGames, getStats } from "@/lib/data/collection-service";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";

export default async function HomePage() {
  const [stats, games] = await Promise.all([getStats(), getAllGames()]);
  const mode = dataMode();
  return <div className="space-y-8">
    <section className="relative z-30 rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-100"><Sparkles className="h-3.5 w-3.5" />Coleção pessoal · mobile-first</div>
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">A tua coleção, sem abrir o Excel.</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Pesquisa um jogo em segundos, confirma se já o tens e abre os detalhes da cópia física.</p>
        <div className="mx-auto mt-6 max-w-2xl text-left"><QuickSearch games={games} /></div>
        {mode === "mock" && <p className="mt-3 text-xs font-medium text-amber-200">Modo demonstração ativo — liga as credenciais Google para carregar a sheet real.</p>}
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric icon={<LibraryBig />} label="Na coleção" value={String(stats.kept)} />
      <Metric icon={<CircleDollarSign />} label="Valor registado" value={formatEuro(stats.marketValueEur)} />
      <Metric icon={<TriangleAlert />} label="A rever" value={String(stats.review)} />
      <Metric icon={<Database />} label="Para venda" value={String(stats.sell)} />
    </section>

    <section>
      <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Plataformas</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Onde está a coleção</h2></div><Link href="/collection" className="hidden items-center gap-1 text-sm font-bold text-blue-700 sm:flex">Ver tudo <ArrowRight className="h-4 w-4" /></Link></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{stats.platforms.map((platform) => <Link key={platform.slug} href={`/platform/${platform.slug}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">{displayPlatform(platform.platform)}</h3><p className="mt-1 text-sm text-slate-500">{platform.count} itens</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">{platform.audited}/{platform.count} auditados</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${platform.count ? Math.round(platform.audited / platform.count * 100) : 0}%` }} /></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{platform.review ? `${platform.review} a rever` : "Sem alertas"}</span><span className="font-bold text-slate-800">{formatEuro(platform.marketValueEur)}</span></div></Link>)}</div>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <Link href="/collection" className="rounded-3xl border border-blue-100 bg-blue-50 p-5 transition hover:border-blue-300"><ShieldCheck className="h-6 w-6 text-blue-700" /><h2 className="mt-3 text-xl font-black">Coleção completa</h2><p className="mt-1 text-sm leading-6 text-slate-600">Pesquisa e filtra por consola, completude, edição, região ou condição.</p></Link>
      <Link href="/sell" className="rounded-3xl border border-rose-100 bg-rose-50 p-5 transition hover:border-rose-300"><CircleDollarSign className="h-6 w-6 text-rose-700" /><h2 className="mt-3 text-xl font-black">Para venda</h2><p className="mt-1 text-sm leading-6 text-slate-600">Duplicados e PSP ainda por despachar, separados da coleção principal.</p></Link>
    </section>
  </div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-blue-800 [&>svg]:h-4 [&>svg]:w-4">{icon}</div><p className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p></div>;
}
