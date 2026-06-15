import { makeCard, type Card } from "./cards";
import { handStrength } from "./range";

// 13x13 starting-hand grid (the classic poker range matrix).
export const RANK_LABEL = [
  "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A",
];
// Rank indices ordered high -> low (A..2) for the grid axes.
const AXIS = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
export const TOTAL_COMBOS = 1326;

export type CellKind = "pair" | "suited" | "offsuit";

export type Cell = {
  key: string; // "AA", "AKs", "AKo"
  hi: number; // higher rank index
  lo: number;
  kind: CellKind;
  combos: number; // 6 / 4 / 12
  strength: number; // representative preflop strength
};

function label(hi: number, lo: number, kind: CellKind): string {
  const H = RANK_LABEL[hi];
  const L = RANK_LABEL[lo];
  if (kind === "pair") return H + H;
  return H + L + (kind === "suited" ? "s" : "o");
}

export function buildGrid(): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < 13; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < 13; c++) {
      const ri = AXIS[r];
      const ci = AXIS[c];
      let hi: number;
      let lo: number;
      let kind: CellKind;
      if (r === c) {
        hi = ri;
        lo = ci;
        kind = "pair";
      } else if (r < c) {
        hi = ri; // ri > ci on the upper triangle
        lo = ci;
        kind = "suited";
      } else {
        hi = ci;
        lo = ri;
        kind = "offsuit";
      }
      const combos = kind === "pair" ? 6 : kind === "suited" ? 4 : 12;
      const repA = makeCard(hi, 0);
      const repB =
        kind === "pair"
          ? makeCard(hi, 1)
          : makeCard(lo, kind === "suited" ? 0 : 1);
      row.push({
        key: label(hi, lo, kind),
        hi,
        lo,
        kind,
        combos,
        strength: handStrength(repA, repB),
      });
    }
    grid.push(row);
  }
  return grid;
}

// All specific 2-card combos for the selected cells, minus any dead cards.
export function expandCombos(
  grid: Cell[][],
  selected: Set<string>,
  dead: Set<Card>,
): [Card, Card][] {
  const out: [Card, Card][] = [];
  for (const row of grid) {
    for (const cell of row) {
      if (!selected.has(cell.key)) continue;
      if (cell.kind === "pair") {
        for (let s1 = 0; s1 < 4; s1++)
          for (let s2 = s1 + 1; s2 < 4; s2++) {
            const a = makeCard(cell.hi, s1);
            const b = makeCard(cell.hi, s2);
            if (!dead.has(a) && !dead.has(b)) out.push([a, b]);
          }
      } else if (cell.kind === "suited") {
        for (let s = 0; s < 4; s++) {
          const a = makeCard(cell.hi, s);
          const b = makeCard(cell.lo, s);
          if (!dead.has(a) && !dead.has(b)) out.push([a, b]);
        }
      } else {
        for (let s1 = 0; s1 < 4; s1++)
          for (let s2 = 0; s2 < 4; s2++) {
            if (s1 === s2) continue;
            const a = makeCard(cell.hi, s1);
            const b = makeCard(cell.lo, s2);
            if (!dead.has(a) && !dead.has(b)) out.push([a, b]);
          }
      }
    }
  }
  return out;
}

// Keys of the strongest cells making up the top `pct`% of all combos.
export function topPercentKeys(grid: Cell[][], pct: number): Set<string> {
  const cells = grid.flat().slice().sort((a, b) => b.strength - a.strength);
  const target = (pct / 100) * TOTAL_COMBOS;
  const keys = new Set<string>();
  let acc = 0;
  for (const c of cells) {
    if (acc >= target) break;
    keys.add(c.key);
    acc += c.combos;
  }
  return keys;
}

export function combosOf(grid: Cell[][], selected: Set<string>): number {
  let n = 0;
  for (const row of grid)
    for (const cell of row) if (selected.has(cell.key)) n += cell.combos;
  return n;
}
