"use client";

import Link from "next/link";
import type { LessonMeta } from "@/lib/guide-types";
import { useProgress } from "./useProgress";

export default function LessonCard({
  lesson,
  index,
}: {
  lesson: LessonMeta;
  index: number;
}) {
  const { isDone, ready } = useProgress();
  const done = ready && isDone(lesson.slug);

  return (
    <Link
      href={`/laer/${lesson.slug}`}
      className="glass card-rise flex items-center gap-4 rounded-2xl px-5 py-4 hover:border-amber-300/30"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
          done
            ? "bg-emerald-400/20 text-emerald-300"
            : "bg-white/10 text-zinc-400"
        }`}
      >
        {done ? "✓" : index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-white">{lesson.title}</div>
        <div className="truncate text-xs text-zinc-500">{lesson.summary}</div>
      </div>
      <span className="shrink-0 text-xs text-zinc-600">
        {lesson.minutes} min
      </span>
    </Link>
  );
}
