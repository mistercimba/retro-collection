import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadHltbRepairBackupDiff } from "@/lib/hltb-repair-backup-diff.node";

export const metadata = {
  title: "Auditoria da reparação HowLongToBeat",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const show = (value: number | string | null | undefined) => value === null || value === undefined ? "—" : String(value);
function describe(fields: {hours:number|null;gameId:string|null;status:string|null;lookupVersion:number|null;owned:boolean}|null) {
  if (!fields) return "Cópia inexistente";
  return `${fields.owned ? "Collection" : "Fora da coleção"} · ${show(fields.hours)} h · ID ${show(fields.gameId)} · ${show(fields.status)} · rev. ${show(fields.lookupVersion)}`;
}

export default async function HltbRepairAuditPage() {
  let report: Awaited<ReturnType<typeof loadHltbRepairBackupDiff>> = null;
  let error = "";
  try {
    report = await loadHltbRepairBackupDiff();
  } catch {
    // Never expose backup paths or raw data via error pages/logs.
    error = "Não foi possível validar ou ler o backup privado. Nenhum dado foi alterado.";
  }
  return <div className="mx-auto max-w-3xl space-y-5 pb-10">
    <Link href="/history" className="inline-flex items-center gap-2 text-sm font-bold text-[#315b47]"><ArrowLeft className="h-4 w-4"/>Voltar ao histórico</Link>
    <header className="collection-hero">
      <p className="eyebrow">DIAGNÓSTICO PRIVADO · SÓ LEITURA</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Antes e depois da reparação HLTB</h1>
      <p className="mt-2 text-sm text-slate-600">Compara o backup privado efetivamente criado antes da reparação com a biblioteca atual, por cópia física. Não faz pesquisas externas, restauros ou gravações.</p>
    </header>
    {error ? <p role="alert" className="collection-panel p-5 text-sm font-semibold text-red-800">{error}</p> :
      !report ? <section className="collection-panel p-5 text-sm text-slate-700">Ainda não existe uma reparação HLTB registada no Histórico.</section> :
      <>
        <section className="collection-panel space-y-4 p-5">
          <p className="text-sm text-slate-600">Backup criado para <strong>{report.repairTitle}</strong> em {new Date(report.repairAt).toLocaleString("pt-PT", {timeZone:"Europe/Lisbon"})}. A biblioteca atual foi guardada em {new Date(report.comparedAt).toLocaleString("pt-PT", {timeZone:"Europe/Lisbon"})}.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#deddd5] bg-white p-3"><p className="text-xs font-bold text-slate-600">HLTB no backup</p><p className="mt-1 text-2xl font-black tabular-nums">{report.beforeCount}</p></div>
            <div className="rounded-lg border border-[#deddd5] bg-white p-3"><p className="text-xs font-bold text-slate-600">HLTB agora</p><p className="mt-1 text-2xl font-black tabular-nums">{report.afterCount}</p></div>
            <div className="rounded-lg border border-[#deddd5] bg-white p-3"><p className="text-xs font-bold text-slate-600">Diferença real</p><p className="mt-1 text-2xl font-black tabular-nums">{report.delta > 0 ? "+" : ""}{report.delta}</p></div>
          </div>
          <p className="text-xs leading-5 text-slate-600">Estas contagens vêm de dois ficheiros do Blob, não da screenshot do Preview (331). Uma diferença anterior entre Preview e produção não prova uma segunda reparação.</p>
        </section>
        <section className="collection-panel space-y-3 p-5">
          <h2 className="text-base font-black text-slate-950">Registos com alterações HLTB ({report.changes.length})</h2>
          {!report.changes.length ? <p className="text-sm text-slate-600">Não existem alterações HLTB nas cópias da coleção entre os dois ficheiros.</p> :
          <div className="divide-y divide-[#e7e3db]">
            {report.changes.map(change=><div key={change.collectionId} className="space-y-2 py-3">
              <p className="text-sm font-bold text-slate-950">{change.title} <span className="font-normal text-slate-600">· {change.platform} · {change.collectionId}</span></p>
              <p className="text-xs text-slate-600"><strong>Antes:</strong> {describe(change.before)}</p>
              <p className="text-xs text-slate-600"><strong>Agora:</strong> {describe(change.after)}</p>
            </div>)}
          </div>}
        </section>
      </>}
  </div>;
}
