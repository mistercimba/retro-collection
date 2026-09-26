import Link from "next/link";
import { ArrowLeft, BadgeEuro, PackageCheck, ShieldAlert, Tag } from "lucide-react";
import { notFound } from "next/navigation";
import { PlatformMark } from "@/components/platform-mark";
import { StatusPill } from "@/components/status-pill";
import { getGame } from "@/lib/data/collection-service";
import { displayPlatform } from "@/lib/data/platforms";
import { formatEuro } from "@/lib/format";

export default async function GamePage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  const game = await getGame(decodeURIComponent(collectionId));
  if (!game) notFound();
  return <div className="mx-auto max-w-5xl">
    <Link href="/collection" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-700"><ArrowLeft className="h-4 w-4" />Voltar</Link>
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <PlatformMark platform={game.platform} title={game.title} />
      <div><div className="flex flex-wrap gap-2"><StatusPill tone={game.keepStatus === "Collection" ? "good" : game.keepStatus === "Sell" ? "bad" : "neutral"}>{game.keepStatus}</StatusPill>{game.needsReview && <StatusPill tone="warn">A rever</StatusPill>}</div><p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-blue-700">{displayPlatform(game.platform)}</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{game.title}</h1><p className="mt-2 font-mono text-xs text-slate-500">{game.collectionId}</p><div className="mt-5 flex flex-wrap gap-2">{game.edition && <StatusPill>{game.edition}</StatusPill>}{game.region && <StatusPill>{game.region}</StatusPill>}{game.overallStatus && <StatusPill tone={game.overallStatus.toLowerCase().includes("incomplete") ? "warn" : "blue"}>{game.overallStatus}</StatusPill>}</div></div>
    </div>

    <div className="mt-8 grid gap-5 lg:grid-cols-2">
      <Section title="Estado da cópia" icon={<PackageCheck />}><Rows rows={[["Condição", game.conditionGrade],["Media", game.media],["Caixa", game.box],["Manual", game.manual],["Extras", game.extras],["Label", game.label],["Selado", game.sealed]]} /></Section>
      <Section title="Valor" icon={<BadgeEuro />}><Rows rows={[["Valor registado", formatEuro(game.marketValueEur)],["CeX cash", formatEuro(game.cexCashEur)],["Custo alocado", formatEuro(game.allocatedCostEur)]]} /></Section>
      {game.audit && <Section title="Auditoria física" icon={<ShieldAlert />}><Rows rows={[["Código", game.audit.productCode],["Estado da auditoria", game.audit.auditStatus],["Funcional", game.audit.functionalStatus],["Media", game.audit.mediaCondition],["Label", game.audit.labelCondition],["Caixa", game.audit.boxCondition],["Manual", game.audit.manualCondition],["Packaging", game.audit.packaging],["Línguas observadas", game.audit.observedLanguages],["Componentes em falta", game.audit.missingComponents]]} emphasize="Componentes em falta" /></Section>}
      <Section title="Identificação" icon={<Tag />}><Rows rows={[["Catalog ID", game.catalogId],["Região", game.region],["Idioma", game.language],["Tipo", game.itemType],["Data de aquisição", game.acquiredDate]]} /></Section>
    </div>

    {(game.notes || game.audit?.auditNotes) && <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black text-slate-950">Notas</h2>{game.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{game.notes}</p>}{game.audit?.auditNotes && <div className="mt-4 border-t border-slate-100 pt-4"><p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Audit log</p><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{game.audit.auditNotes}</p></div>}</section>}
  </div>;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 font-black text-slate-950 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-blue-700">{icon}<h2>{title}</h2></div><div className="mt-4">{children}</div></section>; }
function Rows({ rows, emphasize }: { rows: [string, string][]; emphasize?: string }) { const useful = rows.filter(([,value]) => value && value !== "—" && value !== "Unknown"); if (!useful.length) return <p className="text-sm text-slate-500">Sem informação registada.</p>; return <dl className="divide-y divide-slate-100">{useful.map(([label,value]) => <div key={label} className="grid grid-cols-[130px_1fr] gap-3 py-2.5 text-sm"><dt className="font-semibold text-slate-500">{label}</dt><dd className={`text-slate-900 ${label === emphasize && value.toLowerCase() !== "none" ? "font-bold text-rose-700" : ""}`}>{value}</dd></div>)}</dl>; }
