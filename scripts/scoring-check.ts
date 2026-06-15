// Show the tightened scoring: shrinkage by sample size + steeper EV-loss curve.
// Run: pnpm exec tsx scripts/scoring-check.ts
import { shrunkRating } from "../src/lib/poker/rating";
import { gradeRawSpot } from "../src/lib/poker/scoring";
import { parseCard } from "../src/lib/poker/cards";

const C = (s: string) => parseCard(s);

console.log("=== shrinkage: a 95%-avg player at different sample sizes ===");
for (const n of [2, 6, 12, 30, 60, 150]) {
  console.log(`  ${String(n).padStart(3)} decisions -> ${Math.round(shrunkRating(n * 95, n))}%`);
}

console.log("\n=== per-decision quality (steeper) ===");
const spots: [string, ReturnType<typeof gradeRawSpot>][] = [
  [
    "fold AA preflop vs raise (blunder)",
    gradeRawSpot({ hole: [C("As"), C("Ad")], board: [], opponents: 1, potBb: 3, toCallBb: 2 }, "fold"),
  ],
  [
    "raise AA preflop (correct)",
    gradeRawSpot({ hole: [C("As"), C("Ad")], board: [], opponents: 1, potBb: 3, toCallBb: 2 }, "raise"),
  ],
  [
    "call top pair vs 1/2-pot bet (good)",
    gradeRawSpot({ hole: [C("Ks"), C("Td")], board: [C("Kh"), C("8c"), C("3d")], opponents: 1, potBb: 6, toCallBb: 3 }, "call"),
  ],
  [
    "call gutshot vs big bet (mistake)",
    gradeRawSpot({ hole: [C("Jd"), C("Td")], board: [C("Ah"), C("Kc"), C("4s")], opponents: 1, potBb: 6, toCallBb: 4 }, "call"),
  ],
];
for (const [label, s] of spots) {
  console.log(
    `  ${label.padEnd(40)} ${s.verdict.padEnd(10)} ${s.qualityPct}%  (evLoss ${s.evLossBb.toFixed(2)} bb)`,
  );
}
