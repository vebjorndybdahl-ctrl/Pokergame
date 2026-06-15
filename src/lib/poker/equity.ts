import { makeRng, type Card } from "./cards";
import { evaluate7 } from "./evaluator";
import { handStrength } from "./range";

export type EquityResult = { win: number; tie: number; equity: number };

// Monte-Carlo equity of `hero` vs `opponents` hands given `board`.
// With `oppMinStrength` > 0, opponents are drawn only from hands at/above that
// preflop strength (a betting range), via per-opponent rejection sampling.
export function estimateEquity(opts: {
  hero: Card[]; // 2 cards
  board?: Card[]; // 0..5 cards
  opponents: number;
  deadCards?: Card[];
  iterations?: number;
  rng?: () => number;
  oppMinStrength?: number; // 0 = random opponents
}): EquityResult {
  const hero = opts.hero;
  const board = opts.board ?? [];
  const opponents = opts.opponents;
  const iterations = opts.iterations ?? 2000;
  const rng = opts.rng ?? makeRng(0x9e3779b9);
  const minStr = opts.oppMinStrength ?? 0;
  const ranged = minStr > 0;
  const attempts = ranged ? 10 : 1;

  const used = new Uint8Array(52);
  for (const c of hero) used[c] = 1;
  for (const c of board) used[c] = 1;
  for (const c of opts.deadCards ?? []) used[c] = 1;

  const available: number[] = [];
  for (let c = 0; c < 52; c++) if (!used[c]) available.push(c);

  const needBoard = 5 - board.length;
  // Shuffle enough cards up front to cover the board plus rejection headroom.
  const blockMax = Math.min(
    available.length,
    needBoard + opponents * 2 * attempts,
  );
  const pool = available.slice();
  const heroCards = [hero[0], hero[1], 0, 0, 0, 0, 0];
  const oppCards = [0, 0, 0, 0, 0, 0, 0];

  let winSum = 0;
  let counted = 0;
  for (let it = 0; it < iterations; it++) {
    for (let k = 0; k < blockMax; k++) {
      const j = k + Math.floor(rng() * (pool.length - k));
      const tmp = pool[k];
      pool[k] = pool[j];
      pool[j] = tmp;
    }

    for (let b = 0; b < board.length; b++) heroCards[2 + b] = board[b];
    for (let b = 0; b < needBoard; b++) heroCards[2 + board.length + b] = pool[b];
    const heroScore = evaluate7(heroCards);
    for (let b = 0; b < 5; b++) oppCards[2 + b] = heroCards[2 + b];

    let cursor = needBoard;
    let valid = true;
    let beaten = false;
    let ties = 0;
    for (let o = 0; o < opponents; o++) {
      let c1 = -1;
      let c2 = -1;
      for (let a = 0; a < attempts; a++) {
        if (cursor + 1 >= blockMax) break;
        const x = pool[cursor];
        const y = pool[cursor + 1];
        cursor += 2;
        if (!ranged || handStrength(x, y) >= minStr) {
          c1 = x;
          c2 = y;
          break;
        }
      }
      if (c1 < 0) {
        valid = false;
        break;
      }
      oppCards[0] = c1;
      oppCards[1] = c2;
      const os = evaluate7(oppCards);
      if (os > heroScore) {
        beaten = true;
        break;
      } else if (os === heroScore) {
        ties++;
      }
    }
    if (!valid) continue; // couldn't build a valid ranged matchup this draw
    counted++;
    if (beaten) continue;
    winSum += ties > 0 ? 1 / (ties + 1) : 1;
  }

  const equity = winSum / (counted || 1);
  return { win: equity, tie: 0, equity };
}
