// Player-style profiling: classify the hero into a poker archetype from how
// they actually play (tight/loose × passive/aggressive), the same axes real
// trackers use (VPIP, PFR, aggression factor).

export type StyleStats = {
  hands: number; // hands the hero was dealt into
  vpipHands: number; // hands where the hero voluntarily put money in preflop
  pfrHands: number; // hands where the hero raised preflop
  aggressiveActions: number; // bets + raises (all streets)
  passiveActions: number; // calls (all streets)
  folds: number;
};

export const EMPTY_STATS: StyleStats = {
  hands: 0,
  vpipHands: 0,
  pfrHands: 0,
  aggressiveActions: 0,
  passiveActions: 0,
  folds: 0,
};

export type Archetype = {
  key: "tag" | "lag" | "rock" | "station";
  name: string;
  emoji: string;
  tight: boolean;
  aggressive: boolean;
  blurb: string;
  tip: string;
};

export const ARCHETYPES: Record<Archetype["key"], Archetype> = {
  tag: {
    key: "tag",
    name: "Haien",
    emoji: "🦈",
    tight: true,
    aggressive: true,
    blurb:
      "Stram og aggressiv. Du spiller få hender, men når du først er med, presser du på. Dette er den klassiske vinnerstilen — vanskelig å lese og vanskelig å slå.",
    tip: "Bland inn noen bløffer i posisjon så du ikke blir helt forutsigbar.",
  },
  lag: {
    key: "lag",
    name: "Maniacen",
    emoji: "🌪️",
    tight: false,
    aggressive: true,
    blurb:
      "Løs og aggressiv. Du spiller mange hender og spiller dem hardt. Skummelt og lønnsomt i de rette spotene, men høy varians.",
    tip: "Stram inn startkravene litt — aggresjon funker best når kortene tåler presset.",
  },
  rock: {
    key: "rock",
    name: "Klippen",
    emoji: "🪨",
    tight: true,
    aggressive: false,
    blurb:
      "Stram og passiv. Du folder mye og høyner sjelden. Trygt, men forutsigbart — oppmerksomme motstandere stjeler blindene dine.",
    tip: "Tør å høyne for verdi når du har en hånd, og forsvar blindene oftere.",
  },
  station: {
    key: "station",
    name: "Kallestasjonen",
    emoji: "🚉",
    tight: false,
    aggressive: false,
    blurb:
      "Løs og passiv. Du blir med i mange potter, men caller langt mer enn du høyner. Du ser mange flopper, men gir bort verdi.",
    tip: "Fold svake hender før floppen, og høyn for verdi i stedet for å bare kalle.",
  },
};

const MIN_HANDS = 12; // enough sample to classify with a straight face

export type StyleResult = {
  vpip: number; // 0..1
  pfr: number; // 0..1
  af: number; // aggression factor (raises / calls)
  ready: boolean;
  handsLeft: number;
  archetype: Archetype | null;
};

export function computeStyle(s: StyleStats): StyleResult {
  const vpip = s.hands ? s.vpipHands / s.hands : 0;
  const pfr = s.hands ? s.pfrHands / s.hands : 0;
  const af = s.passiveActions
    ? s.aggressiveActions / s.passiveActions
    : s.aggressiveActions > 0
      ? 3
      : 0;

  const ready = s.hands >= MIN_HANDS;
  if (!ready) {
    return {
      vpip,
      pfr,
      af,
      ready,
      handsLeft: MIN_HANDS - s.hands,
      archetype: null,
    };
  }

  // Short-handed (3–6) thresholds: tight if you enter < ~30% of hands;
  // aggressive if you raise more than you call, or raise most hands you play.
  const tight = vpip < 0.3;
  const aggressive = af >= 1 || (vpip > 0 && pfr / vpip >= 0.5);
  const key: Archetype["key"] = tight
    ? aggressive
      ? "tag"
      : "rock"
    : aggressive
      ? "lag"
      : "station";

  return { vpip, pfr, af, ready, handsLeft: 0, archetype: ARCHETYPES[key] };
}
