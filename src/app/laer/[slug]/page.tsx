import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllLessons, getLesson, getAdjacent } from "@/lib/guide";
import { TIER_META } from "@/lib/guide-types";
import LessonContent from "../LessonContent";
import CompleteButton from "../CompleteButton";

// Pre-render every lesson at build time.
export async function generateStaticParams() {
  const lessons = await getAllLessons();
  return lessons.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLesson(slug);
  if (!lesson) return { title: "Fant ikke leksjonen · Alpha Poker" };
  return {
    title: `${lesson.title} · Lær poker`,
    description: lesson.summary,
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = await getLesson(slug);
  if (!lesson) notFound();

  const { prev, next } = await getAdjacent(slug);
  const tier = TIER_META[lesson.tier];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      {/* Breadcrumb */}
      <nav className="animate-rise mb-6 flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/laer" className="transition hover:text-amber-200">
          Lær poker
        </Link>
        <span>/</span>
        <span className="text-zinc-400">{tier.label}</span>
      </nav>

      {/* Title */}
      <header className="animate-rise mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
          <span className="text-amber-300">{tier.suit}</span>
          {tier.label} · {lesson.minutes} min lesing
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
          {lesson.title}
        </h1>
      </header>

      {/* Body */}
      <article className="animate-rise" style={{ animationDelay: "0.05s" }}>
        <LessonContent markdown={lesson.body} />
      </article>

      {/* Complete */}
      <div className="mt-10 flex justify-center">
        <CompleteButton slug={lesson.slug} />
      </div>

      {/* Prev / next */}
      <nav className="mt-10 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/laer/${prev.slug}`}
            className="glass card-rise rounded-xl px-4 py-3 hover:border-amber-300/30"
          >
            <div className="text-xs text-zinc-500">← Forrige</div>
            <div className="font-semibold text-white">{prev.title}</div>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/laer/${next.slug}`}
            className="glass card-rise rounded-xl px-4 py-3 text-right hover:border-amber-300/30"
          >
            <div className="text-xs text-zinc-500">Neste →</div>
            <div className="font-semibold text-white">{next.title}</div>
          </Link>
        ) : (
          <Link
            href="/laer"
            className="glass-emerald card-rise rounded-xl px-4 py-3 text-right"
          >
            <div className="text-xs text-emerald-300/70">Ferdig 🎉</div>
            <div className="font-semibold text-white">Tilbake til oversikten</div>
          </Link>
        )}
      </nav>
    </main>
  );
}
