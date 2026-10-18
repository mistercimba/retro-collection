"use client";
import { useRef, useState } from "react";
import { shouldPauseAfterOutages, type RatingsOverview, type RatingsSource } from "@/lib/ratings-maintenance.logic";
import { beginRatingsMaintenance, enrichNextRatingsGroup } from "@/lib/ratings-maintenance-actions";

const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
export function RatingsMaintenanceRunner({initial,canRun}:{initial:RatingsOverview;canRun:boolean}) {
  const [overview,setOverview]=useState(initial);
  const [source,setSource]=useState<RatingsSource>("hltb");
  const pendingGroups=source==="hltb"?overview.pendingHltbGroups:overview.pendingMetacriticGroups;
  const [running,setRunning]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [completed,setCompleted]=useState(0);
  const [withoutResponse,setWithoutResponse]=useState(0);
  const stop=useRef(false);
  async function start() {
    if(running||!canRun||pendingGroups===0)return;
    const service=source==="hltb"?"HowLongToBeat":"Metacritic (RAWG)";
    if(!window.confirm("Vais atualizar apenas "+service+" na coleção real. Será criado um backup antes de começar. Queres continuar?"))return;
    setRunning(true);stop.current=false;setError("");setCompleted(0);setWithoutResponse(0);
    setMessage("A criar uma cópia de segurança…");
    try {
      const begin=await beginRatingsMaintenance(source);
      setOverview(begin.overview);
      if(!begin.backupPath){setMessage("Já não há jogos desta fonte por atualizar.");return;}
      let updatedAt=begin.updatedAt,processed=0,consecutiveErrors=0;
      let skippedIds:string[]=[];
      let failedGroups=0;
      while(!stop.current) {
        const step=await enrichNextRatingsGroup({backupPath:begin.backupPath,expectedUpdatedAt:updatedAt,source,skippedIds});
        updatedAt=step.updatedAt;
        setOverview(step.overview);
        if ("failure" in step && typeof step.failure === "string") {
          if (step.transient === true && Array.isArray(step.failedIds) && step.failedIds.length) {
            skippedIds=[...new Set([...skippedIds,...step.failedIds])];
            failedGroups++;
            consecutiveErrors++;
            setWithoutResponse(failedGroups);
            setMessage("Sem resposta: "+(step.failedTitle??"jogo atual")+". Ficou pendente; vou continuar com os restantes.");
            if (shouldPauseAfterOutages(consecutiveErrors)) {
              setError("Três jogos seguidos sem resposta do HowLongToBeat. Parei para não sobrecarregar o serviço. Podes tentar novamente mais tarde.");
              break;
            }
            if(stop.current)break;
            await sleep(2000+Math.floor(Math.random()*1001));
            continue;
          }
          setError(step.failure);
          setMessage("Atualização interrompida. Nenhum resultado vazio foi gravado para o jogo com erro.");
          break;
        }
        consecutiveErrors=0;
        if(step.processed) {
          processed++;setCompleted(processed);
          setMessage("Atualizado: "+step.processed.title+" ("+step.processed.platform+")");
        }
        if(step.done){
          setMessage(failedGroups
            ?"Passagem terminada para os jogos que responderam. "+failedGroups+" jogos ficaram pendentes por timeout e poderão ser tentados numa próxima sessão."
            :"Concluído! Os resultados estão guardados.");
          break;
        }
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
      {overview.pendingGroups} pesquisas distintas por fazer no total.
      {overview.attemptedWithoutBoth>0?" "+overview.attemptedWithoutBoth+" cópias foram consultadas, mas não têm ambos os valores.":""}
    </p>
    <div className="space-y-2">
      <p className="text-sm font-bold text-slate-700">Escolhe que valores queres atualizar:</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Fonte para atualizar">
        <button type="button" disabled={running} aria-pressed={source==="hltb"}
          onClick={()=>{setSource("hltb");setMessage("");setError("");}}
          className={`rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50 ${source==="hltb"?"border-[#17382e] bg-[#17382e] text-white":"border-[#c9d3ca] bg-white text-[#17382e]"}`}>
          HowLongToBeat ({overview.pendingHltbGroups} pesquisas)
        </button>
        <button type="button" disabled={running} aria-pressed={source==="metacritic"}
          onClick={()=>{setSource("metacritic");setMessage("");setError("");}}
          className={`rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50 ${source==="metacritic"?"border-[#17382e] bg-[#17382e] text-white":"border-[#c9d3ca] bg-white text-[#17382e]"}`}>
          Metacritic / RAWG ({overview.pendingMetacriticGroups} pesquisas)
        </button>
      </div>
      <p className="text-sm text-slate-600">{source==="hltb"
        ?"Só serão consultados e guardados tempos HowLongToBeat. A RAWG não será contactada. Se um jogo não responder após uma segunda tentativa, fica pendente e a atualização segue para o próximo."
        :"Só serão consultadas pontuações via RAWG. Se a RAWG falhar, esta atualização pára; os tempos HowLongToBeat não são afetados."}</p>
    </div>
    {!canRun&&<p className="text-sm font-semibold text-amber-800">Este Preview é apenas para consulta. A atualização só pode ser iniciada na aplicação principal.</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={running||!canRun||pendingGroups===0} onClick={start}
        className="min-h-11 rounded-xl bg-[#17382e] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
        {running?"A atualizar…":source==="hltb"?"Atualizar HowLongToBeat":"Atualizar Metacritic"}
      </button>
      {running&&<button type="button" onClick={()=>{stop.current=true;setMessage("A terminar o jogo atual antes de parar…");}}
        className="min-h-11 rounded-xl border border-[#d5d1c5] px-5 text-sm font-bold text-slate-700">Pausar</button>}
    </div>
    {(running||completed>0||withoutResponse>0)&&<p role="status" className="text-sm font-semibold text-slate-700">
      {completed} pesquisas concluídas nesta sessão · {withoutResponse} sem resposta (continuam pendentes).
      {running?" Mantém esta página aberta enquanto decorre a atualização.":""}
    </p>}
    {message&&<p role="status" className="text-sm text-slate-700">{message}</p>}
    {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-900">{error}</p>}
  </div>;
}
