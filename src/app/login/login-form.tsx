"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <form action={action} className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--archive-ink)] text-white">
        <LockKeyhole className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-black text-[var(--archive-ink)]">Retro Collection</h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">Coleção privada do Mário. Entra para continuar.</p>

      <label className="mt-5 block text-sm font-bold text-slate-700" htmlFor="password">
        Password
        <span className="mt-2 flex min-h-11 items-center rounded-xl border border-slate-300 bg-white pr-2 focus-within:ring-2 focus-within:ring-[var(--archive-focus)]">
          <input
            id="password"
            name="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            required
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? "login-error" : undefined}
            className="min-w-0 flex-1 rounded-xl px-3 py-2.5 outline-none"
          />
          <button
            type="button"
            aria-label={passwordVisible ? "Ocultar password" : "Mostrar password"}
            aria-pressed={passwordVisible}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-[var(--archive-paper)]"
          >
            {passwordVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </span>
      </label>

      {state.error && (
        <p id="login-error" role="alert" aria-live="polite" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        className="mt-5 min-h-11 w-full rounded-xl bg-[var(--archive-green)] px-4 py-3 font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
      >
        {pending ? "A entrar..." : "Entrar"}
      </button>
    </form>
  );
}
