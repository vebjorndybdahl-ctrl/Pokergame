import type {
  Action,
  ArchetypeKey,
  BotLevel,
  BotPersona,
  HandState,
} from "./types";
import { legalActions, totalPot } from "./engine";
import { estimateEquity } from "./equity";
import { RANGE } from "./range";

export type BotConfig = {
  label: string;
  blurb: string;
  emoji?: string;
  iterations: number; // equity precision
  callMargin: number; // require equity >= potOdds + margin to call (negative = loose)
  raiseThreshold: number; // equity to value-raise
  bluffFreq: number; // chance to raise as a bluff
  size: "½ pott" | "¾ pott"; // preferred raise size
  oppRange: number; // assumed strength of a bettor's range (0 = treat as random)
};

export const BOT_LEVELS: Record<BotLevel, BotConfig> = {
  lett: {
    label: "Lett",
    blurb: "Løs og passiv — caller mye, høyner sjelden, bløffer aldri.",
    iterations: 300,
    callMargin: -0.08,
    raiseThreshold: 0.74,
    bluffFreq: 0,
    size: "½ pott",
    oppRange: 0,
  },
  middels: {
    label: "Middels",
    blurb: "Balansert — høyner for verdi og caller med riktige odds.",
    iterations: 600,
    callMargin: 0.02,
    raiseThreshold: 0.62,
    bluffFreq: 0.07,
    size: "½ pott",
    oppRange: RANGE.LOOSE,
  },
  vanskelig: {
    label: "Vanskelig",
    blurb: "Stram og aggressiv — presser hardt og bløffer veloverveid.",
    iterations: 1100,
    callMargin: 0.05,
    raiseThreshold: 0.55,
    bluffFreq: 0.16,
    size: "¾ pott",
    oppRange: RANGE.BET,
  },
};

// Individual personalities for the "blandet" table — each bot gets one, so you
// face a mix of styles in the same hand and must read each opponent.
export const ARCHETYPES: Record<ArchetypeKey, BotConfig> = {
  shark: {
    label: "Hai",
    emoji: "🦈",
    blurb: "Stram-aggressiv: spiller få hender, men presser dem hardt.",
    iterations: 900,
    callMargin: 0.06,
    raiseThreshold: 0.58,
    bluffFreq: 0.12,
    size: "¾ pott",
    oppRange: RANGE.BET,
  },
  maniac: {
    label: "Maniac",
    emoji: "🌪️",
    blurb: "Løs-aggressiv: mange hender, mye press og bløff.",
    iterations: 600,
    callMargin: -0.1,
    raiseThreshold: 0.5,
    bluffFreq: 0.3,
    size: "¾ pott",
    oppRange: RANGE.LOOSE,
  },
  rock: {
    label: "Klippen",
    emoji: "🪨",
    blurb: "Stram-passiv: folder mye, høyner bare med nøttene.",
    iterations: 700,
    callMargin: 0.12,
    raiseThreshold: 0.74,
    bluffFreq: 0,
    size: "½ pott",
    oppRange: RANGE.STRONG,
  },
  station: {
    label: "Stasjon",
    emoji: "🚉",
    blurb: "Løs-passiv: caller nesten alt, høyner nesten aldri.",
    iterations: 500,
    callMargin: -0.2,
    raiseThreshold: 0.82,
    bluffFreq: 0,
    size: "½ pott",
    oppRange: 0,
  },
};

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES) as ArchetypeKey[];

// Combined lookup: difficulty levels + archetypes, keyed by persona.
const BOT_CONFIGS: Record<string, BotConfig> = { ...BOT_LEVELS, ...ARCHETYPES };

export function configFor(persona: BotPersona | undefined): BotConfig {
  return (persona && BOT_CONFIGS[persona]) || BOT_LEVELS.middels;
}

export function decideBotAction(state: HandState): Action {
  const seat = state.seats[state.toAct];
  const cfg = configFor(seat.botLevel);
  const legal = legalActions(state);
  const liveOpp = state.seats.filter(
    (s) => s.status !== "folded" && s.id !== seat.id,
  ).length;
  const eq = estimateEquity({
    hero: seat.hole,
    board: state.board,
    opponents: Math.max(1, liveOpp),
    iterations: cfg.iterations,
    rng: state.rng,
    oppMinStrength: legal.callAmount > 0 ? cfg.oppRange : 0,
  }).equity;
  const pot = totalPot(state);
  const toCall = legal.callAmount;
  const sized = () =>
    legal.sizes.find((s) => s.label === cfg.size) ?? legal.sizes[0];

  if (legal.canCheck) {
    if (legal.canRaise && (eq > cfg.raiseThreshold || state.rng() < cfg.bluffFreq)) {
      const s = sized();
      if (s) return { seat: seat.id, type: "raise", amount: s.to };
    }
    return { seat: seat.id, type: "check" };
  }

  const potOdds = toCall / (pot + toCall);

  // Value raise with a strong hand.
  if (legal.canRaise && eq > cfg.raiseThreshold + 0.12) {
    const s = sized();
    if (s) return { seat: seat.id, type: "raise", amount: s.to };
  }
  // Occasional bluff raise (harder bots) when the price is right.
  if (
    legal.canRaise &&
    eq < 0.35 &&
    state.rng() < cfg.bluffFreq &&
    toCall <= pot * 0.6
  ) {
    const s = sized();
    if (s) return { seat: seat.id, type: "raise", amount: s.to };
  }
  if (eq >= potOdds + cfg.callMargin) return { seat: seat.id, type: "call" };
  // Loose bots call small bets too light.
  if (cfg.callMargin < 0 && toCall <= state.bb * 2 && eq > 0.2) {
    return { seat: seat.id, type: "call" };
  }
  return { seat: seat.id, type: "fold" };
}
