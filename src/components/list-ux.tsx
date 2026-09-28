"use client";

import { X } from "lucide-react";

export type ActiveListFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

export function ActiveFilterChips({ filters }: { filters: ActiveListFilter[] }) {
  if (filters.length === 0) return null;
  return (
    <ul aria-label="Filtros ativos" className="mt-3 flex flex-wrap gap-2">
      {filters.map((filter) => (
        <li key={filter.key}>
          <button
            type="button"
            onClick={filter.onRemove}
            aria-label={`Remover filtro ${filter.label}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-950 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            {filter.label}<X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ListResultCount({ filtered, total, noun = "jogos" }: { filtered: number; total: number; noun?: string }) {
  return (
    <p className="text-sm font-semibold text-slate-700" aria-live="polite">
      {filtered} de {total} {filtered === 1 ? noun.replace(/s$/, "") : noun}
    </p>
  );
}

export function ListEmptyState({ title, description, onClear, clearLabel = "Limpar filtros" }: {
  title: string;
  description: string;
  onClear?: () => void;
  clearLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 min-h-11 rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
