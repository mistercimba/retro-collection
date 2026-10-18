import { missingReasonLabels, type MissingReason, type hltbCoverage } from "../lib/hltb-coverage.logic";

type Report=ReturnType<typeof hltbCoverage>;
export function HltbCoverageDiagnostics({report}:{report:Report}) {
  return <details className="collection-panel p-5">
    <summary className="cursor-pointer text-base font-black text-slate-900">Diagnóstico HowLongToBeat — {report.missingCount} jogos sem tempo</summary>
    <div className="mt-4 space-y-4">
      <p className="text-sm text-slate-600">Apenas resultados já guardados: sem pesquisas externas e sem alterar a coleção. As categorias descrevem o resultado da última pesquisa, não confirmam a disponibilidade do jogo no site.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(Object.entries(missingReasonLabels) as [MissingReason,string][]).map(([key,label])=><div key={key} className="rounded-lg border border-[#deddd5] bg-white p-3">
          <p className="text-xs font-semibold text-slate-600">{label}</p>
          <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{report.counts[key]}</p>
        </div>)}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">Plataformas com mais jogos sem tempo</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {report.byPlatform.filter(p=>p.withoutTime>0).slice(0,10).map(p=><div key={p.platform} className="flex items-center justify-between gap-2 rounded-lg border border-[#deddd5] bg-white px-3 py-2 text-sm">
            <span className="font-bold text-slate-800">{p.platform}</span><span className="tabular-nums text-slate-600">{p.withoutTime} sem / {p.withTime} com</span>
          </div>)}
        </div>
      </div>
      <details className="rounded-lg border border-[#deddd5] bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-900">Ver os {report.missingCount} jogos sem tempo</summary>
        <ul className="mt-2 max-h-80 divide-y divide-[#e7e3db] overflow-y-auto">
          {report.missing.map(g=><li key={g.id} className="py-2 text-sm">
            <p className="font-semibold text-slate-900">{g.title}</p>
            <p className="text-xs text-slate-600">{g.platform} · {g.edition||"Edição não indicada"} · {missingReasonLabels[g.reason]}</p>
          </li>)}
        </ul>
      </details>
      {report.sharedIds.length>0&&<details className="rounded-lg border border-[#deddd5] bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-900">{report.sharedIds.length} IDs HLTB associados a títulos diferentes — verificar</summary>
        <div className="mt-2 space-y-2 text-sm text-slate-700">{report.sharedIds.map(x=><p key={x.id}>HLTB #{x.id}: {x.titles.join(" / ")}</p>)}</div>
        <p className="mt-2 text-xs text-slate-600">Isto não confirma que o valor esteja errado.</p>
      </details>}
    </div>
  </details>;
}
