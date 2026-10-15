import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WishlistBuyingBrowser } from "@/components/wishlist-buying-browser";
import { getWantlist } from "@/lib/data/collection-service";
import { getPricechartingGuides } from "@/lib/pricecharting-catalog";
import { getCexWishlistGuides } from "@/lib/cex-catalog";
import { searchParamsToString } from "@/lib/list-url-state.logic";
import { targetBuyCondition } from "@/lib/wishlist-buy-reference.logic";
import { buildWishlistBuyingRows, selectBuyingTargets, wishlistBuyingKey } from "@/lib/wishlist-buying-shortlist.logic";
import { resolveWishlistArtwork } from "@/lib/wishlist-artwork";

export const metadata = { title: "Lista de compra · Wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistBuyingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [wantlist, query] = await Promise.all([getWantlist(), searchParams]);
  const targets = selectBuyingTargets(wantlist);
  // One explicit navigation triggers one shared snapshot read per source.
  // A target without a known buying condition must not be priced as another condition.
  const entries = targets.filter((item) => targetBuyCondition(item.targetVersion) !== null).map((item) => ({
    key: wishlistBuyingKey(item),
    platform: item.platform,
    title: item.title,
    edition: item.targetVersion,
  }));
  const [prices, cex] = await Promise.all([getPricechartingGuides(entries), getCexWishlistGuides(entries)]);
  const artwork = new Map(targets.map((item) => [wishlistBuyingKey(item), resolveWishlistArtwork(item)]));
  const rows = buildWishlistBuyingRows(targets, prices, cex).map((row) => ({
    ...row,
    artworkSrc: artwork.get(row.key) ?? null,
  }));

  return <div className="space-y-5 pb-8">
    <Link href="/want" className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-[#315b47]">
      <ArrowLeft className="h-4 w-4" />Voltar à Wishlist
    </Link>
    <header className="collection-hero">
      <p className="eyebrow text-rose-700">WISHLIST · COMPRA</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">O que procurar a seguir</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Compara o teu teto de compra com referências calculadas de PriceCharting PAL e CeX Portugal.
        Apenas jogos da Wishlist efetivamente por comprar; os já encomendados, adquiridos ou com
        correspondências ambíguas ficam de fora.
      </p>
      <p className="mt-2 text-xs font-bold leading-5 text-amber-900">
        Uma referência abaixo do teto não é uma oferta à venda nem uma poupança garantida.
        Confirma sempre edição, região, condição e custos de envio nos anúncios.
      </p>
    </header>
    <WishlistBuyingBrowser rows={rows} initialSearch={searchParamsToString(query)} />
  </div>;
}
