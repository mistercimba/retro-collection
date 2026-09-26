"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white">
        <LockKeyhole className="h-5 w-5" />
      </div>
      <h1 className="mt-5 text-2xl font-black">Retro Collection</h1>
      <p className="mt-1 text-sm leading-6 text-slate-500">Esta coleção é privada. Introduz a password para continuar.</p>

      <label className="mt-5 block text-sm font-bold text-slate-700">
        Password
        <input
          name="password"
          type="password"
          autoFocus
          required
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
        />
      </label>

      {state.error && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "A entrar..." : "Entrar"}
      </button>
    </form>
  );
}
