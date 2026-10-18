import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getFreshLibrary } from "@/lib/library-store";
import { ratingsOverview } from "@/lib/ratings-maintenance.logic";
import { RatingsMaintenanceRunner } from "@/components/ratings-maintenance-runner";
import { HltbCollisionRepair } from "@/components/hltb-collision-repair";
import { findKnownCastlevaniaCollision } from "@/lib/hltb-id-integrity.logic";

export const metadata={title:"Atualizar tempos e pontuações"};
export const maxDuration=60;

export default async function RatingsMaintenancePage() {
  const library=await getFreshLibrary();
  return <div className="mx-auto max-w-3xl space-y-5 pb-10">
    <Link href="/history" className="inline-flex items-center gap-2 text-sm font-bold text-[#315b47]"><ArrowLeft className="h-4 w-4"/>Voltar ao histórico</Link>
    <header className="collection-hero">
      <p className="eyebrow">MANUTENÇÃO DA COLEÇÃO</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Tempos e pontuações</h1>
      <p className="mt-2 text-sm text-slate-600">Consulta os tempos de jogo no HowLongToBeat ou as pontuações Metacritic (via RAWG), de forma independente.</p>
    </header>
    <section className="collection-panel p-5">
      <RatingsMaintenanceRunner initial={ratingsOverview(library.collection)} canRun={process.env.VERCEL_ENV==="production"}/>
    </section>
    <HltbCollisionRepair candidates={findKnownCastlevaniaCollision(library.collection)} canRepair={process.env.VERCEL_ENV==="production"}/>
    <p className="text-xs leading-5 text-slate-500">Apenas o botão «Atualizar» modifica a coleção, depois de confirmação. Antes de começar é criado um backup privado. Escolhe primeiro HowLongToBeat para continuar a recolher tempos sem depender da RAWG. A atualização da RAWG pode ser feita mais tarde. Os jogos são processados com pausas; um timeout isolado não faz perder os resultados anteriores. Após três falhas seguidas, a atualização pára para proteger o serviço. Podes parar e retomar.</p>
  </div>;
}
