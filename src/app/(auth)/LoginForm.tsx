"use client";

import { useState, useTransition } from "react";
import { logIn } from "./actions";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await logIn(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={action} className="glass animate-rise rounded-3xl p-7">
      <label className="block text-sm font-medium text-zinc-200">
        Brukernavn
        <input
          name="username"
          autoComplete="username"
          autoFocus
          required
          className="field mt-1.5 w-full px-4 py-3"
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-zinc-200">
        Passord
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field mt-1.5 w-full px-4 py-3"
        />
      </label>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-gold mt-6 w-full rounded-xl px-4 py-3 font-bold tracking-wide disabled:opacity-50"
      >
        {pending ? "Logger inn…" : "Logg inn"}
      </button>
    </form>
  );
}
