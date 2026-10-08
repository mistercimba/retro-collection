"use client";

import { useState } from "react";

export function CopyWishlistPreflight({ report }: { report: string }) {
  const [feedback, setFeedback] = useState("");

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setFeedback("Relatório copiado. Cola-o na conversa com o ChatGPT.");
    } catch {
      setFeedback("Não foi possível copiar automaticamente. Seleciona o texto no relatório abaixo.");
    }
  }

  return <div className="space-y-3">
    <button type="button" onClick={copyReport}
      className="rounded-lg bg-[#17382e] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#315b47]">
      Copiar relatório para o ChatGPT
    </button>
    {feedback && <p role="status" className="text-xs font-semibold text-slate-600">{feedback}</p>}
    <details>
      <summary className="cursor-pointer text-xs font-semibold text-slate-600">Ver relatório em texto</summary>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-100 p-3 text-xs text-slate-700">{report}</pre>
    </details>
  </div>;
}
