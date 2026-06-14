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
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
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
          className="field flex-1 px-3 py-2 text-center font-mono tracking-[0.25em] uppercase placeholder:tracking-normal"
        />
        <button
          onClick={submit}
          disabled={pending}
          className="btn-emerald rounded-xl px-5 py-2 font-bold tracking-wide disabled:opacity-50"
        >
          {pending ? "…" : "Bli med"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
