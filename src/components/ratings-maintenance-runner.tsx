"use client";
import { useRef, useState } from "react";
import type { RatingsOverview } from "@/lib/ratings-maintenance.logic";
import { beginRatingsMaintenance, enrichNextRatingsGroup } from "@/lib/ratings-maintenance-actions";

const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
export function RatingsMaintenanceRunner({initial,canRun}:{initial:RatingsOverview;canRun:boolean}) {
  const [overview,setOverview]=useState(initial);
  const [running,setRunning]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [completed,setCompleted]=useState(0);
  const stop=useRef(false);
  async function start() {
    if(running||!canRun||overview.pendingGroups===0)return;
    if(!window.confirm("Esta operação vai atualizar os dados reais da tua coleção. Primeiro será criado um backup privado. Queres continuar?"))return;
    setRunning(true);stop.current=false;setError("");setCompleted(0);
    setMessage("A criar uma cópia de segurança…");
    try {
      const begin=await beginRatingsMaintenance();
      setOverview(begin.overview);
      if(!begin.backupPath){setMessage("Já não há jogos por atualizar.");return;}
      let updatedAt=begin.updatedAt,processed=0;
      while(!stop.current) {
        const step=await enrichNextRatingsGroup({backupPath:begin.backupPath,expectedUpdatedAt:updatedAt});
        updatedAt=step.updatedAt;
        setOverview(step.overview);
        if(step.processed) {
          processed++;setCompleted(processed);
          setMessage("Atualizado: "+step.processed.title+" ("+step.processed.platform+")");
        }
        if(step.done){setMessage("Concluído! Os resultados estão guardados.");break;}
        if(stop.current)break;
        // The server already spaces out requests within a title.
        // Pause again across titles to avoid bursts.
        await sleep(2000+Math.floor(Math.random()*1001));
      }
      if(stop.current)setMessage("Pausado. O que já foi processado ficou guardado. Podes retomar depois.");
    } catch(e) {
      setError(e instanceof Error?e.message:"Ocorreu um erro.");
      setMessage("Interrompido. Não voltes a iniciar antes de verificares a mensagem de erro.");
    } finally {setRunning(false);}
  }
  const stats=[
    {label:"Jogos na coleção",value:overview.ownedCopies},
    {label:"Com HowLongToBeat",value:overview.hltbKnown},
    {label:"Com Metacritic",value:overview.metacriticKnown},
    {label:"Por processar",value:overview.pendingCopies},
  ];
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(stat=><div key={stat.label} className="rounded-xl border border-[#e1ddcf] bg-white p-3">
        <p className="text-xs font-bold text-slate-500">{stat.label}</p>
        <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{stat.value}</p>
      </div>)}
    </div>
    <p className="text-sm leading-6 text-slate-600">
      {overview.pendingGroups} pesquisas distintas por fazer.
      {overview.attemptedWithoutBoth>0?" "+overview.attemptedWithoutBoth+" cópias foram consultadas, mas não têm ambos os valores.":""}
    </p>
    {!canRun&&<p className="text-sm font-semibold text-amber-800">Este Preview é apenas para consulta. A atualização só pode ser iniciada na aplicação principal.</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={running||!canRun||overview.pendingGroups===0} onClick={start}
        className="min-h-11 rounded-xl bg-[#17382e] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
        {running?"A atualizar…":"Atualizar valores em falta"}
      </button>
      {running&&<button type="button" onClick={()=>{stop.current=true;setMessage("A terminar o jogo atual antes de parar…");}}
        className="min-h-11 rounded-xl border border-[#d5d1c5] px-5 text-sm font-bold text-slate-700">Pausar</button>}
    </div>
    {running&&<p role="status" className="text-sm font-semibold text-slate-700">
      {completed} pesquisas concluídas nesta sessão. Mantém esta página aberta enquanto decorre a atualização.
    </p>}
    {message&&<p role="status" className="text-sm text-slate-700">{message}</p>}
    {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-900">{error}</p>}
  </div>;
}
