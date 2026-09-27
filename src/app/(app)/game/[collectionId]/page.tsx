import Link from "next/link";
import { ArrowLeft, BadgeEuro, PackageCheck, ShieldAlert, Tag } from "lucide-react";
import { notFound } from "next/navigation";
import { GameArtwork } from "@/components/artwork";
import { MarketSearchLinks } from "@/components/market-search-links";
import { StatusPill } from "@/components/status-pill";
import { getGame } from "@/lib/data/collection-service";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import { getGameResearch } from "@/lib/game-research";

export default async function GamePage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  const game = await getGame(decodeURIComponent(collectionId));
  if (!game) notFound();
  const research = await getGameResearch(game);
  const metadata = research.metadata;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/collection" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div>
          <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} className="aspect-[3/4] rounded-[1.6rem] shadow-sm ring-1 ring-slate-200" eager />
          <p className="mt-2 text-center text-[11px] text-slate-400">Capa PAL guardada localmente no projeto.</p>
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={game.keepStatus === "Collection" ? "good" : game.keepStatus === "Sell" ? "bad" : "neutral"}>{game.keepStatus}</StatusPill>
            {game.needsReview && <StatusPill tone="warn">A rever</StatusPill>}
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-blue-700">{displayPlatform(game.platform)}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{game.title}</h1>
          <p className="mt-2 font-mono text-xs text-slate-500">{game.collectionId}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {game.edition && <StatusPill>{game.edition}</StatusPill>}
            {game.region && <StatusPill>{game.region}</StatusPill>}
            {game.overallStatus && <StatusPill tone={game.overallStatus.toLowerCase().includes("incomplete") ? "warn" : "blue"}>{game.overallStatus}</StatusPill>}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Section title="Sobre o jogo" icon={<Tag />}>
          {metadata?.matchStatus === "matched" ? <>
            {metadata.summary && <p className="mb-4 text-sm leading-6 text-slate-700">{metadata.summary}</p>}
            <Rows rows={[
              ["Género", metadata.genres.join(", ") || "Não disponível"],
              ["Lançamento original", metadata.firstReleaseDate],
              ["Estúdio", metadata.developers.join(", ")],
              ["Editora", metadata.publishers.join(", ")],
              ["Modos", metadata.gameModes.join(", ")],
              ["Temas", metadata.themes.join(", ")],
              ["Nota agregada IGDB", metadata.aggregatedRating === null ? "" : `${metadata.aggregatedRating.toFixed(1)} / 100 (${metadata.aggregatedRatingCount} críticas)`],
              ["Nota dos utilizadores IGDB", metadata.userRating === null ? "" : `${metadata.userRating.toFixed(1)} / 100 (${metadata.userRatingCount} votos)`],
              ["A tua avaliação", "Não registada na Sheet"],
              ["Main Story", metadata.timeToBeat.main || "Não disponível"],
              ["Main + Extras", metadata.timeToBeat.extras || "Não disponível"],
              ["Completionist", metadata.timeToBeat.completionist || "Não disponível"],
            ]} />
            <p className="mt-3 text-xs leading-5 text-slate-500">Dados de catálogo IGDB; a nota agregada não é o Metascore. Atualizado em {metadata.refreshedAt.slice(0, 10)}.</p>
          </> : <div className="space-y-3"><p className="text-sm leading-6 text-slate-600">{research.metadataState === "ambiguous" ? "Há mais do que uma ficha IGDB válida para este título e plataforma; não associei dados para evitar informação errada." : research.metadataState === "unmatched" ? "Não foi encontrada correspondência segura no IGDB para esta plataforma." : research.metadataState === "not-configured" ? "Metadata IGDB indisponível: faltam as credenciais de API no servidor." : research.metadataState === "unavailable" ? "IGDB está temporariamente indisponível; não associei metadata a este jogo." : "Metadata IGDB indisponível."} Os atalhos de pesquisa abaixo continuam disponíveis.</p><a className="text-sm font-bold text-blue-700 underline underline-offset-2" href={`https://www.igdb.com/search?type=1&q=${encodeURIComponent(game.title)}`} target="_blank" rel="noreferrer">Pesquisar catálogo IGDB</a><Rows rows={[["A tua avaliação", "Não registada na Sheet"]]} /></div>}
          <div className="mt-4 border-t border-slate-100 pt-3"><Rows rows={[["Metascore", research.metascore.value === null ? "Não disponível" : `${research.metascore.value} / 100`], ["Fonte", research.metascore.source]]} />{research.metascore.value !== null && <a href={research.metascore.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-blue-700 underline">Ver Metacritic</a>}<p className="mt-2 text-[11px] text-slate-500">Dados Metacritic fornecidos por <a className="underline" href="https://rawg.io/" target="_blank" rel="noreferrer">RAWG</a>.</p></div>
        </Section>

        <Section title="Estado da cópia" icon={<PackageCheck />}>
          <Rows rows={[["Condição", game.conditionGrade],["Media", game.media],["Caixa", game.box],["Manual", game.manual],["Extras", game.extras],["Label", game.label],["Selado", game.sealed]]} />
        </Section>

        <Section title="Preço e aquisição" icon={<BadgeEuro />}>
          <Rows rows={[["Valor estimado atual", research.estimate.value === null ? "Não disponível" : formatEuro(research.estimate.value)], ["Fonte", research.estimate.source], ["Condição comparada", research.estimate.basis || "Não disponível"], ["Data do snapshot", research.estimate.date || "Não disponível"], ...(game.latestValuation?.valueEur !== null && game.latestValuation?.valueEur !== undefined ? [["Último valor registado na coleção", formatEuro(game.latestValuation.valueEur)] as [string, string]] : []), ["CeX cash registado", formatEuro(game.cexCashEur)],["Custo alocado", formatEuro(game.allocatedCostEur)]]} />
          {research.estimate.productUrl && <a className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700 underline underline-offset-2" href={research.estimate.productUrl} target="_blank" rel="noreferrer">Abrir produto PAL no PriceCharting <ArrowLeft className="h-3 w-3 rotate-180" /></a>}
          {game.purchase && <div className="mt-4 border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-black uppercase tracking-[.12em] text-slate-500">Compra registada · {game.purchase.purchaseId}</p><Rows rows={[["Data", game.purchase.date],["Origem", game.purchase.source],["Total pago", formatEuro(game.purchase.totalPaidEur)],["Lote", game.purchase.bundleId]]} />{game.purchase.listingUrl && <a className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700" href={game.purchase.listingUrl} target="_blank" rel="noreferrer">Abrir anúncio original <ArrowLeft className="h-3 w-3 rotate-180" /></a>}</div>}
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">O valor usa o snapshot PAL validado do PriceCharting, com condição compatível e conversão USD → EUR pela taxa do BCE. Sem match seguro, não calculo uma estimativa.</p>
        </Section>

        {game.audit && (
          <Section title="Auditoria física" icon={<ShieldAlert />}>
            <Rows rows={[["Código", game.audit.productCode],["Estado da auditoria", game.audit.auditStatus],["Funcional", game.audit.functionalStatus],["Media", game.audit.mediaCondition],["Label", game.audit.labelCondition],["Caixa", game.audit.boxCondition],["Manual", game.audit.manualCondition],["Packaging", game.audit.packaging],["Línguas observadas", game.audit.observedLanguages],["Componentes em falta", game.audit.missingComponents]]} emphasize="Componentes em falta" />
          </Section>
        )}

        <Section title="Identificação" icon={<Tag />}>
          <Rows rows={[["Catalog ID", game.catalogId],["Região", game.region],["Idioma", game.language],["Tipo", game.itemType],["Data de aquisição", game.acquiredDate]]} />
        </Section>

        <section className="market-research-panel lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="section-kicker">PESQUISA DO JOGO</p><h2 className="section-title">Preço, críticas e duração</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Atalhos para comparar anúncios e consultar género, notas e tempo de jogo. Cada fonte abre a pesquisa deste título e consola.</p></div>
            <span className="panel-icon"><Tag className="h-5 w-5" /></span>
          </div>
          <div className="mt-5"><MarketSearchLinks title={game.title} platform={game.platform} /></div>
          <p className="mt-3 text-[11px] leading-5 text-slate-400">As pesquisas externas podem devolver edições e regiões diferentes. Valida a correspondência PAL antes de usar um anúncio como comparável.</p>
        </section>
      </div>

      {(game.notes || game.audit?.auditNotes) && (
        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-950">Notas</h2>
          {game.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{game.notes}</p>}
          {game.audit?.auditNotes && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Audit log</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{game.audit.auditNotes}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 font-black text-slate-950 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-blue-700">
        {icon}
        <h2>{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Rows({ rows, emphasize }: { rows: [string, string][]; emphasize?: string }) {
  const useful = rows.filter(([, value]) => value && value !== "—" && value !== "Unknown");
  if (!useful.length) return <p className="text-sm text-slate-500">Sem informação registada.</p>;

  return (
    <dl className="divide-y divide-slate-100">
      {useful.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[130px_1fr] gap-3 py-2.5 text-sm">
          <dt className="font-semibold text-slate-500">{label}</dt>
          <dd className={`text-slate-900 ${label === emphasize && value.toLowerCase() !== "none" ? "font-bold text-rose-700" : ""}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
