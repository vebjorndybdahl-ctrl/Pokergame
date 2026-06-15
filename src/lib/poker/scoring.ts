import { makeRng, type Card } from "./cards";
import { legalActions, totalPot } from "./engine";
import { estimateEquity } from "./equity";
import { RANGE } from "./range";
import type { Action, HandState } from "./types";

// A player who is betting/raising into us has a stronger-than-random range.
function rangeFor(toCallBb: number): number {
  return toCallBb > 0 ? RANGE.BET : 0;
}

export type Verdict = "optimal" | "bra" | "unøyaktig" | "feil" | "tabbe";
export type ActionKind = "fold" | "check" | "call" | "raise";

export type DecisionScore = {
  equity: number; // 0..1
  potOdds: number; // 0..1, 0 if checking is free
  recommend: ActionKind;
  chosen: ActionKind;
  evLossBb: number;
  qualityPct: number; // 0..100
  verdict: Verdict;
  explanation: string;
};

// Deterministic rng per spot so the live hint and the post-hand verdict for the
// same decision agree (and it never touches the live deck).
function spotRng(cards: Card[], salt: number): () => number {
  let h = 2166136261 ^ salt;
  for (const c of cards) h = Math.imul(h ^ c, 16777619) | 0;
  return makeRng(h >>> 0);
}

function pct(x: number): number {
  return Math.round(x * 100);
}

function recommendOf(
  equity: number,
  potOdds: number,
  toCallBb: number,
  canRaise: boolean,
): ActionKind {
  if (toCallBb === 0) return canRaise && equity > 0.68 ? "raise" : "check";
  if (canRaise && equity > 0.72) return "raise";
  if (equity >= potOdds) return "call";
  return "fold";
}

function verdictOf(evLoss: number): Verdict {
  if (evLoss <= 0.05) return "optimal";
  if (evLoss < 0.4) return "bra";
  if (evLoss < 1.2) return "unøyaktig";
  if (evLoss < 2.8) return "feil";
  return "tabbe";
}

// Core grader (all amounts in big blinds). Shared by live play and drills.
export function gradeCore(
  equity: number,
  potBb: number,
  toCallBb: number,
  canRaise: boolean,
  chosen: ActionKind,
): DecisionScore {
  const potOdds = toCallBb > 0 ? toCallBb / (potBb + toCallBb) : 0;
  const recommend = recommendOf(equity, potOdds, toCallBb, canRaise);
  const evCallBb = toCallBb > 0 ? equity * (potBb + toCallBb) - toCallBb : 0;

  let evLossBb = 0;
  let explanation = "";

  if (toCallBb === 0) {
    if (recommend === "raise" && chosen !== "raise") {
      evLossBb = Math.max(0, (equity - 0.5) * potBb * 0.5);
      explanation = `Med ~${pct(equity)}% equity var dette en verdi-bet du lot gå.`;
    } else {
      explanation =
        chosen === "raise"
          ? `Grei aggresjon med ~${pct(equity)}% equity.`
          : `Helt fint å sjekke her med ~${pct(equity)}% equity.`;
    }
  } else if (chosen === "fold") {
    evLossBb = Math.max(0, evCallBb);
    explanation =
      evCallBb > 0
        ? `Du foldet, men med ${pct(equity)}% equity mot ${pct(potOdds)}% pott-odds var det lønnsomt å bli med (~+${evCallBb.toFixed(1)} bb).`
        : `Korrekt fold — ${pct(equity)}% equity er for lite mot ${pct(potOdds)}% pott-odds.`;
  } else if (chosen === "call") {
    evLossBb = Math.max(0, -evCallBb);
    explanation =
      evCallBb >= 0
        ? `Bra call — ${pct(equity)}% equity slår ${pct(potOdds)}% pott-odds.`
        : `Du callet med bare ${pct(equity)}% equity mot ${pct(potOdds)}% pott-odds (~${evCallBb.toFixed(1)} bb).`;
  } else {
    if (recommend === "raise") {
      explanation = `Sterk høyning med ~${pct(equity)}% equity.`;
    } else if (equity >= potOdds) {
      evLossBb = 0.3;
      explanation = `Høyning er offensivt med ~${pct(equity)}% equity — call var tryggere.`;
    } else {
      evLossBb = equity < 0.25 ? 1.5 : 0.8;
      explanation = `Høyning som bløff med bare ~${pct(equity)}% equity — høy risiko.`;
    }
  }

  return {
    equity,
    potOdds,
    recommend,
    chosen,
    evLossBb,
    qualityPct: Math.max(0, Math.min(100, Math.round(100 - evLossBb * 22))),
    verdict: verdictOf(evLossBb),
    explanation,
  };
}

// Live-game analysis for the hint (no action chosen yet).
export function analyzeSpot(
  state: HandState,
  iterations = 1500,
): { equity: number; potOdds: number; recommend: ActionKind; toCall: number } {
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
    rng: spotRng([...seat.hole, ...state.board], state.stage.length),
    oppMinStrength: rangeFor(legal.callAmount / state.bb),
  }).equity;
  const potBb = totalPot(state) / state.bb;
  const toCallBb = legal.callAmount / state.bb;
  const potOdds = toCallBb > 0 ? toCallBb / (potBb + toCallBb) : 0;
  return {
    equity,
    potOdds,
    recommend: recommendOf(equity, potOdds, toCallBb, legal.canRaise),
    toCall: legal.callAmount,
  };
}

// Grade the hero's actual decision in a live hand.
export function scoreHeroDecision(
  state: HandState,
  action: Action,
  iterations = 1500,
): DecisionScore {
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
    rng: spotRng([...seat.hole, ...state.board], state.stage.length),
    oppMinStrength: rangeFor(legal.callAmount / state.bb),
  }).equity;

  const chosen: ActionKind =
    action.type === "raise"
      ? "raise"
      : action.type === "call"
        ? "call"
        : action.type === "check"
          ? "check"
          : "fold";

  return gradeCore(
    equity,
    totalPot(state) / state.bb,
    legal.callAmount / state.bb,
    legal.canRaise,
    chosen,
  );
}

// Grade a self-contained drill spot (amounts already in big blinds).
export function gradeRawSpot(
  params: {
    hole: Card[];
    board: Card[];
    opponents: number;
    potBb: number;
    toCallBb: number;
  },
  chosen: ActionKind,
  iterations = 2500,
): DecisionScore {
  const equity = estimateEquity({
    hero: params.hole,
    board: params.board,
    opponents: Math.max(1, params.opponents),
    iterations,
    rng: spotRng([...params.hole, ...params.board], params.board.length + 7),
    oppMinStrength: rangeFor(params.toCallBb),
  }).equity;
  return gradeCore(equity, params.potBb, params.toCallBb, true, chosen);
}

export const VERDICT_META: Record<Verdict, { label: string; color: string }> = {
  optimal: { label: "Optimal", color: "text-emerald-300" },
  bra: { label: "Bra", color: "text-emerald-300" },
  unøyaktig: { label: "Unøyaktig", color: "text-amber-300" },
  feil: { label: "Feil", color: "text-rose-300" },
  tabbe: { label: "Tabbe", color: "text-rose-400" },
};
