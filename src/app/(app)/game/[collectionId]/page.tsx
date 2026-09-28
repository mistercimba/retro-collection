import Link from "next/link";
import { ArrowLeft, BadgeEuro, Clock3, ShieldAlert, Star, Tag } from "lucide-react";
import { notFound } from "next/navigation";
import { GameArtwork } from "@/components/artwork";
import { MarketSearchLinks } from "@/components/market-search-links";
import { StatusPill } from "@/components/status-pill";
import { getGame } from "@/lib/data/collection-service";
import { isAuditCompleted } from "@/lib/data/collection-integrity";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";
import { getGameResearch } from "@/lib/game-research";
import { getBestPlaytime } from "@/lib/playtime-summary.logic";
import { getSafeListReturnPath, listReturnLabel } from "@/lib/list-url-state.logic";

export default async function GamePage({ params, searchParams }: { params: Promise<{ collectionId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ collectionId }, query] = await Promise.all([params, searchParams]);
  const game = await getGame(decodeURIComponent(collectionId));
  if (!game) notFound();
  const returnTo = getSafeListReturnPath(query.from) ?? "/collection/games";
  const returnLabel = listReturnLabel(returnTo, [game.platform]);
  const research = await getGameResearch(game);
  const metadata = research.metadata;
  const bestPlaytime = getBestPlaytime(metadata?.timeToBeat);
  const playtimeMissing = "Sem dados no IGDB";
  const missingComponents = game.audit?.missingComponents?.trim() ?? "";
  const hasMissingComponents = Boolean(missingComponents && !/^(none|no|n\/a|—)$/i.test(missingComponents));
  const attention = game.needsReview || hasMissingComponents || /pending|review|rever/i.test(game.audit?.auditStatus ?? "");
  const auditLabel = game.audit?.auditStatus
    ? isAuditCompleted(game.audit.auditStatus) ? "Auditada" : game.audit.auditStatus
    : "Sem auditoria registada";
  const auditLabelWithDate = game.audit?.auditDate ? `${auditLabel} · ${game.audit.auditDate}` : auditLabel;
  const copyAndAuditRows: [string, string][] = [
    ["Completude", game.overallStatus], ["Condição", game.conditionGrade], ["Media", game.media], ["Caixa", game.box], ["Manual", game.manual], ["Extras", game.extras], ["Label", game.label], ["Selado", game.sealed],
    ["Auditoria física", game.audit?.auditStatus || "Sem auditoria registada"], ["Data da auditoria", game.audit?.auditDate || ""], ["Funcional", game.audit?.functionalStatus || ""], ["Código do produto", game.audit?.productCode || ""], ["Componentes em falta", game.audit?.missingComponents || ""],
  ];
  const catalogRows: [string, string][] = [
    ["Género", metadata?.genres.join(", ") || "Não disponível"], ["Lançamento", metadata?.firstReleaseDate || "Não disponível"], ["Estúdio", metadata?.developers.join(", ") || "Não disponível"], ["Editora", metadata?.publishers.join(", ") || "Não disponível"], ["Modos", metadata?.gameModes.join(", ") || "Não disponível"], ["Temas", metadata?.themes.join(", ") || "Não disponível"],
  ];

  return <div className="mx-auto max-w-5xl space-y-4 pb-6">
    <Link href={returnTo} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-800"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />{returnLabel}</Link>
    <header className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3.5 sm:gap-5 sm:p-5">
      <GameArtwork collectionId={game.collectionId} title={game.title} platform={game.platform} className="h-32 w-24 shrink-0 rounded-xl bg-slate-50 sm:h-40 sm:w-28" eager />
      <div className="min-w-0 flex-1"><div className="flex flex-wrap gap-1.5"><StatusPill tone={game.keepStatus === "Collection" ? "good" : game.keepStatus === "Sell" ? "bad" : "neutral"}>{displayKeepStatus(game.keepStatus)}</StatusPill>{game.needsReview && <StatusPill tone="warn">A rever</StatusPill>}</div><p className="mt-2 text-[10px] font-black uppercase tracking-[.14em] text-emerald-800">{displayPlatform(game.platform)}</p><h1 className="mt-1 text-xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">{game.title}</h1><p className="mt-1 truncate font-mono text-[10px] text-slate-400">{game.collectionId}</p><div className="mt-2 flex flex-wrap gap-1.5">{[game.region, game.edition, game.overallStatus].filter(Boolean).map((item) => <StatusPill key={item}>{item}</StatusPill>)}</div></div>
    </header>

    <section aria-label="Resumo do jogo" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Metric icon={<BadgeEuro />} label="Valor estimado" value={research.estimate.value === null ? "Não disponível" : formatEuro(research.estimate.value)} detail={research.estimate.basis ? `${research.estimate.basis} · ${research.estimate.date || "snapshot"}` : "PriceCharting PAL"} />
      <Metric icon={<Tag />} label="Género" value={metadata?.genres.join(", ") || "Não disponível"} detail="Catálogo · IGDB" />
      <Metric icon={<Star />} label="Metascore" value={research.metascore.value === null ? "Não disponível" : `${research.metascore.value}/100`} detail={research.metascore.value === null ? "RAWG / Metacritic" : "RAWG / Metacritic"} />
      <Metric icon={<Clock3 />} label="Duração" value={bestPlaytime?.value ?? playtimeMissing} detail={bestPlaytime ? `${bestPlaytime.category} · IGDB` : "Sem duração publicada no IGDB"} />
    </section>

    <section aria-label="Estado físico da cópia" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
      <span className="mr-1 text-xs font-black text-slate-700">Estado físico</span>
      <StatusPill tone={/incomplete|incompleto/i.test(game.overallStatus) ? "warn" : "neutral"}>{game.overallStatus || "Completude não registada"}</StatusPill>
      <StatusPill>{game.conditionGrade || "Condição não registada"}</StatusPill>
      <StatusPill tone={attention ? "warn" : isAuditCompleted(game.audit?.auditStatus) ? "good" : "neutral"}>{auditLabelWithDate}</StatusPill>
      {game.needsReview && <StatusPill tone="warn">A rever</StatusPill>}
      {hasMissingComponents && <span className="text-xs font-bold text-rose-700">Falta: {missingComponents}</span>}
      {!hasMissingComponents && missingComponents && <span className="text-xs text-slate-600">Sem componentes em falta</span>}
    </section>

    <Section title="Preço e aquisição" icon={<BadgeEuro className="h-4 w-4" />}>
      <CompactRows rows={[
        ["Estimativa atual", research.estimate.value === null ? "Não disponível" : formatEuro(research.estimate.value)], ["Fonte / condição", [research.estimate.source, research.estimate.basis].filter(Boolean).join(" · ") || "Não disponível"], ["Snapshot", research.estimate.date || "Não disponível"],
        ["Último valor da coleção", game.latestValuation?.valueEur !== null && game.latestValuation?.valueEur !== undefined ? formatEuro(game.latestValuation.valueEur) : "Não registado"], ["CeX cash registado", formatEuro(game.cexCashEur)], ["Custo alocado", formatEuro(game.allocatedCostEur)],
        ...(game.purchase ? [["Compra", `${game.purchase.date || "Data n/d"} · ${game.purchase.source || game.purchase.purchaseId}`] as [string, string], ["Total pago", formatEuro(game.purchase.totalPaidEur)] as [string, string]] : []),
      ]} />
      {research.estimate.productUrl && <a className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline" href={research.estimate.productUrl} target="_blank" rel="noreferrer">Produto PAL no PriceCharting <ArrowLeft className="h-3 w-3 rotate-180" /></a>}
      {game.purchase?.listingUrl && <a className="ml-3 mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline" href={game.purchase.listingUrl} target="_blank" rel="noreferrer">Anúncio original <ArrowLeft className="h-3 w-3 rotate-180" /></a>}
    </Section>

    <Section title="Catálogo" icon={<Tag className="h-4 w-4" />}>
      {metadata?.summary && <p className="mb-3 text-xs leading-5 text-slate-600">{metadata.summary}</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{catalogRows.map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 break-words text-xs font-semibold text-slate-800">{value}</p></div>)}</div>
      {!metadata && <p className="mt-2 text-[11px] text-slate-500">Metadata IGDB: {research.metadataState === "ambiguous" ? "correspondência ambígua" : research.metadataState === "unmatched" ? "sem correspondência segura" : research.metadataState === "not-configured" ? "credenciais não configuradas" : "indisponível"}.</p>}
      {metadata?.refreshedAt && <p className="mt-2 text-[10px] text-slate-400">IGDB · atualizado {metadata.refreshedAt.slice(0, 10)}.</p>}
      <details className="mt-3 border-t border-slate-100 pt-2">
        <summary className="cursor-pointer text-xs font-bold text-slate-600">Duração e avaliação IGDB</summary>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
          <span>Main Story: <strong>{metadata?.timeToBeat?.main || playtimeMissing}</strong></span>
          <span>Main + Extras: <strong>{metadata?.timeToBeat?.extras || playtimeMissing}</strong></span>
          <span>Completionist: <strong>{metadata?.timeToBeat?.completionist || playtimeMissing}</strong></span>
          {metadata?.aggregatedRating !== null && metadata?.aggregatedRating !== undefined && <span>IGDB rating: <strong>{metadata.aggregatedRating.toFixed(1)}/100</strong></span>}
        </div>
      </details>
    </Section>

    <details open={attention} className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700"><ShieldAlert className="h-4 w-4" aria-hidden="true" />Estado da cópia e auditoria{attention ? " · requer atenção" : ""}</summary>
      <div className="mt-3">
        <CompactRows rows={copyAndAuditRows} emphasize="Componentes em falta" />
        {game.audit?.auditNotes && <details className="mt-3 border-t border-slate-100 pt-2"><summary className="cursor-pointer text-xs font-bold text-slate-600">Notas da auditoria</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{game.audit.auditNotes}</p></details>}
      </div>
    </details>

    <section className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black text-slate-950">Pesquisar em</p><p className="text-[10px] text-slate-500">Atalhos para preço e mercado</p></div><MarketSearchLinks title={game.title} platform={game.platform} compact /></div></section>

    <details className="rounded-2xl border border-slate-200 bg-white p-3.5"><summary className="cursor-pointer text-sm font-bold text-slate-700">Detalhes técnicos e notas{attention ? " · requer atenção" : ""}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><CompactRows rows={[["Catalog ID", game.catalogId], ["Idioma", game.language], ["Tipo", game.itemType], ["Data de aquisição", game.acquiredDate], ["Collection ID", game.collectionId], ["Região", game.region], ["Edição", game.edition]]} />{game.notes && <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Notas da coleção</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{game.notes}</p></div>}</div></details>
  </div>;
}

function displayKeepStatus(status: string): string {
  if (status === "Collection") return "Na coleção";
  if (status === "Sell") return "Para vender";
  if (status === "Sold") return "Vendidos";
  return status;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{icon}<span>{label}</span></div><p className="mt-1 truncate text-base font-black tracking-tight text-slate-950 sm:text-lg">{value}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{detail}</p></div>;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5"><h2 className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-950">{icon}<span>{title}</span></h2>{children}</section>;
}

function CompactRows({ rows, emphasize }: { rows: [string, string][]; emphasize?: string }) {
  const visible = rows.filter(([, value]) => value && value !== "—" && value !== "Unknown");
  if (!visible.length) return <p className="text-xs text-slate-500">Sem informação registada.</p>;
  return <dl className="grid gap-x-4 sm:grid-cols-2">{visible.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(6.5rem,.8fr)_minmax(0,1.2fr)] gap-2 border-b border-slate-100 py-1.5 text-xs last:border-0"><dt className="font-semibold text-slate-500">{label}</dt><dd className={`min-w-0 break-words text-slate-900 ${label === emphasize && value.toLowerCase() !== "none" ? "font-bold text-rose-700" : ""}`}>{value}</dd></div>)}</dl>;
}
