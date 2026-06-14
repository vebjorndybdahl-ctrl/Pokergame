// A card is an integer 0..51 = rank*4 + suit.
// rank 0..12 = 2,3,...,T,J,Q,K,A ; suit 0..3 = c,d,h,s (d,h are red).
export type Card = number;

export const RANKS = [
  "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A",
];
export const SUITS = ["c", "d", "h", "s"];
export const SUIT_GLYPH = ["♣", "♦", "♥", "♠"];

export function rankOf(card: Card): number {
  return card >> 2;
}
export function suitOf(card: Card): number {
  return card & 3;
}
export function makeCard(rank: number, suit: number): Card {
  return rank * 4 + suit;
}
export function isRed(card: Card): boolean {
  const s = suitOf(card);
  return s === 1 || s === 2;
}

export function cardToString(card: Card): string {
  return RANKS[rankOf(card)] + SUITS[suitOf(card)];
}

export function parseCard(s: string): Card {
  const r = RANKS.indexOf(s[0].toUpperCase());
  const su = SUITS.indexOf(s[1].toLowerCase());
  if (r < 0 || su < 0) throw new Error("bad card: " + s);
  return makeCard(r, su);
}

export function makeDeck(): Card[] {
  const d: Card[] = [];
  for (let i = 0; i < 52; i++) d.push(i);
  return d;
}

// Seedable RNG (mulberry32) so hands are reproducible for tests/replays/coaching.
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck: Card[], rng: () => number): void {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
}
