# The `/trener` poker trainer

Alpha Poker started as a home-game money tracker, but the bulk of recent work is a
self-contained **No-Limit Hold'em trainer** that lives under `/trener`. You play
hands against bots, every decision is graded against an equity/EV baseline, and
your decision quality feeds a skill leaderboard. There is also a scenario-drill
mode and a hand-vs-range equity calculator.

This document explains how it works, grounded in the code. The poker engine and
all the math live in [`src/lib/poker/`](../src/lib/poker); the UI lives under
[`src/app/trener/`](../src/app/trener).

- [Routes](#routes)
- [Library layout](#library-layout)
- [Cards & RNG](#cards--rng)
- [The hand engine](#the-hand-engine)
- [The 7-card evaluator](#the-7-card-evaluator)
- [Monte-Carlo equity](#monte-carlo-equity)
- [Preflop hand strength & ranges](#preflop-hand-strength--ranges)
- [The bots](#the-bots)
- [EV-loss scoring & coaching](#ev-loss-scoring--coaching)
- [Skill rating (Bayesian shrinkage)](#skill-rating-bayesian-shrinkage)
- [Player-style profiling](#player-style-profiling)
- [The 13×13 hand grid](#the-1313-hand-grid)
- [UI surfaces](#ui-surfaces)
- [Persistence & data model](#persistence--data-model)
- [Tuning constants at a glance](#tuning-constants-at-a-glance)

## Routes

| Route | File | What it is |
| --- | --- | --- |
| `/trener` | [`page.tsx`](../src/app/trener/page.tsx) → [`PokerTable.tsx`](../src/app/trener/PokerTable.tsx) | A playable NLHE table with live coaching |
| `/trener/drills` | [`drills/page.tsx`](../src/app/trener/drills/page.tsx) → [`DrillRunner.tsx`](../src/app/trener/drills/DrillRunner.tsx) | Curated decision drills with instant feedback |
| `/trener/kalkulator` | [`kalkulator/page.tsx`](../src/app/trener/kalkulator/page.tsx) → [`RangeCalculator.tsx`](../src/app/trener/kalkulator/RangeCalculator.tsx) | Hand-vs-range / hand-vs-hand equity calculator |
| `/trener/ledertavle` | [`ledertavle/page.tsx`](../src/app/trener/ledertavle/page.tsx) | Skill leaderboard |

All four share the header/nav defined in [`layout.tsx`](../src/app/trener/layout.tsx).
The UI is in Norwegian; this doc keeps the Norwegian labels where they help
(`equity`, `pott-odds`, the verdict words, etc.).

## Library layout

```
src/lib/poker/
  cards.ts       Card encoding, deck, seedable RNG, shuffle
  evaluator.ts   7-card hand evaluator (packed-integer strength)
  engine.ts      Hand state machine: deal, betting, streets, side pots, showdown
  equity.ts      Monte-Carlo equity (vs random/ranged fields, and vs a combo list)
  range.ts       Preflop hand-strength heuristic + range thresholds
  bot.ts         Bot configs (difficulty levels + archetypes) and decision logic
  scoring.ts     EV-loss grader, live hints, drill grading, verdicts
  rating.ts      Bayesian-shrunk skill rating
  style.ts       Player-style profiling (VPIP / PFR / aggression factor)
  grid.ts        13×13 starting-hand matrix + combo expansion
  types.ts       Shared types
  index.ts       Barrel re-export (cards, evaluator, equity, engine, types)
```

## Cards & RNG

[`cards.ts`](../src/lib/poker/cards.ts) — a card is just an integer `0..51`,
encoded as `rank * 4 + suit`:

- **rank** `0..12` → `2,3,…,T,J,Q,K,A` (`rankOf = card >> 2`)
- **suit** `0..3` → `c,d,h,s` (`suitOf = card & 3`); `d` and `h` are red

This integer encoding is what makes the evaluator and Monte-Carlo loops fast —
ranks and suits are recovered with shifts and masks, and "used" cards are tracked
in a `Uint8Array(52)`.

Randomness comes from **`makeRng(seed)`**, a seedable `mulberry32` generator, plus
a Fisher–Yates **`shuffle`**. Because the RNG is seedable, hands are reproducible
— the same seed replays the same deck, which the coaching code relies on (see
[scoring](#ev-loss-scoring--coaching)).

## The hand engine

[`engine.ts`](../src/lib/poker/engine.ts) is a deterministic NLHE state machine
over a `HandState` ([`types.ts`](../src/lib/poker/types.ts)). It has no UI or
randomness of its own beyond the RNG you pass in.

- **`createHand({ seats, button, sb, bb, rng })`** builds the deck, shuffles, deals
  two cards to each seat starting left of the button, and posts blinds. Heads-up,
  the button is the small blind; otherwise SB/BB sit left of the button. First to
  act preflop is UTG (the seat left of the BB), or the button heads-up.
- **`legalActions(state)`** returns what the seat to act may do: fold / check /
  call (`callAmount`), and raise bounds (`minRaiseTo = betToMatch + lastRaiseSize`,
  `maxRaiseTo = all-in`). It also produces discrete suggested raise-**to** sizes —
  `Min`, `½ pott`, `¾ pott`, `Pott`, `All-in` — each clamped into the legal range
  and de-duplicated.
- **`applyAction(state, action)`** mutates the state. A raise's `amount` is the
  total a seat will have committed *this street* after raising (a "raise-to"
  amount). A full raise (increment ≥ `lastRaiseSize`) reopens the betting and
  clears everyone else's `hasActed`; an all-in for *less* than a full raise bumps
  the bet but does **not** reopen action.
- **Street progression** is automatic: when the street is complete (every active
  seat has acted and matched `betToMatch`) it deals the flop/turn/river; if only
  one player remains the hand is `complete`; if everyone left is all-in it deals
  out the remaining board and goes to showdown.
- **Side pots** — `buildPots` slices contributions into layered pot levels by each
  seat's `committedTotal`, so all-ins for different amounts settle correctly.
  `settle` evaluates each eligible seat, awards each pot to the best hand(s), and
  splits ties with the **odd chip going to the first winner left of the button**.

`evaluate7` (below) is the only thing `settle` needs to rank hands, and `===` on
its packed result is an exact tie.

## The 7-card evaluator

[`evaluator.ts`](../src/lib/poker/evaluator.ts) — **`evaluate7(cards)`** scores the
best 5-card hand out of 7 and returns a single **packed integer where a larger
number is a strictly better hand**, so `>` compares hands and `===` detects exact
ties (kickers included). No separate kicker-comparison pass is needed.

Layout: the hand category sits in the high bits, followed by up to five 4-bit
kicker ranks (`pack` shifts the category up by 20 bits and ORs in five kickers).
Categories run `0..8`:

`HIGH_CARD, PAIR, TWO_PAIR, TRIPS, STRAIGHT, FLUSH, FULL_HOUSE, QUADS, STRAIGHT_FLUSH`

The algorithm is bit-twiddling rather than enumeration:

- one pass builds a per-rank count, a per-suit 13-bit rank mask, and a combined
  rank mask;
- a suit with ≥5 cards is the flush suit; `straightHigh` scans a 13-bit mask for
  five consecutive ranks, handling the **A-2-3-4-5 wheel** (high card = 5);
- categories are checked best-first (straight flush → quads → full house → flush →
  straight → trips → two pair → pair → high card), filling kickers from the
  remaining highest ranks.

`categoryOf(packed)` recovers the category and `describeRank` maps it to a
Norwegian label (`Høyt kort`, `Ett par`, … `Straight flush`).

## Monte-Carlo equity

[`equity.ts`](../src/lib/poker/equity.ts) estimates win probability by simulation —
there is no exact combinatorial solver. Two entry points:

**`estimateEquity({ hero, board, opponents, iterations, rng, oppMinStrength })`** —
hero's equity vs N opponents.

- Default `2000` iterations. Each iteration does a partial Fisher–Yates shuffle of
  the *available* cards, completes the board, deals each opponent two cards, and
  compares `evaluate7` results. Ties are scored fractionally as `1/(ties+1)`.
- With `oppMinStrength > 0` it models a **betting range** instead of random hands:
  each opponent's cards are drawn by **rejection sampling** (up to 10 attempts per
  opponent) until they clear that preflop-strength threshold. Draws that can't
  build a valid ranged matchup are skipped, and equity is divided by the number of
  *counted* draws.
- Returns `{ win, tie, equity }` where `tie` is always `0` (ties are folded into
  `equity`).

**`rangeEquity({ hero, board, villain, iterations, rng })`** — hero vs a villain
whose hand is one of an explicit list of two-card combos. Default `8000`
iterations (the calculator UI passes `12000`). It picks a random villain combo per
iteration, fills the remaining board by rejection against used cards, and returns
`{ equity, win, tie, samples }` with `equity = (wins + ties/2) / samples`. This is
what the [range calculator](#the-1313-hand-grid) uses.

## Preflop hand strength & ranges

[`range.ts`](../src/lib/poker/range.ts) — **`handStrength(a, b)`** scores a starting
hand on a normalized `~0..1` scale (`AA ≈ 1.0`, `72o ≈ 0`) using a **Chen-formula
variant**: high-card points, a suited bonus, and gap penalties for unconnected
cards. It is used to turn "top X% of hands" into "hands at or above a strength
threshold."

The named thresholds:

| Constant | Value | Meaning |
| --- | --- | --- |
| `RANGE.ANY` | `0` | random hand (no range) |
| `RANGE.LOOSE` | `0.28` | wide opener / loose caller |
| `RANGE.BET` | `0.38` | a typical betting range |
| `RANGE.STRONG` | `0.5` | tight value range |

These thresholds feed both the [bots](#the-bots) (the range they assign a bettor)
and the [scorer](#ev-loss-scoring--coaching) (the range it assumes is betting into
the hero).

## The bots

[`bot.ts`](../src/lib/poker/bot.ts) — every bot is a `BotConfig`:

| Field | Role |
| --- | --- |
| `iterations` | equity-simulation precision the bot can afford |
| `callMargin` | required `equity − potOdds` to call (negative = loose) |
| `raiseThreshold` | equity at which it value-raises |
| `bluffFreq` | chance to raise as a bluff |
| `size` | preferred raise size (`½ pott` / `¾ pott`) |
| `oppRange` | assumed strength of a *bettor's* range |

Two families share the type:

- **Difficulty levels** (`BOT_LEVELS`): `lett` (loose-passive, never bluffs),
  `middels` (balanced), `vanskelig` (tight-aggressive, bluffs deliberately).
  Iterations scale `300 / 600 / 1100`, so harder bots also read the board more
  accurately.
- **Archetypes** (`ARCHETYPES`) for the mixed table: `shark` (Hai 🦈,
  tight-aggressive), `maniac` (Maniac 🌪️, loose-aggressive), `rock` (Klippen 🪨,
  tight-passive), `station` (Stasjon 🚉, loose-passive / calling station). Each has
  its own thresholds and bluff frequency, so a single table can contain a mix of
  styles you have to read.

**`decideBotAction(state)`** drives a bot's turn: it estimates equity vs the live
opponents (range-aware via `oppRange` when facing a bet), then, in order:
value-raises when well ahead of `raiseThreshold`, occasionally bluff-raises (harder
bots, weak hand, right price), calls when `equity ≥ potOdds + callMargin`, makes
loose calls of small bets, and otherwise folds. When checking is free it may still
value-bet or bluff.

## EV-loss scoring & coaching

[`scoring.ts`](../src/lib/poker/scoring.ts) is the coach. It grades a decision by
the **EV (in big blinds) lost relative to the best action**, not by whether the
hand was won.

- **`gradeCore(equity, potBb, toCallBb, canRaise, chosen)`** is the shared grader.
  It computes pot odds and the EV of calling
  (`evCall = equity·(pot + toCall) − toCall`), derives a recommended action, then
  the EV loss of what was actually `chosen` (e.g. folding a +EV spot loses
  `evCall`; calling a −EV spot loses `−evCall`). It returns equity, pot odds, the
  recommendation, `evLossBb`, a `qualityPct`, a `verdict`, and a Norwegian
  `explanation`.
- **Verdict thresholds** (`verdictOf`, by bb lost): `optimal` ≤ 0.1, `bra` < 0.5,
  `unøyaktig` < 1.2, `feil` < 2.4, `tabbe` otherwise. **Quality** is
  `100 · (1 − evLoss / 2.4)` clamped to `0..100`, so a flawless decision is 100%
  and ~2.4 bb lost is 0%.
- **Three callers** wrap `gradeCore` with the right equity estimate:
  - `analyzeSpot` — the live **hint** (no action chosen yet), ~1500 iterations
    (the table passes 1200).
  - `scoreHeroDecision` — grades the hero's **actual** live action (~1500 iters).
  - `gradeRawSpot` — grades a self-contained **drill** spot whose pot/to-call are
    already in big blinds (~2500 iters).
- **Range-aware opponents.** When grading live, `bettorRange` figures out who put
  money in this street and assumes a stronger-than-random range for them —
  **archetype-aware** on the mixed table (a maniac's bets get a much wider assumed
  range than a rock's) and a generic `RANGE.BET` otherwise. Drills use `RANGE.BET`
  whenever there is a bet to call.
- **Deterministic per spot.** `spotRng` hashes the hero's cards + board (an
  FNV-style hash seeding `mulberry32`) so the live hint and the post-hand verdict
  for the same decision agree, and grading never disturbs the live deck.

`VERDICT_META` maps each verdict to a label and Tailwind color for the UI.

## Skill rating (Bayesian shrinkage)

[`rating.ts`](../src/lib/poker/rating.ts) turns a pile of per-decision quality
scores into one rating, with **shrinkage toward a neutral prior** so a handful of
lucky (or unlucky) decisions can't read as elite or terrible:

```
shrunkRating(qualitySum, decisions) = (qualitySum + 40·50) / (decisions + 40)
```

The prior is `PRIOR_WEIGHT = 40` "neutral" decisions at `PRIOR_MEAN = 50`. With few
decisions the rating sits near 50; it only approaches the true mean once the sample
is large. `RATING_PRIOR_WEIGHT` is exported so the UI can hint how many more
decisions until shrinkage mostly fades.

## Player-style profiling

[`style.ts`](../src/lib/poker/style.ts) classifies the hero on the same axes real
trackers use — **VPIP** (voluntarily put money in preflop), **PFR** (preflop
raise), and **aggression factor** (`raises / calls`). `computeStyle` needs
`MIN_HANDS = 12` before it will commit to a label, then places you in a quadrant:

| | Passive | Aggressive |
| --- | --- | --- |
| **Tight** (VPIP < 30%) | `rock` — Klippen 🪨 | `tag` — Haien 🦈 |
| **Loose** | `station` — Kallestasjonen 🚉 | `lag` — Maniacen 🌪️ |

(Aggressive = `af ≥ 1` or you raise at least half the hands you play.) Each
archetype carries a blurb and an improvement tip, rendered in
[`StyleAnalysis.tsx`](../src/app/trener/StyleAnalysis.tsx) as a quadrant plot with
your style dot.

## The 13×13 hand grid

[`grid.ts`](../src/lib/poker/grid.ts) builds the classic starting-hand matrix:
pairs on the diagonal, suited hands above, offsuit below — `1326` total combos
(`6` per pair, `4` per suited, `12` per offsuit). Helpers:

- `buildGrid()` — the 13×13 cells, each tagged with its representative
  `handStrength`;
- `topPercentKeys(grid, pct)` — the strongest cells making up the top `pct`% of all
  combos (drives the "Topp 10/20/40%" presets);
- `expandCombos(grid, selected, dead)` — every concrete two-card combo for the
  selected cells, minus dead cards;
- `combosOf` — combo count of a selection (for the "X% · N komb." readout).

## UI surfaces

### Play table — `/trener`

[`PokerTable.tsx`](../src/app/trener/PokerTable.tsx) is the live game. You play as
the hero against bots (named Rex, Nova, Zara, Milo, Ivy), default 4-handed, with
`START_STACK = 1000`, blinds `SB = 10 / BB = 20`.

- **Difficulty / mode**: `Lett`, `Middels`, `Vanskelig`, or `Blandet`. Blandet
  assigns each bot a stable random archetype for the session (Rex stays a maniac
  across hands), so you practice reading individual opponents.
- **Coaching**: a `💡 Tips` toggle shows live equity / pot-odds / recommendation
  (`analyzeSpot`). Every hero action is graded with `scoreHeroDecision` and pushed
  to a coaching log.
- **Flow**: bots act after a natural variable pause (~1.4–2.9 s); the engine runs
  the streets; showdown shows winners. The button rotates each hand and busted
  stacks reset.
- **Style read-out**: hero actions accumulate `StyleStats`, surfaced through the
  `StyleAnalysis` panel.
- **Persistence**: on showdown, logged-in players' hands are saved via
  `recordSession` (Blandet is bucketed as `middels` for the per-difficulty stats).

### Scenario drills — `/trener/drills`

[`DrillRunner.tsx`](../src/app/trener/drills/DrillRunner.tsx) serves a shuffled set of 10
spots (`SET_SIZE`) drawn from the curated `DRILLS` in
[`scenarios.ts`](../src/app/trener/drills/scenarios.ts), grouped by concept —
`Før floppen`, `Draws`, `Verdi`, `Tålmodighet`. The "correct" answer isn't
hard-coded: each spot is graded **live** with `gradeRawSpot`, so feedback stays
principled (equity vs pot odds against a betting range). You get a verdict,
explanation, equity, and pot-odds per answer, and a final average. Logged-in
players' answers also feed the rating (each as one `middels` decision).

### Range calculator — `/trener/kalkulator`

[`RangeCalculator.tsx`](../src/app/trener/kalkulator/RangeCalculator.tsx) computes
your hand's equity against either a **range** (built on the 13×13 grid, with
Topp 10/20/40% / Alle / Tøm presets) or a single **villain hand**, with an optional
board. It expands the selection to concrete combos and runs `rangeEquity` at
`12000` iterations, showing equity plus win/tie (hand mode) or "mot en X% range"
(range mode).

### Leaderboard — `/trener/ledertavle`

[`ledertavle/page.tsx`](../src/app/trener/ledertavle/page.tsx) ranks players by
**skill, not volume or luck** — the shrinkage-adjusted rating. Only players past
`MIN_QUALIFYING_DECISIONS = 50` graded decisions appear; the page shows the top 50,
plus the current user's own standing and how many more decisions they need to
qualify.

## Persistence & data model

Trainer progress is stored in a single **`trainer_stats`** table, defined in
[`supabase/migrations/0003_poker_trainer.sql`](../supabase/migrations/0003_poker_trainer.sql)
(run it once in the Supabase SQL editor — it's additive and idempotent). It keeps
per-user totals: `hands_played`, `graded_decisions`, `quality_sum`, a denormalized
`rating`, and per-difficulty breakdowns (`easy_*`, `med_*`, `hard_*`). Like every
other table it has RLS on and no anon policies — the service-role server is the
only gate.

- **Write** — [`actions.ts`](../src/app/trener/actions.ts) `recordSession` derives
  the user from the session (never trusts the client), **clamps** the incoming
  aggregate to sane bounds (`hands ≤ 50`, `decisions ≤ 200`,
  `qualitySum ≤ decisions·100`), and upserts the accumulated totals.
- **Read** — [`data.ts`](../src/lib/data.ts) `getTrainerStats` and `getLeaderboard`
  recompute the **shrunk** rating in JS (`shrunkRating`) rather than trusting the
  stored raw mean, so the displayed ranking always reflects the shrinkage model.

> Note: the stored `rating` column is the raw mean (`quality_sum / graded_decisions`),
> but everything user-facing is recomputed with shrinkage at read time.

## Tuning constants at a glance

| Constant | Value | Where | Meaning |
| --- | --- | --- | --- |
| `START_STACK` | `1000` | `PokerTable.tsx` | starting chips |
| `SB` / `BB` | `10` / `20` | `PokerTable.tsx` | blinds (50 bb deep) |
| default table | `4`-handed | `PokerTable.tsx` | hero + 3 bots |
| equity iters (default) | `2000` | `equity.ts` | `estimateEquity` |
| equity iters (calculator) | `12000` | `RangeCalculator.tsx` | `rangeEquity` |
| bot iters | `300 / 600 / 1100` | `bot.ts` | lett / middels / vanskelig |
| range thresholds | `0.28 / 0.38 / 0.5` | `range.ts` | loose / bet / strong |
| EV-loss → 0% quality | `2.4` bb | `scoring.ts` | quality scale |
| rating prior | `40` decisions @ `50` | `rating.ts` | Bayesian shrinkage |
| style min sample | `12` hands | `style.ts` | before classifying |
| drill set size | `10` of `16` | `DrillRunner.tsx` / `scenarios.ts` | per run |
| leaderboard qualify | `50` decisions | `data.ts` | to appear on the board |
</content>
</invoke>
