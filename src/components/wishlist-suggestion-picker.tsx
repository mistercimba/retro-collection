"use client";

import { useState } from "react";
import { ActionSubmitButton } from "./action-submit-button";
import type { WishlistGapSuggestion } from "@/lib/wishlist-list-suggestions.logic";
import { addSelectedWishlistSuggestions } from "@/lib/wishlist-list-suggestions-action";

export function WishlistSuggestionPicker({ suggestions }: { suggestions: WishlistGapSuggestion[] }) {
  const [ignored, setIgnored] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const visible = suggestions.filter((suggestion) => !ignored.includes(suggestion.key));
  const selectedVisible = visible.filter((suggestion) => selected.includes(suggestion.reference));

  function toggle(reference: string, checked: boolean) {
    setSelected((before) => checked
      ? [...new Set([...before, reference])]
      : before.filter((value) => value !== reference));
  }

  if (suggestions.length === 0) return <div className="collection-panel p-5">
    <h2 className="text-base font-black text-slate-950">Sem sugestões novas</h2>
    <p className="mt-1 text-sm text-slate-600">
      As tuas listas não têm alvos novos que estejam fora da Collection e da Wishlist.
      Podes criar ou atualizar uma lista de objetivos para obter propostas mais tarde.
    </p>
  </div>;

  return <section className="space-y-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-lg font-black text-slate-950">Propostas a considerar</h2>
      <p className="text-xs font-bold text-slate-500">{visible.length} de {suggestions.length} disponíveis</p>
    </div>
    {visible.length === 0 ? <div className="collection-panel p-5">
      <p className="text-sm text-slate-600">Ignoraste todas as sugestões desta sessão. Não foi alterado nenhum dado.</p>
      <button type="button" onClick={() => setIgnored([])} className="mt-3 min-h-10 text-sm font-black text-[#315b47] underline">
        Voltar a mostrar sugestões
      </button>
    </div> : <form action={addSelectedWishlistSuggestions} className="space-y-3">
      {visible.map((suggestion) => {
        const checked = selected.includes(suggestion.reference);
        return <article key={suggestion.key} className="collection-panel min-w-0 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <input
              id={"suggestion-" + suggestion.key}
              name="candidate"
              type="checkbox"
              value={suggestion.reference}
              checked={checked}
              onChange={(event) => toggle(suggestion.reference, event.target.checked)}
              disabled={!checked && selected.length >= 40}
              className="mt-1.5 h-5 w-5 shrink-0 accent-[#17382e] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="min-w-0 flex-1">
              <label htmlFor={"suggestion-" + suggestion.key}
                className="block cursor-pointer break-words text-base font-black text-slate-950">
                {suggestion.title}
              </label>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{suggestion.platform}</p>
              <p className="mt-2 text-sm leading-5 text-slate-700">{suggestion.reason}</p>
              {suggestion.sources.length > 1 &&
                <p className="mt-1 text-xs text-[#315b47]">Também aparece em {suggestion.sources.length - 1} outra(s) lista(s).</p>}
              <p className="mt-2 text-[11px] text-slate-500">Versão, região e preço por confirmar — sem referência de mercado inventada.</p>
            </div>
            <button type="button" onClick={() => {
              setIgnored((before) => [...before, suggestion.key]);
              setSelected((before) => before.filter((value) => value !== suggestion.reference));
            }} className="min-h-10 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50">
              Ignorar
            </button>
          </div>
        </article>;
      })}
      <div className="collection-panel flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
        <span className="text-sm font-semibold text-slate-700">{selectedVisible.length} selecionado(s) · até 40 por confirmação</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() =>
            setSelected(visible.slice(0, 40).map((suggestion) => suggestion.reference))
          } className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-[#315b47]">
            Selecionar {Math.min(visible.length, 40)}
          </button>
          {selectedVisible.length ? <ActionSubmitButton pendingLabel="A adicionar…" className="min-h-11 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white">
            Adicionar {selectedVisible.length} à Wishlist
          </ActionSubmitButton> :
          <button type="button" disabled className="min-h-11 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white opacity-50">
            Escolhe os jogos a adicionar
          </button>}
        </div>
      </div>
    </form>}
  </section>;
}
