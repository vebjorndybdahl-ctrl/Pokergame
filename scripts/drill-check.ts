// Sanity-check that each drill grades to its intended lesson.
// Run: pnpm exec tsx scripts/drill-check.ts
import { parseCard } from "../src/lib/poker/cards";
import { gradeRawSpot } from "../src/lib/poker/scoring";
import { DRILLS } from "../src/app/trener/drills/scenarios";

console.log("id".padEnd(20), "concept".padEnd(14), "eq%", "odds%", "->best");
for (const d of DRILLS) {
  const s = gradeRawSpot(
    {
      hole: [parseCard(d.hole[0]), parseCard(d.hole[1])],
      board: d.board.map(parseCard),
      opponents: d.opponents,
      potBb: d.potBb,
      toCallBb: d.toCallBb,
    },
    "fold",
    6000,
  );
  console.log(
    d.id.padEnd(20),
    d.concept.padEnd(14),
    String(Math.round(s.equity * 100)).padStart(3),
    String(Math.round(s.potOdds * 100)).padStart(4),
    "  " + s.recommend,
  );
}
