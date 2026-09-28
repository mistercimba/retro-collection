"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-700">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-black text-slate-950">Não foi possível carregar a coleção</h1>
      <p role="alert" className="mt-2 text-sm leading-6 text-slate-600">Pode ser uma falha temporária na ligação à Google Sheet. Tenta novamente.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Ref. {error.digest}</p>}
      <button onClick={reset} className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">
        <RotateCcw className="h-4 w-4" /> Tentar novamente
      </button>
    </div>
  );
}
