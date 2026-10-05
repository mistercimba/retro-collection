import { Camera, History, ListChecks, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { getLibrary } from "@/lib/library-store";
import { displayPlatform } from "@/lib/data/platforms";
import type { LibraryHistoryAction } from "@/lib/data/types";

export const metadata = { title: "Histórico" };

const actionMeta: Record<LibraryHistoryAction, { label: string; icon: typeof History }> = {
  "collection.add": { label: "Coleção", icon: Plus },
  "collection.edit": { label: "Coleção", icon: Pencil },
  "collection.remove": { label: "Coleção", icon: Trash2 },
  "collection.photo.add": { label: "Foto", icon: Camera },
  "collection.photo.remove": { label: "Foto", icon: Trash2 },
  "wishlist.add": { label: "Wishlist", icon: Plus },
  "wishlist.edit": { label: "Wishlist", icon: Pencil },
  "wishlist.remove": { label: "Wishlist", icon: Trash2 },
  "wishlist.purchase": { label: "Compra", icon: ShoppingBag },
  "list.create": { label: "Lista", icon: ListChecks },
  "list.edit": { label: "Lista", icon: Pencil },
  "list.remove": { label: "Lista", icon: Trash2 },
  "list.target.add": { label: "Lista", icon: Plus },
  "list.target.remove": { label: "Lista", icon: Trash2 },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
}

export default async function HistoryPage() {
  const library = await getLibrary();
  const entries = [...library.history].sort((a, b) => b.at.localeCompare(a.at));

  return <div className="space-y-6 pb-8">
    <header className="collection-hero">
      <p className="eyebrow">HISTÓRICO</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950">Alterações da coleção</h1>
      <p className="mt-1 text-sm font-semibold text-slate-500">{entries.length ? `${entries.length} alterações registadas` : "O registo começa a partir desta versão."}</p>
    </header>

    {entries.length ? <div className="collection-list">
      {entries.map((entry) => {
        const meta = actionMeta[entry.action];
        const Icon = meta.icon;
        return <article key={entry.id} className="flex gap-3 border-b border-[#ece7dd] p-4 last:border-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5eadf] text-[#17382e]">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div className="min-w-0">
                <p className="truncate font-black text-slate-950">{entry.title}</p>
                <p className="text-xs font-semibold text-slate-500">{entry.platform ? `${displayPlatform(entry.platform)} · ` : ""}{meta.label}</p>
              </div>
              <time className="shrink-0 text-[11px] font-semibold text-slate-400" dateTime={entry.at}>{formatDate(entry.at)}</time>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-700">{entry.summary}</p>
            {entry.details.length > 0 && <p className="mt-1 text-xs text-slate-500">{entry.details.join(" · ")}</p>}
          </div>
        </article>;
      })}
    </div> : <section className="collection-panel p-6 text-center">
      <History className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-3 font-black text-slate-800">Ainda não há alterações registadas.</p>
      <p className="mt-1 text-sm text-slate-500">A próxima adição, edição, remoção ou compra passa a aparecer aqui.</p>
    </section>}
  </div>;
}