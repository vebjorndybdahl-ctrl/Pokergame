"use client";

import { useTransition } from "react";
import { joinSeriesByToken } from "@/app/actions";

export default function JoinSeriesPrompt({
  token,
  seriesName,
}: {
  token: string;
  seriesName: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => joinSeriesByToken(token))}
      disabled={pending}
      className="btn-gold rounded-xl px-6 py-3 font-bold tracking-wide disabled:opacity-50"
    >
      {pending ? "Blir med…" : `Bli med i ${seriesName}`}
    </button>
  );
}
