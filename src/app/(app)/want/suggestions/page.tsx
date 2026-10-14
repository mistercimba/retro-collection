import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WishlistSuggestionPicker } from "@/components/wishlist-suggestion-picker";
import { getLibrary } from "@/lib/library-store";
import { suggestWishlistListGaps } from "@/lib/wishlist-list-suggestions.logic";

export const metadata = { title: "Sugestões para a Wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistSuggestionsPage({
  searchParams,
}: { searchParams: Promise<{ added?: string }> }) {
  const [library, query] = await Promise.all([getLibrary(), searchParams]);
  const suggestions = suggestWishlistListGaps(library);
  const added = Number(query.added);
  const confirmed = Number.isSafeInteger(added) && added > 0 && added <= 40 ? added : 0;

  return <div className="space-y-5 pb-8">
    <Link href="/want" className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-[#315b47]">
      <ArrowLeft className="h-4 w-4" />Voltar à Wishlist
    </Link>
    <header className="collection-hero">
      <p className="eyebrow text-rose-700">WISHLIST</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Sugerir novos jogos</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Encontrámos os jogos em falta nas listas de coleção que criaste.
        Priorizamos listas quase completas, mas não inventamos sequelas nem enchemos a Wishlist à força.
      </p>
      <p className="mt-2 text-xs font-semibold text-[#315b47]">
        Nada é adicionado sem selecionares e confirmares. «Ignorar» só esconde a sugestão nesta sessão.
      </p>
    </header>
    {confirmed > 0 && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
      Pedido processado. Consulta a Wishlist para confirmar os novos alvos; as restantes sugestões foram atualizadas.
    </p>}
    <WishlistSuggestionPicker suggestions={suggestions} />
    <div className="flex flex-wrap gap-4 text-sm font-bold">
      <Link href="/lists" className="text-[#315b47] underline underline-offset-2">Gerir listas e objetivos</Link>
      <Link href="/want" className="text-[#315b47] underline underline-offset-2">Ver Wishlist</Link>
    </div>
  </div>;
}
