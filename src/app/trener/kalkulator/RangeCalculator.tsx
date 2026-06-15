"use client";

import { useMemo, useState } from "react";
import { cardToString, parseCard, type Card } from "@/lib/poker/cards";
import { rangeEquity } from "@/lib/poker/equity";
import {
  buildGrid,
  combosOf,
  expandCombos,
  topPercentKeys,
  TOTAL_COMBOS,
} from "@/lib/poker/grid";
import HandGrid from "./HandGrid";

type VillainMode = "range" | "hand";

function CardSelect({
  value,
  onChange,
  used,
}: {
  value: Card | null;
  onChange: (c: Card | null) => void;
  used: Set<Card>;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) =>
        onChange(e.target.value === "" ? null : Number(e.target.value))
      }
      className="field px-2 py-1.5 font-mono text-sm"
    >
      <option value="">—</option>
      {Array.from({ length: 52 }, (_, c) => (
        <option key={c} value={c} disabled={used.has(c) && c !== value}>
          {cardToString(c)}
        </option>
      ))}
    </select>
  );
}

type Result = { equity: number; win: number; tie: number; rangePct: number };

export default function RangeCalculator() {
  const grid = useMemo(() => buildGrid(), []);
  const [hero, setHero] = useState<[Card | null, Card | null]>([
    parseCard("As"),
    parseCard("Ks"),
  ]);
  const [board, setBoard] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [mode, setMode] = useState<VillainMode>("range");
  const [selected, setSelected] = useState<Set<string>>(() =>
    topPercentKeys(grid, 20),
  );
  const [villainHand, setVillainHand] = useState<[Card | null, Card | null]>([
    parseCard("Qd"),
    parseCard("Qc"),
  ]);
  const [result, setResult] = useState<Result | null>(null);
  const [computing, setComputing] = useState(false);

  const used = useMemo(() => {
    const s = new Set<Card>();
    for (const c of hero) if (c !== null) s.add(c);
    for (const c of board) if (c !== null) s.add(c);
    if (mode === "hand") for (const c of villainHand) if (c !== null) s.add(c);
    return s;
  }, [hero, board, villainHand, mode]);

  const selectedCombos = combosOf(grid, selected);
  const rangePct = Math.round((selectedCombos / TOTAL_COMBOS) * 100);
  const heroReady = hero[0] !== null && hero[1] !== null && hero[0] !== hero[1];
  const villainReady =
    mode === "range"
      ? selected.size > 0
      : villainHand[0] !== null &&
        villainHand[1] !== null &&
        villainHand[0] !== villainHand[1];

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setResult(null);
  }

  function preset(pct: number | "all" | "clear") {
    if (pct === "all") setSelected(new Set(grid.flat().map((c) => c.key)));
    else if (pct === "clear") setSelected(new Set());
    else setSelected(topPercentKeys(grid, pct));
    setResult(null);
  }

  function compute() {
    if (!heroReady || !villainReady) return;
    setComputing(true);
    setResult(null);
    requestAnimationFrame(() => {
      const boardCards = board.filter((c): c is Card => c !== null);
      const villain: [Card, Card][] =
        mode === "range"
          ? expandCombos(grid, selected, new Set<Card>(used))
          : [[villainHand[0] as Card, villainHand[1] as Card]];
      const r = rangeEquity({
        hero: [hero[0] as Card, hero[1] as Card],
        board: boardCards,
        villain,
        iterations: 12000,
      });
      setResult({
        equity: r.equity,
        win: r.win,
        tie: r.tie,
        rangePct,
      });
      setComputing(false);
    });
  }

  return (
    <div className="space-y-5">
      {/* Hero hand + board */}
      <div className="glass rounded-2xl p-5">
        <div className="text-sm font-semibold text-zinc-200">Din hånd</div>
        <div className="mt-2 flex gap-2">
          <CardSelect
            value={hero[0]}
            onChange={(c) => {
              setHero([c, hero[1]]);
              setResult(null);
            }}
            used={used}
          />
          <CardSelect
            value={hero[1]}
            onChange={(c) => {
              setHero([hero[0], c]);
              setResult(null);
            }}
            used={used}
          />
        </div>

        <div className="mt-4 text-sm font-semibold text-zinc-200">
          Bord <span className="text-zinc-500">(valgfritt)</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {board.map((c, i) => (
            <CardSelect
              key={i}
              value={c}
              onChange={(nc) => {
                const nb = [...board];
                nb[i] = nc;
                setBoard(nb);
                setResult(null);
              }}
              used={used}
            />
          ))}
        </div>
      </div>

      {/* Opponent */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-zinc-200">Motstander</span>
          <div className="flex rounded-lg border border-white/10 p-0.5 text-xs">
            {(["range", "hand"] as VillainMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setResult(null);
                }}
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  mode === m
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {m === "range" ? "Range" : "Hånd"}
              </button>
            ))}
          </div>
        </div>

        {mode === "hand" ? (
          <div className="flex gap-2">
            <CardSelect
              value={villainHand[0]}
              onChange={(c) => {
                setVillainHand([c, villainHand[1]]);
                setResult(null);
              }}
              used={used}
            />
            <CardSelect
              value={villainHand[1]}
              onChange={(c) => {
                setVillainHand([villainHand[0], c]);
                setResult(null);
              }}
              used={used}
            />
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex flex-wrap gap-1.5">
                {[10, 20, 40].map((p) => (
                  <button
                    key={p}
                    onClick={() => preset(p)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 font-medium text-zinc-300 transition hover:border-emerald-400/40 hover:text-white"
                  >
                    Topp {p}%
                  </button>
                ))}
                <button
                  onClick={() => preset("all")}
                  className="rounded-lg border border-white/10 px-2.5 py-1 font-medium text-zinc-300 transition hover:border-white/25"
                >
                  Alle
                </button>
                <button
                  onClick={() => preset("clear")}
                  className="rounded-lg border border-white/10 px-2.5 py-1 font-medium text-zinc-400 transition hover:text-rose-300"
                >
                  Tøm
                </button>
              </div>
              <span>
                {rangePct}% · {selectedCombos} komb.
              </span>
            </div>
            <HandGrid grid={grid} selected={selected} onToggle={toggle} />
            <p className="mt-2 text-[11px] text-zinc-500">
              Trykk på hender for å bygge rangen. Diagonalen er par, over er
              samme sort (s), under er ulik sort (o).
            </p>
          </>
        )}
      </div>

      <button
        onClick={compute}
        disabled={!heroReady || !villainReady || computing}
        className="btn-gold w-full rounded-xl px-4 py-3 font-bold tracking-wide disabled:opacity-50"
      >
        {computing ? "Regner…" : "Beregn equity"}
      </button>
      {(!heroReady || !villainReady) && (
        <p className="text-center text-xs text-zinc-500">
          Velg din hånd og motstanderens {mode === "hand" ? "hånd" : "range"}.
        </p>
      )}

      {result && (
        <div className="glass-emerald rounded-2xl p-6 text-center">
          <div className="text-sm font-semibold uppercase tracking-wider text-emerald-200/70">
            Din equity
          </div>
          <div className="mt-1 font-[family-name:var(--font-display)] text-6xl font-black tabular-nums text-white">
            {Math.round(result.equity * 100)}%
          </div>
          <div className="mx-auto mt-3 h-2.5 max-w-xs overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-300"
              style={{ width: `${Math.round(result.equity * 100)}%` }}
            />
          </div>
          <div className="mt-3 text-sm text-zinc-300">
            {mode === "hand" ? (
              <>
                vinner {Math.round(result.win * 100)}%
                {result.tie > 0.005 && (
                  <> · uavgjort {Math.round(result.tie * 100)}%</>
                )}
              </>
            ) : (
              <>mot en {result.rangePct}% range</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
