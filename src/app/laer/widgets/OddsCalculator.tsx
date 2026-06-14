"use client";

import { useMemo, useState } from "react";

// Common draw presets so users don't have to know their outs by heart.
const PRESETS: { label: string; outs: number }[] = [
  { label: "Flush-draw", outs: 9 },
  { label: "Åpen straight", outs: 8 },
  { label: "Gutshot", outs: 4 },
  { label: "To overkort", outs: 6 },
];

export default function OddsCalculator() {
  const [outs, setOuts] = useState(9);
  const [pot, setPot] = useState(100);
  const [toCall, setToCall] = useState(25);
  const [street, setStreet] = useState<"flop" | "turn">("flop");

  const { hitPct, potOddsPct, verdict } = useMemo(() => {
    // 2-and-4 rule: ×4 on the flop (two cards to come), ×2 on the turn.
    const multiplier = street === "flop" ? 4 : 2;
    const hit = Math.min(outs * multiplier, 100);

    // Pot odds: what you pay as a share of the pot you'd be playing for.
    const total = pot + toCall;
    const odds = total > 0 ? (toCall / total) * 100 : 0;

    return {
      hitPct: hit,
      potOddsPct: odds,
      verdict: hit >= odds,
    };
  }, [outs, pot, toCall, street]);

  return (
    <div className="glass not-prose my-6 rounded-2xl p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Outs */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Antall outs
          </label>
          <input
            type="number"
            min={0}
            max={20}
            value={outs}
            onChange={(e) => setOuts(clamp(Number(e.target.value), 0, 20))}
            className="field mt-1.5 w-full px-3 py-2 text-lg tabular-nums"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setOuts(p.outs)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  outs === p.outs
                    ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                    : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Street toggle */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Hvor er du?
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {(["flop", "turn"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStreet(s)}
                className={`rounded-lg border py-2 text-sm font-semibold capitalize transition ${
                  street === s
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 text-zinc-400 hover:border-white/25"
                }`}
              >
                {s === "flop" ? "Flop (2 kort igjen)" : "Turn (1 kort igjen)"}
              </button>
            ))}
          </div>
        </div>

        {/* Pot */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Pott (før din call)
          </label>
          <input
            type="number"
            min={0}
            value={pot}
            onChange={(e) => setPot(clamp(Number(e.target.value), 0, 1_000_000))}
            className="field mt-1.5 w-full px-3 py-2 text-lg tabular-nums"
          />
        </div>

        {/* To call */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Å betale (call)
          </label>
          <input
            type="number"
            min={0}
            value={toCall}
            onChange={(e) =>
              setToCall(clamp(Number(e.target.value), 0, 1_000_000))
            }
            className="field mt-1.5 w-full px-3 py-2 text-lg tabular-nums"
          />
        </div>
      </div>

      {/* Result */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Metric
          label="Sjanse for å treffe"
          value={`${hitPct.toFixed(0)} %`}
          hint={`${outs} outs × ${street === "flop" ? 4 : 2}`}
        />
        <Metric
          label="Pot odds du betaler"
          value={`${potOddsPct.toFixed(0)} %`}
          hint="break-even-grense"
        />
      </div>

      <div
        className={`mt-3 rounded-xl border p-4 text-sm ${
          verdict
            ? "border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-200"
            : "border-rose-400/30 bg-rose-400/[0.07] text-rose-200"
        }`}
      >
        <span className="font-bold">
          {verdict ? "✓ Lønnsom call" : "✗ Fold"}
        </span>{" "}
        — sjansen for å treffe ({hitPct.toFixed(0)} %) er{" "}
        {verdict ? "høyere enn" : "lavere enn"} pot odds ({potOddsPct.toFixed(0)}{" "}
        %).{" "}
        {verdict
          ? "Over tid tjener du på å bli med."
          : "Over tid taper du på å bli med – med mindre implied odds redder deg."}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 font-[family-name:var(--font-display)] text-3xl font-black text-white tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}
