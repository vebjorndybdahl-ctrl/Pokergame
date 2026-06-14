// 7-card hand evaluator. Returns a packed integer where a higher number is a
// better hand, so plain `>` / `===` compares hands and detects exact ties.
// Layout: category (bits 20..23) then up to 5 kicker ranks, 4 bits each.

export const CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
} as const;

const CATEGORY_NB = [
  "Høyt kort",
  "Ett par",
  "To par",
  "Tre like",
  "Straight",
  "Flush",
  "Hus",
  "Fire like",
  "Straight flush",
];

function popcount(x: number): number {
  let c = 0;
  while (x) {
    c += x & 1;
    x >>>= 1;
  }
  return c;
}

function pack(category: number, kickers: number[]): number {
  let v = category;
  for (let i = 0; i < 5; i++) v = (v << 4) | (kickers[i] ?? 0);
  return v;
}

// Highest card of a 5-straight given a 13-bit rank mask (bit r = rank r present).
// Returns the high-card rank index, or -1. Handles the wheel (A-2-3-4-5 -> high 5).
function straightHigh(mask: number): number {
  for (let hi = 12; hi >= 4; hi--) {
    const need =
      (1 << hi) |
      (1 << (hi - 1)) |
      (1 << (hi - 2)) |
      (1 << (hi - 3)) |
      (1 << (hi - 4));
    if ((mask & need) === need) return hi;
  }
  const wheel = (1 << 12) | (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3);
  if ((mask & wheel) === wheel) return 3; // five-high
  return -1;
}

function topRanksFromMask(mask: number, n: number): number[] {
  const out: number[] = [];
  for (let r = 12; r >= 0 && out.length < n; r--) {
    if (mask & (1 << r)) out.push(r);
  }
  return out;
}

function highestN(
  rankCount: number[],
  exclude: number[],
  n: number,
): number[] {
  const out: number[] = [];
  for (let r = 12; r >= 0 && out.length < n; r--) {
    if (rankCount[r] > 0 && !exclude.includes(r)) out.push(r);
  }
  return out;
}

export function evaluate7(cards: number[]): number {
  const rankCount = new Array(13).fill(0);
  const suitMask = [0, 0, 0, 0];
  let allMask = 0;
  for (const c of cards) {
    const r = c >> 2;
    const s = c & 3;
    rankCount[r]++;
    suitMask[s] |= 1 << r;
    allMask |= 1 << r;
  }

  let flushSuit = -1;
  for (let s = 0; s < 4; s++) {
    if (popcount(suitMask[s]) >= 5) {
      flushSuit = s;
      break;
    }
  }

  // Straight flush
  if (flushSuit >= 0) {
    const sh = straightHigh(suitMask[flushSuit]);
    if (sh >= 0) return pack(CATEGORY.STRAIGHT_FLUSH, [sh]);
  }

  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];
  for (let r = 12; r >= 0; r--) {
    if (rankCount[r] === 4) quads.push(r);
    else if (rankCount[r] === 3) trips.push(r);
    else if (rankCount[r] === 2) pairs.push(r);
  }

  if (quads.length) {
    const kicker = highestN(rankCount, [quads[0]], 1)[0] ?? 0;
    return pack(CATEGORY.QUADS, [quads[0], kicker]);
  }

  if (trips.length >= 1 && (pairs.length >= 1 || trips.length >= 2)) {
    const t = trips[0];
    const p = trips.length >= 2 ? trips[1] : pairs[0];
    return pack(CATEGORY.FULL_HOUSE, [t, p]);
  }

  if (flushSuit >= 0) {
    return pack(CATEGORY.FLUSH, topRanksFromMask(suitMask[flushSuit], 5));
  }

  const sh = straightHigh(allMask);
  if (sh >= 0) return pack(CATEGORY.STRAIGHT, [sh]);

  if (trips.length) {
    const t = trips[0];
    return pack(CATEGORY.TRIPS, [t, ...highestN(rankCount, [t], 2)]);
  }

  if (pairs.length >= 2) {
    const [p1, p2] = pairs;
    const kicker = highestN(rankCount, [p1, p2], 1)[0] ?? 0;
    return pack(CATEGORY.TWO_PAIR, [p1, p2, kicker]);
  }

  if (pairs.length === 1) {
    const p = pairs[0];
    return pack(CATEGORY.PAIR, [p, ...highestN(rankCount, [p], 3)]);
  }

  return pack(CATEGORY.HIGH_CARD, highestN(rankCount, [], 5));
}

export function categoryOf(packed: number): number {
  return packed >> 20;
}

export function describeRank(packed: number): string {
  return CATEGORY_NB[categoryOf(packed)] ?? "?";
}
