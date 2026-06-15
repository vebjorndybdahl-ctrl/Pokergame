import { rankOf, suitOf, type Card } from "./cards";

// Preflop hand strength (a Chen-formula variant) normalized to ~0..1, where
// AA = 1.0 and 72o ≈ 0. Used to model opponent ranges: "top X% of hands"
// becomes "hands with strength >= threshold".
export function handStrength(a: Card, b: Card): number {
  let hi = rankOf(a);
  let lo = rankOf(b);
  if (hi < lo) [hi, lo] = [lo, hi];
  const suited = suitOf(a) === suitOf(b);

  const pts = (ri: number): number => {
    if (ri === 12) return 10; // A
    if (ri === 11) return 8; // K
    if (ri === 10) return 7; // Q
    if (ri === 9) return 6; // J
    return (ri + 2) / 2; // T=6 ... 2=2
  };

  let score: number;
  if (hi === lo) {
    score = Math.max(pts(hi) * 2, 5); // pair
  } else {
    score = pts(hi);
    if (suited) score += 2;
    const gap = hi - lo - 1;
    if (gap === 1) score -= 1;
    else if (gap === 2) score -= 2;
    else if (gap === 3) score -= 4;
    else if (gap >= 4) score -= 5;
    if (gap <= 1 && hi < 10) score += 1; // both below Q, near-connected
  }

  return Math.max(0, Math.min(1, score / 20));
}

// Strength thresholds modelling how strong a range is.
export const RANGE = {
  ANY: 0, // random
  LOOSE: 0.28, // wide opener / loose caller
  BET: 0.38, // a typical betting range
  STRONG: 0.5, // tight value range
} as const;
