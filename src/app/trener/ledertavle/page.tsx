import Link from "next/link";

// Placeholder until Phase 5 wires up trainer_stats + real rankings.
export default function LeaderboardPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-black tracking-tight text-white">
        Ledertavle
      </h1>
      <p className="mt-3 text-zinc-400">
        Ferdighets-rangeringen kommer snart. Spill noen hender i treneren mens vi
        bygger den.
      </p>
      <Link
        href="/trener"
        className="btn-emerald mt-6 inline-block rounded-xl px-5 py-3 font-bold tracking-wide"
      >
        Til treneren
      </Link>
    </main>
  );
}
