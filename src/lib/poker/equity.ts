import { makeRng, type Card } from "./cards";
import { evaluate7 } from "./evaluator";

export type EquityResult = { win: number; tie: number; equity: number };

// Monte-Carlo equity of `hero` vs `opponents` random hands given `board`.
// ~2000 iterations is sub-frame and accurate to ~±1%. Pass a seeded rng for
// reproducible hints/verdicts on the same spot.
export function estimateEquity(opts: {
  hero: Card[]; // 2 cards
  board?: Card[]; // 0..5 cards
  opponents: number;
  deadCards?: Card[];
  iterations?: number;
  rng?: () => number;
}): EquityResult {
  const hero = opts.hero;
  const board = opts.board ?? [];
  const opponents = opts.opponents;
  const iterations = opts.iterations ?? 2000;
  const rng = opts.rng ?? makeRng(0x9e3779b9);

  const used = new Uint8Array(52);
  for (const c of hero) used[c] = 1;
  for (const c of board) used[c] = 1;
  for (const c of opts.deadCards ?? []) used[c] = 1;

  const available: number[] = [];
  for (let c = 0; c < 52; c++) if (!used[c]) available.push(c);

  const needBoard = 5 - board.length;
  const drawCount = needBoard + opponents * 2;
  const pool = available.slice();
  const heroCards = [hero[0], hero[1], 0, 0, 0, 0, 0];
  const oppCards = [0, 0, 0, 0, 0, 0, 0];

  let winSum = 0;
  for (let it = 0; it < iterations; it++) {
    // Partial Fisher-Yates: draw the first `drawCount` cards.
    for (let k = 0; k < drawCount; k++) {
      const j = k + Math.floor(rng() * (pool.length - k));
      const tmp = pool[k];
      pool[k] = pool[j];
      pool[j] = tmp;
    }
    // Fill hero board slots
    for (let b = 0; b < board.length; b++) heroCards[2 + b] = board[b];
    for (let b = 0; b < needBoard; b++) heroCards[2 + board.length + b] = pool[b];
    const heroScore = evaluate7(heroCards);

    // Shared board for opponents
    for (let b = 0; b < 5; b++) oppCards[2 + b] = heroCards[2 + b];

    let beaten = false;
    let ties = 0;
    for (let o = 0; o < opponents; o++) {
      oppCards[0] = pool[needBoard + o * 2];
      oppCards[1] = pool[needBoard + o * 2 + 1];
      const os = evaluate7(oppCards);
      if (os > heroScore) {
        beaten = true;
        break;
      } else if (os === heroScore) {
        ties++;
      }
    }
    if (beaten) continue;
    winSum += ties > 0 ? 1 / (ties + 1) : 1;
  }

  const equity = winSum / iterations;
  return { win: equity, tie: 0, equity };
}
