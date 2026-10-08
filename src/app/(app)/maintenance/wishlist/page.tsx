import Link from "next/link";
import { notFound } from "next/navigation";
import { authEnabled, requireAuth } from "@/lib/auth";
import { getFreshLibrary } from "@/lib/library-store";
import { buildWishlistMaintenancePreflight } from "@/lib/wishlist-maintenance-preflight.logic";
import type {
  WishlistMaintenanceLibrary,
  WishlistMaintenancePlan,
} from "../../../../../scripts/wishlist-maintenance-logic.mjs";
import plan from "../../../../../data/wishlist-maintenance-2026-10-08.json";
import { CopyWishlistPreflight } from "@/components/copy-wishlist-preflight";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Simulação de manutenção da Wishlist",
  robots: { index: false, follow: false },
};

export default async function WishlistMaintenancePreflightPage() {
  // Authentication in this app is optional by default. This internal page
  // must fail closed if APP_PASSWORD is not configured for this environment.
  if (!authEnabled()) notFound();
  await requireAuth();

  // No persistent cache, no mutation and no write-capable controls on this page.
  const library = await getFreshLibrary();
  const report = buildWishlistMaintenancePreflight(
    library as unknown as WishlistMaintenanceLibrary,
    plan as WishlistMaintenancePlan,
  );
  const reportText = JSON.stringify(report, null, 2);

  return <div className="mx-auto max-w-4xl space-y-5 pb-10">
    <Link href="/want" className="text-xs font-bold text-slate-500 hover:text-emerald-800">← Voltar à Wishlist</Link>
    <header className="collection-hero">
      <p className="eyebrow text-emerald-800">VERIFICAÇÃO SEM ALTERAÇÕES · ISSUE #62</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Simulação da limpeza</h1>
      <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
        Esta página lê a Wishlist real e mostra o que aconteceria. Não apaga, não altera, não guarda nada.
      </p>
    </header>
    <section className="collection-panel space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className={report.safeToApply
          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900"
          : "rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900"}>
          {report.safeToApply ? "Simulação sem bloqueios" : "Foram encontrados bloqueios"}
        </span>
        <span className="text-sm font-semibold text-slate-600">
          {report.sourceWishlistCount} jogos atuais
          {report.estimatedWishlistCount !== null ? " → " + report.estimatedWishlistCount + " após a limpeza" : ""}
        </span>
      </div>
      <p className="text-xs font-semibold text-slate-500">Dados atuais: {report.sourceUpdatedAt}</p>
      {report.collidingTargetIds.length > 0 && <p className="text-sm font-semibold text-amber-800">
        Atenção: {report.collidingTargetIds.length} identificadores repetidos; o mais frequente é
        {" "}{report.collidingTargetIds[0].targetId} ({report.collidingTargetIds[0].count} jogos).
      </p>}
      <p className="text-xs font-semibold text-slate-600">
        Próximo objetivo real: {report.nextObjective
          ? report.nextObjective.title + " · " + report.nextObjective.platform
          : "Nenhum"}
      </p>
      <CopyWishlistPreflight report={reportText} />
    </section>
    {report.blockers.length > 0 && <section className="collection-panel space-y-3 p-4">
      <h2 className="text-lg font-black text-amber-900">Atenção: alterações bloqueadas</h2>
      <p className="text-sm font-semibold text-slate-600">Não é seguro executar a limpeza até estes pontos estarem resolvidos.</p>
      {report.blockers.map((blocker, index) => <article key={index} className="border-t border-slate-200 pt-3 text-sm">
        <strong className="text-slate-900">{blocker.title || "Operação " + String(blocker.operationIndex + 1)}</strong>
        <p className="text-slate-600">{blocker.message}</p>
        <p className="text-xs text-slate-500">{blocker.platform} · {blocker.targetId}</p>
      </article>)}
    </section>}
    <section className="collection-panel space-y-2 p-4">
      <h2 className="text-lg font-black text-slate-900">O que está previsto</h2>
      <p className="text-xs font-semibold text-slate-500">Só leitura · não há botão para executar alterações</p>
      {report.operations.map((operation) => <article key={operation.index}
        className="border-t border-[#e2ddd2] py-4 first:border-t-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-slate-900">{operation.index}. {operation.type === "remove" ? "Remover jogo" :
            operation.type === "remove-platform" ? "Remover plataforma" :
            operation.type === "rename" ? "Corrigir título" : "Separar em dois jogos"}</p>
          <span className="text-xs font-bold text-slate-500">{operation.status === "skipped" ? "Já tratado" :
            operation.status === "blocked" ? "Bloqueado" : "Previsto"}</span>
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-500">{operation.platform}</p>
        {operation.existing.length > 0
          ? <ul className="mt-2 space-y-1">{operation.existing.map((target) =>
              <li key={target.targetId} className="text-sm text-slate-700">{target.title} <span className="text-xs text-slate-500">({target.targetId})</span></li>
            )}</ul>
          : <p className="mt-2 text-sm text-slate-500">Nenhum registo atual corresponde a este título.</p>}
        {operation.type === "split" && operation.existing.some((item) => "notes" in item && item.notes) &&
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
            Notas da entrada original: {operation.existing.map((item) => "notes" in item ? item.notes : "").filter(Boolean).join(" · ")}
          </p>}
        {operation.proposedTitles.length > 0 && <p className="mt-2 text-sm font-semibold text-emerald-900">
          → {operation.proposedTitles.join(" · ")}
        </p>}
      </article>)}
    </section>
  </div>;
}
