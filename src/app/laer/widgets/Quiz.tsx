"use client";

import { useState } from "react";

type Question = {
  q: string;
  options: string[];
  correct: number;
  explain: string;
};

const QUESTIONS: Question[] = [
  {
    q: "Hvor mange felleskort ligger på bordet på floppen?",
    options: ["2", "3", "4", "5"],
    correct: 1,
    explain: "Floppen snur de tre første felleskortene samtidig.",
  },
  {
    q: "Hva betyr det å «folde»?",
    options: [
      "Matche den nåværende satsen",
      "Heve satsen",
      "Kaste hånden og gi opp potten",
      "Sjekke uten å satse",
    ],
    correct: 2,
    explain:
      "Å folde betyr å gi opp hånden. Det koster deg ingenting mer – ofte det smarteste trekket.",
  },
  {
    q: "Hvilken hånd er sterkest?",
    options: ["Flush", "Straight (rekke)", "Tre like", "To par"],
    correct: 0,
    explain:
      "En flush slår en straight, som slår tre like, som slår to par. Farge er vanskeligere å treffe enn rekke.",
  },
  {
    q: "Når bør du som nybegynner helst folde?",
    options: [
      "Når du er i sterk tvil om hånden",
      "Aldri – spill alltid videre",
      "Bare når du har høyt kort",
      "Når potten er stor",
    ],
    correct: 0,
    explain:
      "Hånden du folder koster deg ingenting. De fleste store tapene kommer fra hender man aldri burde spilt videre.",
  },
];

export default function Quiz() {
  const [answers, setAnswers] = useState<(number | null)[]>(
    QUESTIONS.map(() => null),
  );

  function pick(qi: number, oi: number) {
    setAnswers((prev) => {
      if (prev[qi] !== null) return prev; // lock after first answer
      const next = [...prev];
      next[qi] = oi;
      return next;
    });
  }

  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter(
    (a, i) => a === QUESTIONS[i].correct,
  ).length;

  return (
    <div className="glass not-prose my-6 rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-[family-name:var(--font-display)] text-lg font-black text-white">
          Mini-quiz
        </h4>
        {answered > 0 && (
          <span className="text-sm text-zinc-400">
            {correct} / {QUESTIONS.length} riktige
          </span>
        )}
      </div>

      <ol className="space-y-5">
        {QUESTIONS.map((question, qi) => {
          const chosen = answers[qi];
          const isAnswered = chosen !== null;
          return (
            <li key={qi}>
              <p className="text-sm font-semibold text-zinc-200">
                {qi + 1}. {question.q}
              </p>
              <div className="mt-2 grid gap-1.5">
                {question.options.map((opt, oi) => {
                  const isCorrect = oi === question.correct;
                  const isChosen = chosen === oi;

                  let cls =
                    "border-white/10 text-zinc-300 hover:border-white/25";
                  if (isAnswered) {
                    if (isCorrect)
                      cls =
                        "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
                    else if (isChosen)
                      cls = "border-rose-400/40 bg-rose-400/10 text-rose-200";
                    else cls = "border-white/5 text-zinc-500";
                  }

                  return (
                    <button
                      key={oi}
                      onClick={() => pick(qi, oi)}
                      disabled={isAnswered}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-default ${cls}`}
                    >
                      <span>{opt}</span>
                      {isAnswered && isCorrect && <span>✓</span>}
                      {isAnswered && isChosen && !isCorrect && <span>✗</span>}
                    </button>
                  );
                })}
              </div>
              {isAnswered && (
                <p className="mt-2 text-xs text-zinc-400">
                  {question.explain}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
