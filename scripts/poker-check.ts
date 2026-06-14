// Sanity checks for the poker engine. Run: npx tsx scripts/poker-check.ts
// Not shipped; validates the highest-risk code (evaluator + side pots).
import { parseCard } from "../src/lib/poker/cards";
import { evaluate7, describeRank } from "../src/lib/poker/evaluator";
import { estimateEquity } from "../src/lib/poker/equity";
import { buildPots, settle } from "../src/lib/poker/engine";
import { makeRng } from "../src/lib/poker/cards";
import type { HandState, SeatState } from "../src/lib/poker/types";

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    console.error(`FAIL  ${name}`);
    failures++;
  }
}
const h = (s: string): number[] => s.trim().split(/\s+/).map(parseCard);

console.log("== evaluator ordering ==");
const ladder: [string, string][] = [
  ["high card", "As Kd 9h 7c 5s 3d 2c"],
  ["pair", "As Ad Kh 9c 7s 5d 2c"],
  ["two pair", "As Ad Kh Kc 7s 5d 2c"],
  ["trips", "As Ad Ah Kc 7s 5d 2c"],
  ["straight", "9s 8d 7h 6c 5s Ad 2c"],
  ["flush", "As Ks 9s 7s 5s 3d 2c"],
  ["full house", "As Ad Ah Kc Ks 5d 2c"],
  ["quads", "As Ad Ah Ac Ks 5d 2c"],
  ["straight flush", "9s 8s 7s 6s 5s Ad 2c"],
];
for (let i = 1; i < ladder.length; i++) {
  const lo = evaluate7(h(ladder[i - 1][1]));
  const hi = evaluate7(h(ladder[i][1]));
  check(`${ladder[i][0]} (${describeRank(hi)}) > ${ladder[i - 1][0]}`, hi > lo);
}

console.log("== straights ==");
const wheel = evaluate7(h("5s 4d 3h 2c As Kd 9c"));
const sixHigh = evaluate7(h("6s 5d 4h 3c 2s Ad 9c"));
check("wheel A-2-3-4-5 is a straight", describeRank(wheel) === "Straight");
check("6-high straight beats the wheel", sixHigh > wheel);

console.log("== ties ==");
const broadwayA = evaluate7(h("As Kd Qh Jc Ts 2d 3c"));
const broadwayB = evaluate7(h("Ad Ks Qc Jh Td 2s 3h"));
check("two broadway straights tie exactly", broadwayA === broadwayB);
const flushA = evaluate7(h("As Ks 9s 7s 5s 3d 2c"));
const flushKickerWins = evaluate7(h("As Ks Qs 7s 5s 3d 2c"));
check("flush kicker (Q vs 9) breaks the tie", flushKickerWins > flushA);

console.log("== side pots ==");
function fakeSeat(stack: number, committed: number, hole: string, folded = false): SeatState {
  return {
    id: 0,
    name: "",
    stack,
    committedThisStreet: 0,
    committedTotal: committed,
    hole: h(hole),
    status: folded ? "folded" : "allin",
    isHero: false,
    hasActed: true,
  };
}
// A all-in 50, B all-in 100, C calls 100. Board gives A>B>C (pair aces/kings/queens).
const state = {
  seats: [
    fakeSeat(0, 50, "As Ad"),
    fakeSeat(0, 100, "Ks Kc"),
    fakeSeat(0, 100, "Qs Qc"),
  ],
  button: 0,
  board: h("2c 3d 4h 8s 9d"),
} as unknown as HandState;

const pots = buildPots(state);
check("two pots formed (main + side)", pots.length === 2);
check("main pot 150 with 3 eligible", pots[0].amount === 150 && pots[0].eligible.length === 3);
check("side pot 100 with 2 eligible", pots[1].amount === 100 && pots[1].eligible.join() === "1,2");

const result = settle(state);
check("A wins the main pot (150)", result.payout[0] === 150);
check("B wins the side pot (100)", result.payout[1] === 100);
check("C wins nothing", result.payout[2] === 0);
check("total paid = total pot (250)", result.payout.reduce((a, b) => a + b, 0) === 250);

console.log("== monte-carlo equity ==");
const aa = estimateEquity({
  hero: h("As Ad"),
  opponents: 1,
  iterations: 20000,
  rng: makeRng(42),
});
check(`AA vs 1 random ≈ 0.85 (got ${aa.equity.toFixed(3)})`, aa.equity > 0.82 && aa.equity < 0.88);
const aaVs3 = estimateEquity({
  hero: h("As Ad"),
  opponents: 3,
  iterations: 20000,
  rng: makeRng(7),
});
check(`AA vs 3 random ≈ 0.64 (got ${aaVs3.equity.toFixed(3)})`, aaVs3.equity > 0.58 && aaVs3.equity < 0.70);

console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
