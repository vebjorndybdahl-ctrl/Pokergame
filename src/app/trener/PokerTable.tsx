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
import { EMPTY_STATS, type StyleStats } from "@/lib/poker/style";
import { PlayingCard } from "./PlayingCard";
import StyleAnalysis from "./StyleAnalysis";

const START_STACK = 1000;
const SB = 10;
const BB = 20;
const BOT_NAMES = ["Rex", "Nova", "Zara", "Milo", "Ivy"];

function bb(chips: number): string {
  const v = chips / BB;
  return Number.isInteger(v) ? `${v}bb` : `${v.toFixed(1)}bb`;
}

// Basic equity-vs-pot-odds bot (difficulty levels arrive in Phase 3).
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
  const [stats, setStats] = useState<StyleStats>(EMPTY_STATS);
  const [showStyle, setShowStyle] = useState(false);
  const buttonRef = useRef(0);
  const handVpipRef = useRef(false);
  const handPfrRef = useRef(false);

  const touch = useCallback(() => setHand((h) => (h ? { ...h } : h)), []);

  const startHand = useCallback(() => {
    handVpipRef.current = false;
    handPfrRef.current = false;
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
    setStats((s) => ({ ...s, hands: s.hands + 1 }));
    setResult(null);
    setPhase("playing");
  }, [tableSize, username]);

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

  // Bots: act after a natural, variable pause (1.4–2.9s).
  useEffect(() => {
    if (phase !== "playing" || !hand) return;
    const seat = hand.seats[hand.toAct];
    if (!seat || seat.isHero) return;
    const delay = 1400 + Math.floor(Math.random() * 1500);
    const id = setTimeout(() => {
      applyAndSync(hand, basicBotAction(hand));
    }, delay);
    return () => clearTimeout(id);
  }, [hand, phase, applyAndSync]);

  const heroAct = useCallback(
    (action: Action) => {
      if (!hand) return;
      const stage = hand.stage;
      setStats((s) => {
        const ns = { ...s };
        if (action.type === "raise") {
          ns.aggressiveActions++;
          if (stage === "preflop") {
            if (!handPfrRef.current) {
              handPfrRef.current = true;
              ns.pfrHands++;
            }
            if (!handVpipRef.current) {
              handVpipRef.current = true;
              ns.vpipHands++;
            }
          }
        } else if (action.type === "call") {
          ns.passiveActions++;
          if (stage === "preflop" && !handVpipRef.current) {
            handVpipRef.current = true;
            ns.vpipHands++;
          }
        } else if (action.type === "fold") {
          ns.folds++;
        }
        return ns;
      });
      applyAndSync(hand, action);
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
  const heroSeat = st.seats.find((s) => s.isHero)!;
  const heroTurn =
    phase === "playing" && st.toAct >= 0 && st.seats[st.toAct].isHero;
  const showdown = phase === "showdown";
  const blinds = `${SB / BB}/${BB / BB} bb`;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-4">
      {/* Top bar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          Blinds {blinds} · {st.seats.length} spillere
        </div>
        <button
          onClick={() => setShowStyle(true)}
          className="rounded-lg border border-amber-300/30 bg-amber-300/5 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-300/10"
        >
          📊 Spillestil
        </button>
      </div>

      {/* Table */}
      <div className="relative mx-auto w-full max-w-sm">
        <div
          className="relative aspect-[5/6] w-full rounded-[44%] p-2.5 shadow-2xl"
          style={{
            background: "linear-gradient(160deg, #6b4423 0%, #2c1a0d 100%)",
          }}
        >
          <div
            className="relative h-full w-full overflow-hidden rounded-[43%] border border-amber-200/10"
            style={{
              background:
                "radial-gradient(ellipse at 50% 42%, #11653f 0%, #0a3a26 70%, #062417 100%)",
              boxShadow: "inset 0 0 60px rgba(0,0,0,0.55)",
            }}
          >
            {/* Center: pot + board */}
            <div className="absolute left-1/2 top-[40%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2.5">
              <div className="rounded-full bg-black/35 px-4 py-1 text-sm font-bold text-amber-200 ring-1 ring-amber-300/20">
                Pott {bb(pot)}
              </div>
              <div className="flex gap-1.5">
                {st.board.length > 0 ? (
                  st.board.map((c, i) => <PlayingCard key={i} card={c} />)
                ) : (
                  <span className="text-xs italic text-emerald-200/30">
                    venter på floppen
                  </span>
                )}
              </div>
            </div>

            {/* Seats */}
            {st.seats.map((seat, i) => {
              const angle = Math.PI / 2 + (i / st.seats.length) * 2 * Math.PI;
              const left = 50 + 37 * Math.cos(angle);
              const top = 50 + 41 * Math.sin(angle);
              const isActive = st.toAct === i && phase === "playing";
              const revealCards =
                !seat.isHero && showdown && seat.status !== "folded";
              return (
                <div
                  key={seat.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  <div
                    className={`flex w-[4.75rem] flex-col items-center gap-1 rounded-xl border px-1.5 py-1 backdrop-blur-sm transition ${
                      isActive
                        ? "border-amber-300 bg-amber-300/15 shadow-[0_0_18px_rgba(245,212,114,0.45)]"
                        : "border-white/10 bg-black/45"
                    } ${seat.status === "folded" ? "opacity-35" : ""}`}
                  >
                    <div className="flex items-center gap-1">
                      {st.button === i && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-zinc-900">
                          D
                        </span>
                      )}
                      <span className="truncate text-xs font-semibold text-white">
                        {seat.isHero ? "Deg" : seat.name}
                      </span>
                    </div>

                    {!seat.isHero && (
                      <div className="flex gap-0.5">
                        {seat.hole.map((c, k) => (
                          <PlayingCard
                            key={k}
                            card={revealCards ? c : undefined}
                            hidden={!revealCards}
                            small
                          />
                        ))}
                      </div>
                    )}

                    <div className="rounded-full bg-black/40 px-2 text-[11px] font-medium text-emerald-200/90">
                      {seat.status === "folded" ? "fold" : bb(seat.stack)}
                    </div>

                    {isActive && (
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map((d) => (
                          <span
                            key={d}
                            className="h-1 w-1 animate-bounce rounded-full bg-amber-300"
                            style={{ animationDelay: `${d * 0.15}s` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Current bet chip toward the centre */}
                  {seat.committedThisStreet > 0 && (
                    <div className="mt-1 text-center text-[10px] font-bold text-amber-300/90">
                      {bb(seat.committedThisStreet)}
                    </div>
                  )}
                  {revealCards && result?.bestBySeat[i] != null && (
                    <div className="mt-0.5 text-center text-[10px] text-emerald-300">
                      {describeRank(result.bestBySeat[i] as number)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Style overlay */}
        {showStyle && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[44%] bg-black/85 p-3">
            <div className="w-full max-w-sm rounded-2xl bg-zinc-950/95">
              <StyleAnalysis stats={stats} onClose={() => setShowStyle(false)} />
            </div>
          </div>
        )}
      </div>

      {/* Hero cards + controls */}
      <div className="mx-auto mt-4 max-w-lg">
        <div className="mb-3 flex items-center justify-center gap-3">
          <div className="flex gap-1.5">
            {heroSeat.hole.map((c, k) => (
              <PlayingCard key={k} card={c} />
            ))}
          </div>
          <div className="text-sm">
            <div className="font-bold text-white">Deg</div>
            <div className="text-emerald-300">{bb(heroSeat.stack)}</div>
          </div>
        </div>

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
          <p className="text-center text-sm text-zinc-500">
            {st.toAct >= 0 ? `${st.seats[st.toAct].name} tenker…` : "…"}
          </p>
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
            {w.s.isHero ? "Du" : w.s.name} vinner {bb(w.won)}
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
