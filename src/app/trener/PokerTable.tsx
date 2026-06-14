"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { makeRng } from "@/lib/poker/cards";
import {
  createHand,
  applyAction,
  legalActions,
  isComplete,
  settle,
  totalPot,
} from "@/lib/poker/engine";
import { estimateEquity } from "@/lib/poker/equity";
import { describeRank } from "@/lib/poker/evaluator";
import type { Action, HandState, ShowdownResult } from "@/lib/poker/types";
import { PlayingCard } from "./PlayingCard";

const START_STACK = 1000;
const SB = 10;
const BB = 20;
const BOT_NAMES = ["Rex", "Nova", "Zara", "Milo", "Ivy"];

function bb(chips: number): string {
  const v = chips / BB;
  return Number.isInteger(v) ? `${v}bb` : `${v.toFixed(1)}bb`;
}

// Basic equity-vs-pot-odds bot (Phase 2). Difficulty levels arrive in Phase 3.
function basicBotAction(state: HandState): Action {
  const seat = state.seats[state.toAct];
  const legal = legalActions(state);
  const liveOpponents = state.seats.filter(
    (s) => s.status !== "folded" && s.id !== seat.id,
  ).length;
  const eq = estimateEquity({
    hero: seat.hole,
    board: state.board,
    opponents: Math.max(1, liveOpponents),
    iterations: 600,
    rng: state.rng,
  }).equity;
  const pot = totalPot(state);
  const toCall = legal.callAmount;

  if (legal.canCheck) {
    if (eq > 0.6 && legal.canRaise && state.rng() < 0.7) {
      const size = legal.sizes.find((s) => s.label === "½ pott") ?? legal.sizes[0];
      return { seat: seat.id, type: "raise", amount: size.to };
    }
    return { seat: seat.id, type: "check" };
  }

  const potOdds = toCall / (pot + toCall);
  if (eq > 0.82 && legal.canRaise) {
    const size =
      legal.sizes.find((s) => s.label === "¾ pott") ??
      legal.sizes[legal.sizes.length - 1];
    return { seat: seat.id, type: "raise", amount: size.to };
  }
  if (eq >= potOdds + 0.03) return { seat: seat.id, type: "call" };
  if (toCall <= BB && eq > 0.25) return { seat: seat.id, type: "call" };
  return { seat: seat.id, type: "fold" };
}

export default function PokerTable({
  isLoggedIn,
  username,
}: {
  isLoggedIn: boolean;
  username: string | null;
}) {
  const [tableSize, setTableSize] = useState(4);
  const [phase, setPhase] = useState<"setup" | "playing" | "showdown">("setup");
  const [hand, setHand] = useState<HandState | null>(null);
  const [result, setResult] = useState<ShowdownResult | null>(null);
  const buttonRef = useRef(0);

  // The engine mutates the hand in place; re-render by handing React a new
  // top-level object (the nested data, incl. the rng closure, is shared).
  const touch = useCallback(() => setHand((h) => (h ? { ...h } : h)), []);

  const startHand = useCallback(() => {
    setHand((prev) => {
      const seats: Parameters<typeof createHand>[0]["seats"] = [
        { name: username ?? "Deg", stack: START_STACK, isHero: true },
      ];
      for (let i = 0; i < tableSize - 1; i++) {
        seats.push({
          name: BOT_NAMES[i],
          stack: START_STACK,
          isHero: false,
          botLevel: "middels",
        });
      }

      // Carry stacks across hands; auto-rebuy below a big blind; move button.
      if (prev && prev.seats.length === seats.length) {
        for (let i = 0; i < seats.length; i++) {
          seats[i].stack =
            prev.seats[i].stack < BB ? START_STACK : prev.seats[i].stack;
        }
        buttonRef.current = (buttonRef.current + 1) % seats.length;
      } else {
        buttonRef.current = 0;
      }

      const seed = Math.floor(Math.random() * 2 ** 31);
      return createHand({
        seats,
        button: buttonRef.current,
        sb: SB,
        bb: BB,
        rng: makeRng(seed),
      });
    });
    setResult(null);
    setPhase("playing");
  }, [tableSize, username]);

  // Apply an action, then either settle (hand over) or re-render for the next
  // turn. Kept out of the effect body so state updates happen in handlers.
  const applyAndSync = useCallback(
    (st: HandState, action: Action) => {
      applyAction(st, action);
      if (isComplete(st)) {
        setResult(settle(st));
        setPhase("showdown");
      }
      touch();
    },
    [touch],
  );

  // Drive the bots: whenever it's a bot's turn, act after a short beat.
  useEffect(() => {
    if (phase !== "playing" || !hand) return;
    const seat = hand.seats[hand.toAct];
    if (!seat || seat.isHero) return; // hero's turn (or none) — wait
    const id = setTimeout(() => {
      applyAndSync(hand, basicBotAction(hand));
    }, 600);
    return () => clearTimeout(id);
  }, [hand, phase, applyAndSync]);

  const heroAct = useCallback(
    (action: Action) => {
      if (hand) applyAndSync(hand, action);
    },
    [hand, applyAndSync],
  );

  if (phase === "setup" || !hand) {
    return (
      <Setup
        tableSize={tableSize}
        setTableSize={setTableSize}
        onStart={startHand}
        isLoggedIn={isLoggedIn}
      />
    );
  }

  const st = hand;
  const pot = totalPot(st);
  const heroTurn =
    phase === "playing" && st.toAct >= 0 && st.seats[st.toAct].isHero;
  const showdown = phase === "showdown";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      {/* Felt */}
      <div className="relative mx-auto aspect-[4/3] w-full max-w-2xl">
        <div
          className="absolute inset-2 rounded-[46%] border-2"
          style={{
            background:
              "radial-gradient(ellipse at center, #0c5238 0%, #07301f 80%)",
            borderColor: "rgba(245,212,114,0.22)",
          }}
        />

        {/* Pot + board */}
        <div className="absolute left-1/2 top-[38%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          <div className="flex gap-1.5">
            {st.board.map((c, i) => (
              <PlayingCard key={i} card={c} small />
            ))}
            {st.board.length === 0 && (
              <span className="text-xs text-emerald-200/40">— flop kommer —</span>
            )}
          </div>
          <div className="rounded-full bg-black/30 px-3 py-1 text-sm font-bold text-amber-200">
            Pott {bb(pot)}
          </div>
        </div>

        {/* Seats */}
        {st.seats.map((seat, i) => {
          const angle = (Math.PI / 2) + (i / st.seats.length) * 2 * Math.PI;
          const left = 50 + 46 * Math.cos(angle);
          const top = 50 + 44 * Math.sin(angle);
          const isActive = st.toAct === i && phase === "playing";
          const reveal = seat.isHero || (showdown && seat.status !== "folded");
          return (
            <div
              key={seat.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <div
                className={`flex flex-col items-center gap-1 rounded-xl border px-2.5 py-1.5 transition ${
                  isActive
                    ? "border-amber-300 bg-amber-300/10 shadow-lg"
                    : "border-white/10 bg-zinc-900/70"
                } ${seat.status === "folded" ? "opacity-40" : ""}`}
              >
                <div className="flex items-center gap-1">
                  {st.button === i && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-zinc-900">
                      D
                    </span>
                  )}
                  <span className="text-xs font-semibold text-white">
                    {seat.name}
                  </span>
                </div>
                <div className="flex gap-0.5">
                  {seat.hole.map((c, k) => (
                    <PlayingCard
                      key={k}
                      card={reveal ? c : undefined}
                      hidden={!reveal}
                      small
                    />
                  ))}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {seat.status === "allin" ? (
                    <span className="text-rose-300">All-in</span>
                  ) : seat.status === "folded" ? (
                    "Foldet"
                  ) : (
                    bb(seat.stack)
                  )}
                </div>
                {seat.committedThisStreet > 0 && (
                  <div className="text-[10px] font-bold text-amber-200/80">
                    {bb(seat.committedThisStreet)}
                  </div>
                )}
                {showdown && reveal && result?.bestBySeat[i] != null && (
                  <div className="text-[10px] text-emerald-300">
                    {describeRank(result.bestBySeat[i] as number)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls / result */}
      <div className="mx-auto mt-5 max-w-xl">
        {heroTurn && <BetControls state={st} onAct={heroAct} />}
        {showdown && result && (
          <Showdown
            state={st}
            result={result}
            onNext={startHand}
            isLoggedIn={isLoggedIn}
          />
        )}
        {!heroTurn && !showdown && (
          <p className="text-center text-sm text-zinc-500">Motstanderne tenker…</p>
        )}
      </div>
    </main>
  );
}

function Setup({
  tableSize,
  setTableSize,
  onStart,
  isLoggedIn,
}: {
  tableSize: number;
  setTableSize: (n: number) => void;
  onStart: () => void;
  isLoggedIn: boolean;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
      <div className="animate-rise text-center">
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-black tracking-tight">
          <span className="gold-text">Trener</span>
        </h1>
        <p className="mt-3 text-zinc-300/90">
          Spill ekte hender mot maskinen og test ferdighetene dine.
        </p>
      </div>

      <div className="glass animate-rise mt-7 rounded-3xl p-6">
        <div className="text-sm font-semibold text-zinc-200">Antall spillere</div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => setTableSize(n)}
              className={`rounded-lg border py-2 text-sm font-bold transition ${
                tableSize === n
                  ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 text-zinc-400 hover:border-white/25"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={onStart}
          className="btn-gold mt-5 w-full rounded-xl px-4 py-3 font-bold tracking-wide"
        >
          Start spillet
        </button>
        {!isLoggedIn && (
          <p className="mt-3 text-center text-xs text-zinc-500">
            Du spiller som gjest. Logg inn for å lagre rangeringen din senere.
          </p>
        )}
      </div>
    </main>
  );
}

function BetControls({
  state,
  onAct,
}: {
  state: HandState;
  onAct: (a: Action) => void;
}) {
  const seat = state.seats[state.toAct];
  const legal = legalActions(state);
  const id = seat.id;
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {legal.canFold && (
          <button
            onClick={() => onAct({ seat: id, type: "fold" })}
            className="rounded-xl border border-rose-400/30 px-5 py-2.5 font-bold text-rose-200 transition hover:bg-rose-400/10"
          >
            Fold
          </button>
        )}
        {legal.canCheck && (
          <button
            onClick={() => onAct({ seat: id, type: "check" })}
            className="rounded-xl border border-white/15 px-5 py-2.5 font-bold text-zinc-200 transition hover:border-white/30"
          >
            Sjekk
          </button>
        )}
        {legal.canCall && (
          <button
            onClick={() => onAct({ seat: id, type: "call" })}
            className="btn-emerald rounded-xl px-5 py-2.5 font-bold"
          >
            Call {bb(legal.callAmount)}
          </button>
        )}
      </div>
      {legal.canRaise && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="mb-2 text-center text-xs uppercase tracking-wider text-zinc-500">
            Høyne til
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {legal.sizes.map((s) => (
              <button
                key={s.label}
                onClick={() => onAct({ seat: id, type: "raise", amount: s.to })}
                className="btn-gold rounded-lg px-3.5 py-2 text-sm font-bold"
              >
                {s.label} ({bb(s.to)})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Showdown({
  state,
  result,
  onNext,
  isLoggedIn,
}: {
  state: HandState;
  result: ShowdownResult;
  onNext: () => void;
  isLoggedIn: boolean;
}) {
  const winners = state.seats
    .map((s, i) => ({ s, i, won: result.payout[i] }))
    .filter((x) => x.won > 0)
    .sort((a, b) => b.won - a.won);

  return (
    <div className="glass-emerald rounded-2xl p-5 text-center">
      <div className="text-sm font-semibold uppercase tracking-wider text-emerald-200/70">
        Resultat
      </div>
      <div className="mt-1 space-y-0.5">
        {winners.map((w) => (
          <div key={w.i} className="font-bold text-white">
            {w.s.name} vinner {bb(w.won)}
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="btn-gold mt-4 rounded-xl px-6 py-2.5 font-bold tracking-wide"
      >
        Neste hånd
      </button>
      {!isLoggedIn && (
        <p className="mt-3 text-xs text-emerald-100/50">
          Coaching og rangering kommer — logg inn for å lagre fremgangen din.
        </p>
      )}
    </div>
  );
}
