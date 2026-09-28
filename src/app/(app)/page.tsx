import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Disc3,
  LibraryBig,
  Heart,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { GameArtwork, PlatformArtwork } from "@/components/artwork";
import { QuickSearch } from "@/components/quick-search";
import { dataMode, getAllGames, getStats, getWantlist } from "@/lib/data/collection-service";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import { isAuditCompleted } from "@/lib/data/collection-integrity";

export default async function HomePage() {
  const [stats, games, targets] = await Promise.all([getStats(), getAllGames(), getWantlist()]);
  const mode = dataMode();
  const kept = games.filter((game) => game.keepStatus === "Collection");
  const covers = [...kept]
    .filter((game) => game.marketValueEur !== null)
    .sort((a, b) => (b.marketValueEur ?? 0) - (a.marketValueEur ?? 0))
    .slice(0, 4);
  const audited = kept.filter((game) => isAuditCompleted(game.audit?.auditStatus)).length;
  const auditGaps = Math.max(0, kept.length - audited);
  const auditProgress = kept.length ? Math.round((audited / kept.length) * 100) : 0;
  const spotlightPlatforms = stats.platforms.slice(0, 6);
  const nextTargets = targets.filter((target) => target.planState !== "inactive" && target.matchState !== "acquired").slice(0, 3);

  return (
    <div className="space-y-7 pb-8 sm:space-y-14">
      <section className="archive-hero relative isolate overflow-hidden rounded-[2rem] text-white shadow-[0_24px_70px_-35px_rgba(14,27,45,.75)]">
        <div className="archive-hero-glow" aria-hidden="true" />
        <div className="relative grid gap-8 px-5 py-7 sm:px-9 sm:py-9 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-12 lg:py-12">
          <div className="relative z-20">
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-7">
              <span className="archive-eyebrow"><Sparkles className="h-3.5 w-3.5" /> O ARQUIVO DO MÁRIO</span>
              {mode === "google" ? (
                <span className="data-badge"><span className="live-dot" /> SHEET LIGADA</span>
              ) : (
                <span className="data-badge data-badge-demo">DADOS DE DEMONSTRAÇÃO</span>
              )}
            </div>
            <h1 className="max-w-[14ch] text-[2.05rem] font-black leading-[1] tracking-[-.055em] sm:text-6xl xl:text-7xl">
              Cada jogo tem uma <span className="text-[#d5f36a]">história.</span>
            </h1>
            <p className="mt-3 max-w-xl text-xs leading-5 text-white/70 sm:mt-5 sm:text-base sm:leading-7">
              Uma casa para a coleção que foste construindo: o que já encontraste, o que queres completar e o que ainda anda à procura de prateleira.
            </p>
            <div className="mt-4 max-w-2xl sm:mt-7"><QuickSearch games={games} /></div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/collection" className="hero-action hero-action-primary"><LibraryBig className="h-4 w-4" /> Explorar coleção <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/collection/games" className="hero-action hero-action-secondary">Todos os jogos</Link>
              <Link href="/want" className="hero-action hero-action-secondary"><Heart className="h-4 w-4" /> À procura</Link>
            </div>
          </div>

          <div className="cover-display" aria-label="Capas em destaque da coleção">
            {covers.map((game, index) => (
              <Link
                key={game.collectionId}
                href={`/game/${encodeURIComponent(game.collectionId)}`}
                className={`cover-display-card cover-display-card-${index + 1} group`}
                aria-label={`${game.title}, ${displayPlatform(game.platform)}`}
              >
                <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} className="h-full w-full" eager={index < 2} />
              </Link>
            ))}
            <div className="cover-display-caption"><Disc3 className="h-4 w-4" /><span>{kept.length} peças no arquivo</span></div>
          </div>
        </div>
        <div className="relative grid grid-cols-2 border-t border-white/10 bg-black/10 sm:grid-cols-4">
          <HeroStat value={String(stats.kept)} label="na coleção" />
          <HeroStat value={String(stats.platforms.length)} label="plataformas" />
          <HeroStat value={String(stats.sell)} label="à procura de casa" />
          <HeroStat value={formatEuro(stats.marketValueEur)} label="valor registado" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <div className="dashboard-panel p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">SAÚDE DO INVENTÁRIO</p>
              <h2 className="section-title">A coleção, por dentro</h2>
            </div>
            <span className="panel-icon"><ShieldCheck className="h-5 w-5" /></span>
          </div>
          <div className="mt-7 flex items-center gap-5 sm:gap-7">
            <div className="audit-ring" style={{ "--progress": `${auditProgress}%` } as React.CSSProperties}>
              <div><strong>{auditProgress}%</strong><span>auditado</span></div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold tracking-tight text-slate-950">Cada cópia, bem documentada.</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">O registo físico ajuda-te a saber exatamente o que tens — e o que falta encontrar.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="status-tag status-tag-good">{audited} auditados</span>
                {auditGaps > 0 && <span className="status-tag status-tag-warn">{auditGaps} sem auditoria</span>}
              </div>
            </div>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#214a3d] transition-all" style={{ width: `${auditProgress}%` }} /></div>
        </div>

        <Link href="/collection" className="dashboard-panel dashboard-panel-attention group p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">PEDIDO DE ATENÇÃO</p>
              <h2 className="section-title">Há coisas para rever</h2>
            </div>
            <span className="panel-icon panel-icon-warn"><TriangleAlert className="h-5 w-5" /></span>
          </div>
          <div className="mt-7 flex items-end justify-between gap-4">
            <div><p className="text-5xl font-black tracking-[-.06em] text-slate-950">{stats.review}</p><p className="mt-1 text-sm font-medium text-slate-500">registos assinalados na coleção</p></div>
            <span className="round-arrow"><ArrowUpRight className="h-5 w-5" /></span>
          </div>
          <p className="mt-6 border-t border-slate-100 pt-4 text-sm font-bold text-slate-700">Abre a biblioteca e consulta os jogos da coleção <ArrowRight className="ml-1 inline h-4 w-4 transition-transform group-hover:translate-x-1" /></p>
        </Link>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="section-kicker">CAÇADA EM CURSO</p><h2 className="section-title">O que procurar a seguir</h2></div>
          <Link href="/want" className="section-link">Abrir wantlist <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {nextTargets.length ? <div className="grid gap-3 md:grid-cols-3">
          {nextTargets.map((target, index) => {
            const query = encodeURIComponent(`${target.title} ${displayPlatform(target.platform)}`);
            return <article className="next-target-card" key={`${target.platform}:${target.title}`}>
              <div className="flex items-center justify-between gap-2"><span className={`target-priority target-priority-${target.priority.toLowerCase()}`}>{target.priority}</span><span className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">0{index + 1} · {displayPlatform(target.platform)}</span></div>
              <h3 className="mt-4 text-lg font-black leading-tight tracking-tight text-slate-950">{target.title}</h3>
              <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{target.reason}</p>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <a href={`https://www.pricecharting.com/search-products?type=videogames&q=${query}`} target="_blank" rel="noreferrer" className="target-price-link">PriceCharting <ArrowUpRight className="h-3.5 w-3.5" /></a>
                <Link href="/want" className="target-price-link target-price-link-secondary">Ver objetivo</Link>
              </div>
            </article>;
          })}
        </div> : <div className="dashboard-panel px-5 py-6 text-sm text-slate-600">A wantlist está vazia. Quando adicionares novos alvos aos PLANs, aparecem aqui.</div>}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="section-kicker">O TEU ACERVO</p><h2 className="section-title">Escolhe uma prateleira</h2></div>
          <Link href="/collection" className="section-link">Todas as plataformas <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {spotlightPlatforms.map((platform, index) => (
            <Link key={platform.slug} href={`/platform/${platform.slug}`} className={`platform-tile platform-tile-${index + 1} group`}>
              <div className="platform-tile-art"><PlatformArtwork platform={platform.platform} className="h-28 sm:h-32" /></div>
              <div className="flex items-start justify-between gap-2 p-3.5">
                <div className="min-w-0"><h3 className="line-clamp-2 text-sm font-extrabold leading-tight text-slate-900">{displayPlatform(platform.platform)}</h3><p className="mt-1 text-xs text-slate-500">{platform.count} jogos</p></div>
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#214a3d]" />
              </div>
              <div className="platform-progress"><span style={{ width: `${platform.count ? Math.round((platform.audited / platform.count) * 100) : 0}%` }} /></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="archive-bottom-card">
        <div className="archive-bottom-icon"><Boxes className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <p className="section-kicker">A PRÓXIMA DESCOBERTA</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">A coleção não acaba no que já tens.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Consulta os alvos em falta, acompanha os upgrades e mantém as próximas caçadas à distância de um toque.</p>
        </div>
        <Link href="/want" className="hero-action hero-action-primary shrink-0">Ver wantlist <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return <div className="border-r border-white/10 px-5 py-4 last:border-0 sm:px-8 sm:py-5"><p className="text-xl font-black tracking-tight text-white sm:text-2xl">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.15em] text-white/50 sm:text-[11px]">{label}</p></div>;
}
