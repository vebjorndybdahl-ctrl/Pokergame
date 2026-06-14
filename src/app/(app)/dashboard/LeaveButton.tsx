"use client";

import { useTransition } from "react";
import { leaveSeries } from "../actions";

export default function LeaveButton({
  seriesId,
  seriesName,
}: {
  seriesId: string;
  seriesName: string;
}) {
  const [pending, startTransition] = useTransition();

  function onLeave() {
    if (!confirm(`Forlate "${seriesName}"? Du kan bli med igjen med koden.`))
      return;
    startTransition(() => leaveSeries(seriesId));
  }

  return (
    <button
      onClick={onLeave}
      disabled={pending}
      className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
    >
      {pending ? "Forlater…" : "Forlat"}
    </button>
  );
}
