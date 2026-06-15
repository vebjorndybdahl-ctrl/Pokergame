"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseCard } from "@/lib/poker/cards";
import {
  gradeRawSpot,
  VERDICT_META,
  type ActionKind,
  type DecisionScore,
} from "@/lib/poker/scoring";
import { recordSession } from "../actions";
import { DRILLS, type Drill } from "./scenarios";
import { PlayingCard } from "../PlayingCard";

const SET_SIZE = 10;

const RECO_LABEL: Record<ActionKind, string> = {
  fold: "Fold",
  check: "Sjekk",
  call: "Call",
  raise: "Høyne",
};

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function DrillRunner({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [seed, setSeed] = useState(0);
  const order = useMemo(
    () => shuffled(DRILLS).slice(0, SET_SIZE),
    // re-shuffle when the user restarts
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed],
  );
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<DecisionScore | null>(null);
  const [score, setScore] = useState({ count: 0, sum: 0 });

  const drill = order[i];
  const done = i >= order.length;

  function answerWith(kind: ActionKind, d: Drill) {
    if (answer) return;
    const s = gradeRawSpot(
      {
        hole: [parseCard(d.hole[0]), parseCard(d.hole[1])],
        board: d.board.map(parseCard),
        opponents: d.opponents,
        potBb: d.potBb,
        toCallBb: d.toCallBb,
      },
      kind,
    );
    setAnswer(s);
    setScore((p) => ({ count: p.count + 1, sum: p.sum + s.qualityPct }));
    if (isLoggedIn) {
      recordSession({
        hands: 0,
        decisions: 1,
        qualitySum: s.qualityPct,
        difficulty: "middels",
      }).catch(() => {});
    }
  }

  function next() {
    setAnswer(null);
    setI((n) => n + 1);
  }

  function restart() {
    setI(0);
    setAnswer(null);
    setScore({ count: 0, sum: 0 });
    setSeed((s) => s + 1);
  }

  if (done) {
    const avg = score.count ? Math.round(score.sum / score.count) : 0;
    return (
      <div className="glass-emerald mx-auto max-w-md rounded-2xl p-6 text-center">
        <div className="text-4xl">🎯</div>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-white">
          Ferdig!
        </h2>
        <p className="mt-1 text-zinc-300">
          Snitt avgjørelseskvalitet:{" "}
          <span className="font-bold text-emerald-300">{avg}%</span> over{" "}
          {score.count} spørsmål.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={restart}
            className="btn-gold rounded-xl px-5 py-2.5 font-bold tracking-wide"
          >
            Nye spørsmål
          </button>
          <Link
            href="/trener"
            className="rounded-xl border border-white/15 px-5 py-2.5 font-semibold text-zinc-200 transition hover:border-white/30"
          >
            Spill hender
          </Link>
        </div>
        {!isLoggedIn && (
          <p className="mt-3 text-xs text-emerald-100/50">
            Logg inn for å lagre resultatene i ferdighets-rangeringen din.
          </p>
        )}
      </div>
    );
  }

  const correct = answer && answer.chosen === answer.recommend;

  return (
    <div className="mx-auto max-w-md">
      {/* Progress */}
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
        <span>
          {i + 1} / {order.length}
        </span>
        {score.count > 0 && (
          <span className="text-emerald-300">
            snitt {Math.round(score.sum / score.count)}%
          </span>
        )}
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-300 transition-all"
          style={{ width: `${(i / order.length) * 100}%` }}
        />
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-amber-300/30 bg-amber-300/5 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
            {drill.concept}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {drill.title}
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-300">{drill.prompt}</p>

        {/* Board */}
        <div className="mt-4 flex min-h-[3.5rem] items-center justify-center gap-1.5">
          {drill.board.length > 0 ? (
            drill.board.map((c, k) => <PlayingCard key={k} card={parseCard(c)} />)
          ) : (
            <span className="text-xs italic text-emerald-200/40">
              før floppen
            </span>
          )}
        </div>

        {/* Hero cards + spot info */}
        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="flex gap-1.5">
            {drill.hole.map((c, k) => (
              <PlayingCard key={k} card={parseCard(c)} />
            ))}
          </div>
          <div className="text-xs text-zinc-400">
            <div>Pott {drill.potBb} bb</div>
            <div>
              {drill.toCallBb > 0
                ? `Å betale: ${drill.toCallBb} bb`
                : "Sjekket til deg"}
            </div>
            <div>
              {drill.opponents} motstander{drill.opponents > 1 ? "e" : ""}
            </div>
          </div>
        </div>

        {/* Options or feedback */}
        {!answer ? (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {drill.toCallBb > 0 && (
              <button
                onClick={() => answerWith("fold", drill)}
                className="rounded-xl border border-rose-400/30 px-5 py-2.5 font-bold text-rose-200 transition hover:bg-rose-400/10"
              >
                Fold
              </button>
            )}
            <button
              onClick={() =>
                answerWith(drill.toCallBb > 0 ? "call" : "check", drill)
              }
              className="btn-emerald rounded-xl px-5 py-2.5 font-bold"
            >
              {drill.toCallBb > 0 ? "Call" : "Sjekk"}
            </button>
            <button
              onClick={() => answerWith("raise", drill)}
              className="btn-gold rounded-xl px-5 py-2.5 font-bold"
            >
              Høyne
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <div
              className={`text-center text-lg font-black ${VERDICT_META[answer.verdict].color}`}
            >
              {VERDICT_META[answer.verdict].label}
              {!correct && (
                <span className="ml-2 text-sm font-semibold text-zinc-400">
                  beste: {RECO_LABEL[answer.recommend]}
                </span>
              )}
            </div>
            <p className="mt-1 text-center text-sm text-zinc-300">
              {answer.explanation}
            </p>
            <div className="mt-3 flex justify-center gap-2 text-xs">
              <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">
                <span className="text-zinc-500">equity</span>{" "}
                <span className="font-semibold text-zinc-100">
                  {Math.round(answer.equity * 100)}%
                </span>
              </span>
              {answer.potOdds > 0 && (
                <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">
                  <span className="text-zinc-500">pott-odds</span>{" "}
                  <span className="font-semibold text-zinc-100">
                    {Math.round(answer.potOdds * 100)}%
                  </span>
                </span>
              )}
            </div>
            <button
              onClick={next}
              className="btn-gold mx-auto mt-4 block rounded-xl px-6 py-2.5 font-bold tracking-wide"
            >
              {i + 1 >= order.length ? "Fullfør" : "Neste"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
