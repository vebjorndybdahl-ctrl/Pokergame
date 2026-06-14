"use client";

import { computeStyle, type StyleStats } from "@/lib/poker/style";

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export default function StyleAnalysis({
  stats,
  onClose,
}: {
  stats: StyleStats;
  onClose: () => void;
}) {
  const r = computeStyle(stats);

  // Quadrant dot: x = passive→aggressive, y = loose(top)→tight(bottom).
  const x = Math.min(1, r.af / 2); // af 0..2+ -> 0..1
  const yLoose = Math.min(1, r.vpip / 0.6); // vpip 0..0.6 -> 0..1
  const dotLeft = `${8 + x * 84}%`;
  const dotTop = `${8 + (1 - yLoose) * 84}%`;

  const corners = [
    { label: "🚉 Kallestasjon", pos: "left-2 top-2" },
    { label: "🌪️ Maniac", pos: "right-2 top-2 text-right" },
    { label: "🪨 Klippen", pos: "left-2 bottom-2" },
    { label: "🦈 Hai", pos: "right-2 bottom-2 text-right" },
  ];

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-black text-white">
          Spillestilen din
        </h3>
        <button
          onClick={onClose}
          className="text-sm text-zinc-400 hover:text-white"
        >
          Lukk ✕
        </button>
      </div>

      {!r.ready ? (
        <p className="mt-3 text-sm text-zinc-400">
          Spill {r.handsLeft} hender til så analyserer vi spillestilen din.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-4xl">{r.archetype!.emoji}</span>
            <div>
              <div className="font-[family-name:var(--font-display)] text-2xl font-black text-white">
                {r.archetype!.name}
              </div>
              <div className="text-xs text-zinc-400">
                {r.archetype!.tight ? "Stram" : "Løs"} ·{" "}
                {r.archetype!.aggressive ? "Aggressiv" : "Passiv"}
              </div>
            </div>
          </div>
          <p className="mt-2 text-sm text-zinc-300">{r.archetype!.blurb}</p>
          <div className="glass-emerald mt-3 rounded-xl px-4 py-2.5 text-sm text-emerald-100/90">
            <span className="font-semibold">Tips:</span> {r.archetype!.tip}
          </div>
        </>
      )}

      {/* Quadrant map */}
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-[16rem] rounded-xl border border-white/10 bg-black/20">
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
        <div className="absolute top-1/2 left-0 h-px w-full bg-white/10" />
        {corners.map((c) => (
          <span
            key={c.label}
            className={`absolute ${c.pos} text-[10px] font-medium text-zinc-500`}
          >
            {c.label}
          </span>
        ))}
        {stats.hands > 0 && (
          <span
            className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(245,212,114,0.8)] ring-2 ring-black/40"
            style={{ left: dotLeft, top: dotTop }}
          />
        )}
        <span className="absolute -bottom-5 left-0 text-[10px] text-zinc-600">
          passiv
        </span>
        <span className="absolute -bottom-5 right-0 text-[10px] text-zinc-600">
          aggressiv
        </span>
      </div>

      {/* Stat line */}
      <div className="mt-7 grid grid-cols-4 gap-2 text-center">
        <Stat label="Hender" value={String(stats.hands)} />
        <Stat label="VPIP" value={pct(r.vpip)} />
        <Stat label="PFR" value={pct(r.pfr)} />
        <Stat label="Aggr." value={r.af.toFixed(1)} />
      </div>
      <p className="mt-2 text-center text-[11px] text-zinc-600">
        VPIP = hvor ofte du blir med før floppen · PFR = hvor ofte du høyner ·
        Aggr. = høyninger per call
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 py-2">
      <div className="font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}
