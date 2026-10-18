"use client";
import { useState } from "react";
import { repairKnownCastlevaniaHltb } from "@/lib/hltb-collision-repair-actions";
import type { KnownHltbCollision } from "@/lib/hltb-id-integrity.logic";

export function HltbCollisionRepair({ candidates, canRepair }:{
  candidates: KnownHltbCollision[]; canRepair: boolean;
}) {
  const [working,setWorking]=useState(false);
  const [error,setError]=useState("");
  if (!candidates.length) return null;

  async function repair(candidate:KnownHltbCollision) {
    if(working||!canRepair)return;
    const confirmed=window.confirm(
      "Atenção: vais retirar o ID HowLongToBeat errado e as "+candidate.savedHours+
      " horas guardadas de "+candidate.title+". Será criado um backup privado. "+
      "O tempo ficará por confirmar até uma nova pesquisa. Não alteramos o Zelda. Confirmas?"
    );
    if(!confirmed)return;
    setWorking(true);setError("");
    try {
      await repairKnownCastlevaniaHltb(candidate.collectionId);
      window.location.reload();
    } catch(e) {
      setError(e instanceof Error?e.message:"Não foi possível corrigir esta associação.");
      setWorking(false);
    }
  }
  return <section className="collection-panel space-y-3 p-5">
    <h2 className="text-base font-black text-slate-900">Referência HowLongToBeat incorreta</h2>
    <p className="text-sm leading-6 text-slate-700">
      Identificámos um ID partilhado por dois jogos diferentes. A referência
      do Castlevania está incorreta; o tempo também pode estar errado.
      Não vamos substituir horas sem confirmação.
    </p>
    {candidates.map(candidate=><div key={candidate.collectionId} className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-black text-slate-900">{candidate.title} · {candidate.platform} ({candidate.collectionId})</p>
      <p className="text-sm text-slate-700">
        ID errado: {candidate.wrongId} · Tempo a rever: {candidate.savedHours} h.
        Este ID pertence a {candidate.otherTitle}.
      </p>
      <button type="button" disabled={!canRepair||working} onClick={()=>repair(candidate)}
        className="min-h-11 rounded-xl bg-[#17382e] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
        {working?"A guardar backup e corrigir…":"Retirar associação errada (com backup)"}
      </button>
    </div>)}
    {!canRepair&&<p className="text-xs font-semibold text-amber-800">
      Preview apenas de consulta. A correção só pode ser feita na aplicação principal, depois do merge.
    </p>}
    {error&&<p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
  </section>;
}
