"use client";

import { useProgress } from "./useProgress";

export default function CompleteButton({ slug }: { slug: string }) {
  const { isDone, toggle, ready } = useProgress();
  const done = ready && isDone(slug);

  return (
    <button
      onClick={() => toggle(slug)}
      aria-pressed={done}
      className={`rounded-xl border px-5 py-3 text-sm font-bold tracking-wide transition ${
        done
          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
          : "btn-gold border-transparent"
      }`}
    >
      {done ? "✓ Fullført" : "Marker som fullført"}
    </button>
  );
}
