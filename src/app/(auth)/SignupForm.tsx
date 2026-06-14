"use client";

import { useState, useTransition } from "react";
import { signUp } from "./actions";

export default function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await signUp(formData);
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
          minLength={3}
          maxLength={20}
          placeholder="mikkel"
          className="field mt-1.5 w-full px-4 py-3"
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-zinc-200">
        Passord
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className="field mt-1.5 w-full px-4 py-3"
        />
      </label>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-gold mt-6 w-full rounded-xl px-4 py-3 font-bold tracking-wide disabled:opacity-50"
      >
        {pending ? "Oppretter…" : "Opprett konto"}
      </button>
      <p className="mt-3 text-center text-xs text-zinc-500">
        3–20 tegn: bokstaver, tall eller _. Passord minst 6 tegn.
      </p>
    </form>
  );
}
