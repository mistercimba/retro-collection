import { enrichGameList } from "@/lib/game-list-data";
import { getSellAndSoldGames } from "@/lib/data/collection-service";
import { parseSaleNoteFacts } from "@/lib/sale-history";
import { formatEuro } from "@/lib/format";
import { SellBrowser } from "@/components/sell-browser";
import { searchParamsToString } from "@/lib/list-url-state.logic";

export const metadata = { title: "Saídas" };

export default async function SellPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ forSale: forSaleRaw, sold: soldGames }, query] = await Promise.all([getSellAndSoldGames(), searchParams]);
  const forSale = await enrichGameList(forSaleRaw);
  const valued = forSale.filter((game) => game.currentValueEur !== null);
  const estimatedTotal = valued.reduce((sum, game) => sum + (game.currentValueEur ?? 0), 0);
  const sold = soldGames.map((game) => ({ ...game, ...parseSaleNoteFacts(game.notes) }));
  return <div className="space-y-4 pb-6">
    <header><p className="section-kicker">SAÍDAS</p><h1 className="section-title">O que sai da coleção</h1><p className="mt-1 text-sm text-slate-600">Consulta os itens marcados para venda e o histórico explicitamente registado nas notas.</p></header>
    <div className="grid grid-cols-2 gap-2 sm:max-w-lg"><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Para vender</p><p className="mt-1 text-xl font-black text-slate-950">{forSale.length}</p></div><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Valor estimado</p><p className="mt-1 text-xl font-black text-slate-950">{valued.length ? formatEuro(estimatedTotal) : "Não disponível"}</p><p className="text-[10px] text-slate-500">{valued.length}/{forSale.length} com valor</p></div></div>
    <SellBrowser forSale={forSale} sold={sold} initialSearch={searchParamsToString(query)} />
  </div>;
}
