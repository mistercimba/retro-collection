import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-white">
          <Gamepad2 className="h-7 w-7" />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-blue-700">404</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Esse jogo não está aqui.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">O endereço pode estar errado ou o item já não existir na fonte de dados.</p>
        <Link href="/" className="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>
      </div>
    </main>
  );
}
