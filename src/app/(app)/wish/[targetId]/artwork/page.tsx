import Link from "next/link";
import { ArrowLeft, Check, Images, RotateCcw } from "lucide-react";
import { notFound } from "next/navigation";
import { WishlistArtwork } from "@/components/wishlist-artwork";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { getWantlist } from "@/lib/data/collection-service";
import { displayPlatform } from "@/lib/data/platforms";
import { getSafeListReturnPath } from "@/lib/list-url-state.logic";
import { clearWishlistArtworkOverride, setWishlistArtworkOverride } from "@/lib/library-actions";
import {
  resolveWishlistArtworkCandidates,
  resolveWishlistArtworkOverrideCandidate,
} from "@/lib/wishlist-artwork-candidates.logic";

export default async function WishlistArtworkChoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ targetId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ targetId }, query, targets] = await Promise.all([params, searchParams, getWantlist()]);
  const decodedId = decodeURIComponent(targetId);
  const wantedPlatform = typeof query.platform === "string" ? query.platform : "";
  const wantedTitle = typeof query.title === "string" ? query.title : "";
  const target = targets.find((item) =>
    item.targetId === decodedId &&
    (!wantedPlatform || item.platform === wantedPlatform) &&
    (!wantedTitle || item.title === wantedTitle)
  ) ?? targets.find((item) => item.targetId === decodedId);
  if (!target) notFound();

  const candidates = resolveWishlistArtworkCandidates(target);
  if (candidates.length < 2) notFound();
  const selected = resolveWishlistArtworkOverrideCandidate(target);
  const from = getSafeListReturnPath(query.from) ?? "/want";
  const detailParams = new URLSearchParams({ platform: target.platform, title: target.title, from });
  const detailHref = "/wish/" + encodeURIComponent(target.targetId) + "?" + detailParams.toString();

  return <div className="mx-auto max-w-4xl space-y-5 pb-10">
    <Link href={detailHref} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#17382e]">
      <ArrowLeft className="h-3.5 w-3.5" />Voltar ao jogo
    </Link>

    <header className="collection-hero">
      <p className="eyebrow text-amber-700">ARTWORK AMBÍGUO</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Escolher capa</h1>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        {target.title} · {displayPlatform(target.platform)}. Encontrámos {candidates.length} opções plausíveis e não vamos adivinhar por ti.
      </p>
    </header>

    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex gap-3">
        <Images className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <p className="text-xs font-semibold leading-5 text-amber-950">
          Estas imagens só são carregadas nesta página de escolha. Depois de escolheres uma, a app guarda uma cópia privada e passa a servi-la localmente. A escolha manual tem prioridade sobre o automático.
        </p>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2">
      {candidates.map((candidate) => {
        const isSelected = selected?.id === candidate.id;
        return <article key={candidate.id} className={isSelected ? "overflow-hidden rounded-2xl border-2 border-emerald-400 bg-emerald-50" : "collection-panel overflow-hidden"}>
          <div className="p-4">
            <WishlistArtwork title={target.title} platform={target.platform} artworkSrc={candidate.sourceUrl} className="mx-auto h-[330px] w-[240px]" eager />
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950">{candidate.displayRegion}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{candidate.coverVariant} · {candidate.source}</p>
                </div>
                {isSelected && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800"><Check className="h-3 w-3" />Escolhida</span>}
              </div>
              <p className="mt-2 break-all text-[10px] font-semibold leading-4 text-slate-400">{candidate.sourcePath}</p>
            </div>
          </div>
          {!isSelected && <form action={setWishlistArtworkOverride} className="border-t border-[#ece7dd] p-3">
            <input type="hidden" name="targetId" value={target.targetId} />
            <input type="hidden" name="title" value={target.title} />
            <input type="hidden" name="platform" value={target.platform} />
            <input type="hidden" name="candidateId" value={candidate.id} />
            <ActionSubmitButton pendingLabel="A guardar…" className="min-h-11 w-full rounded-xl bg-[#17382e] px-4 text-sm font-black text-white">
              Usar esta capa
            </ActionSubmitButton>
          </form>}
        </article>;
      })}
    </section>

    {selected && <section className="collection-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">Voltar ao automático</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Remove a escolha manual. Se continuar ambíguo, volta ao placeholder seguro.</p>
        </div>
        <form action={clearWishlistArtworkOverride}>
          <input type="hidden" name="targetId" value={target.targetId} />
          <input type="hidden" name="title" value={target.title} />
          <input type="hidden" name="platform" value={target.platform} />
          <ActionSubmitButton pendingLabel="A remover…" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600">
            <RotateCcw className="h-3.5 w-3.5" />Remover escolha
          </ActionSubmitButton>
        </form>
      </div>
    </section>}
  </div>;
}
