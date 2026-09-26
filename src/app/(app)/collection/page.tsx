import { CollectionBrowser } from "@/components/collection-browser";
import { getCollectionGames } from "@/lib/data/collection-service";

export const metadata = { title: "Coleção" };

export default async function CollectionPage() {
  const games = await getCollectionGames();
  return <div><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Biblioteca</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Coleção</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Por defeito só aparecem itens com Keep Status = Collection. PSP e duplicados para venda ficam fora daqui.</p></div><CollectionBrowser games={games} /></div>;
}
