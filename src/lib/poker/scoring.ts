import { makeRng, type Card } from "./cards";
import { legalActions, totalPot } from "./engine";
import { estimateEquity } from "./equity";
import type { Action, HandState } from "./types";

export type Verdict = "optimal" | "bra" | "unøyaktig" | "feil" | "tabbe";

export type DecisionScore = {
  equity: number; // 0..1
  potOdds: number; // 0..1, 0 if checking is free
  recommend: "fold" | "check" | "call" | "raise";
  chosen: "fold" | "check" | "call" | "raise";
  evLossBb: number;
  qualityPct: number; // 0..100
  verdict: Verdict;
  explanation: string;
};

// Deterministic rng per spot so the live hint and the post-hand verdict for the
// same decision agree (and so it has no side effects on the deck).
function spotRng(state: HandState, seatId: number): () => number {
  const cards = [...state.seats[seatId].hole, ...state.board];
  let h = 2166136261;
  for (const c of cards) h = (Math.imul(h ^ c, 16777619) + state.stage.length) | 0;
  return makeRng(h >>> 0);
}

function pct(x: number): number {
  return Math.round(x * 100);
}

// Pure analysis of the spot (no action chosen yet) — powers the live hint.
export function analyzeSpot(
  state: HandState,
  iterations = 1500,
): {
  equity: number;
  potOdds: number;
  recommend: "fold" | "check" | "call" | "raise";
  toCall: number;
} {
  const seat = state.seats[state.toAct];
  const legal = legalActions(state);
  const liveOpp = state.seats.filter(
    (s) => s.status !== "folded" && s.id !== seat.id,
  ).length;
  const equity = estimateEquity({
    hero: seat.hole as Card[],
    board: state.board,
    opponents: Math.max(1, liveOpp),
    iterations,
    rng: spotRng(state, seat.id),
  }).equity;

  const pot = totalPot(state);
  const toCall = legal.callAmount;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

  let recommend: "fold" | "check" | "call" | "raise";
  if (toCall === 0) {
    recommend = legal.canRaise && equity > 0.68 ? "raise" : "check";
  } else if (legal.canRaise && equity > 0.72) {
    recommend = "raise";
  } else if (equity >= potOdds) {
    recommend = "call";
  } else {
    recommend = "fold";
  }
  return { equity, potOdds, recommend, toCall };
}

function verdictOf(evLoss: number): Verdict {
  if (evLoss <= 0.05) return "optimal";
  if (evLoss < 0.4) return "bra";
  if (evLoss < 1.2) return "unøyaktig";
  if (evLoss < 2.8) return "feil";
  return "tabbe";
}

// Grade the hero's actual decision. EV is a transparent heuristic (pot odds +
// equity); it does not solve future betting trees — directional, not gospel.
export function scoreHeroDecision(
  state: HandState,
  action: Action,
  iterations = 1500,
): DecisionScore {
  const { equity, potOdds, recommend, toCall } = analyzeSpot(state, iterations);
  const bb = state.bb;
  const pot = totalPot(state);

  const chosen: DecisionScore["chosen"] =
    action.type === "raise"
      ? "raise"
      : action.type === "call"
        ? "call"
        : action.type === "check"
          ? "check"
          : "fold";

  // EV (in bb) of calling vs folding, from this point forward.
  const evCallBb = toCall > 0 ? (equity * (pot + toCall) - toCall) / bb : 0;

  let evLossBb = 0;
  let explanation = "";

  if (toCall === 0) {
    // Free to check. Only real mistake is checking a hand that should bet.
    if (recommend === "raise" && chosen !== "raise") {
      evLossBb = Math.max(0, (equity - 0.5) * (pot / bb) * 0.5);
      explanation = `Med ~${pct(equity)}% equity var dette en verdi-bet du lot gå.`;
    } else {
      explanation =
        chosen === "raise"
          ? `Grei aggresjon med ~${pct(equity)}% equity.`
          : `Helt fint å sjekke her med ~${pct(equity)}% equity.`;
    }
  } else if (chosen === "fold") {
    // Folding gives up evCall if it was positive.
    evLossBb = Math.max(0, evCallBb);
    explanation =
      evCallBb > 0
        ? `Du foldet, men med ${pct(equity)}% equity mot ${pct(potOdds)}% pott-odds var det lønnsomt å bli med (~+${evCallBb.toFixed(1)} bb).`
        : `Korrekt fold — ${pct(equity)}% equity er for lite mot ${pct(potOdds)}% pott-odds.`;
  } else if (chosen === "call") {
    evLossBb = Math.max(0, -evCallBb); // calling a -EV spot loses |evCall|
    explanation =
      evCallBb >= 0
        ? `Bra call — ${pct(equity)}% equity slår ${pct(potOdds)}% pott-odds.`
        : `Du callet med bare ${pct(equity)}% equity mot ${pct(potOdds)}% pott-odds (~${evCallBb.toFixed(1)} bb).`;
  } else {
    // raise
    if (recommend === "raise") {
      explanation = `Sterk høyning med ~${pct(equity)}% equity.`;
    } else if (equity >= potOdds) {
      evLossBb = 0.3;
      explanation = `Høyning er offensivt med ~${pct(equity)}% equity — call var tryggere.`;
    } else {
      // raising a weak hand: treat as a bluff; mild penalty unless very weak
      evLossBb = equity < 0.25 ? 1.5 : 0.8;
      explanation = `Høyning som bløff med bare ~${pct(equity)}% equity — høy risiko.`;
    }
  }

  const qualityPct = Math.max(0, Math.min(100, Math.round(100 - evLossBb * 22)));

  return {
    equity,
    potOdds,
    recommend,
    chosen,
    evLossBb,
    qualityPct,
    verdict: verdictOf(evLossBb),
    explanation,
  };
}

export const VERDICT_META: Record<
  Verdict,
  { label: string; color: string }
> = {
  optimal: { label: "Optimal", color: "text-emerald-300" },
  bra: { label: "Bra", color: "text-emerald-300" },
  unøyaktig: { label: "Unøyaktig", color: "text-amber-300" },
  feil: { label: "Feil", color: "text-rose-300" },
  tabbe: { label: "Tabbe", color: "text-rose-400" },
};
