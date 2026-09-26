import { CollectionBrowser } from "@/components/collection-browser";
import { getSellGames } from "@/lib/data/collection-service";

export const metadata = { title: "Para venda" };

export default async function SellPage() {
  const games = await getSellGames();
  return <div><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Saídas</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Para venda</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Itens atualmente marcados como Sell. Sold fica apenas no histórico e não aparece aqui.</p></div><CollectionBrowser games={games} sale /></div>;
}
