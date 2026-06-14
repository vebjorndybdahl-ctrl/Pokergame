"use client";

import { useState, useTransition } from "react";
import { joinSeries } from "./actions";

export default function JoinForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await joinSeries(code);
      // On success joinSeries redirects; we only get here on a miss.
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="glass animate-rise rounded-3xl p-7" style={{ animationDelay: "0.15s" }}>
      <h2 className="text-lg font-bold text-white">Bli med i en serie</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Har du en kode fra gjengen? Skriv den inn her.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="F.EKS. K7P3QM"
          maxLength={9}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="field flex-1 px-4 py-3 text-center font-mono text-xl tracking-[0.3em] uppercase placeholder:tracking-normal"
        />
        <button
          onClick={submit}
          disabled={pending}
          className="btn-emerald rounded-xl px-6 py-3 font-bold tracking-wide disabled:opacity-50"
        >
          {pending ? "Sjekker…" : "Bli med"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
