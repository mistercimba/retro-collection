"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-700">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-black text-slate-950">Não foi possível carregar esta página</h1>
      <p role="alert" className="mt-2 text-sm leading-6 text-slate-600">A coleção pode estar temporariamente indisponível. Tenta novamente ou regressa à coleção.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Ref. {error.digest}</p>}
      <button onClick={reset} className="mx-auto mt-5 flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
        <RotateCcw className="h-4 w-4" /> Tentar novamente
      </button>
      <nav aria-label="Opções de recuperação" className="mt-4 flex flex-wrap justify-center gap-3 text-sm font-bold">
        <Link href="/" className="min-h-11 inline-flex items-center px-2 text-slate-600 underline underline-offset-2 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-800">Voltar ao início</Link>
        <Link href="/collection/games" className="min-h-11 inline-flex items-center px-2 text-slate-600 underline underline-offset-2 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-800">Abrir coleção</Link>
      </nav>
    </div>
  );
}
