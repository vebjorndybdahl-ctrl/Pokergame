import Link from "next/link";
import type { Metadata } from "next";
import { getLessonsByTier } from "@/lib/guide";
import { TIER_ORDER, TIER_META } from "@/lib/guide-types";
import LessonCard from "./LessonCard";

export const metadata: Metadata = {
  title: "Lær poker · Alpha Poker",
  description:
    "En interaktiv nybegynnerguide til poker og pokerteori – fra reglene til ranges, pot odds og GTO.",
};

export default async function GuideHub() {
  const byTier = await getLessonsByTier();
  const totalLessons = TIER_ORDER.reduce(
    (n, t) => n + byTier[t].length,
    0,
  );

  // Precompute a 1..N number for each lesson across all tiers (no mutation
  // during render).
  const numberOf = new Map<string, number>();
  let running = 0;
  for (const tier of TIER_ORDER) {
    for (const lesson of byTier[tier]) {
      running += 1;
      numberOf.set(lesson.slug, running);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
      {/* Header */}
      <header className="animate-rise mb-10">
        <Link
          href="/"
          className="text-xs font-medium tracking-wide text-zinc-500 transition hover:text-amber-200"
        >
          <span className="gold-text">♠ Alpha</span> Poker
        </Link>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/5 px-3.5 py-1 text-xs font-medium tracking-wide text-amber-200/80">
          <span className="animate-glow">♦</span> {totalLessons} leksjoner ·
          interaktiv
        </div>

        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-black leading-none tracking-tight text-white sm:text-6xl">
          Lær <span className="gold-text">poker</span>
        </h1>
        <p className="mt-4 max-w-xl text-balance text-zinc-300/90">
          Fra reglene til ekte pokerteori. Bla deg gjennom i ditt eget tempo –
          med interaktive håndkort, en pot-odds-kalkulator, et posisjonsbord og
          quiz underveis.
        </p>
      </header>

      {/* Tiers */}
      <div className="space-y-10">
        {TIER_ORDER.map((tier, ti) => {
          const meta = TIER_META[tier];
          const lessons = byTier[tier];
          if (lessons.length === 0) return null;

          return (
            <section
              key={tier}
              className="animate-rise"
              style={{ animationDelay: `${ti * 0.05}s` }}
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="font-[family-name:var(--font-display)] text-3xl leading-none text-amber-300/70">
                  {meta.suit}
                </span>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-black text-white">
                    {meta.label}
                  </h2>
                  <p className="text-sm text-zinc-400">{meta.blurb}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {lessons.map((lesson) => (
                  <LessonCard
                    key={lesson.slug}
                    lesson={lesson}
                    index={numberOf.get(lesson.slug) ?? 0}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="animate-rise mt-12 text-center text-xs text-zinc-500">
        Fremgangen din lagres lokalt på denne enheten. Ingen konto nødvendig.
      </p>
    </main>
  );
}
