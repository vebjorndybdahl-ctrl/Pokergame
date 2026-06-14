import { makeDeck, shuffle, type Card } from "./cards";
import { evaluate7 } from "./evaluator";
import type {
  Action,
  HandState,
  LegalActions,
  Pot,
  RaiseSize,
  SeatState,
  ShowdownResult,
} from "./types";

export type SeatConfig = {
  name: string;
  stack: number;
  isHero: boolean;
  botLevel?: SeatState["botLevel"];
};

// ---- seat traversal helpers ----

function nextOccupied(state: HandState, from: number): number {
  const n = state.seats.length;
  return (from + 1) % n;
}

// Next seat that can still act (active = not folded, not all-in), scanning
// clockwise from `from` (exclusive). Returns -1 if none.
function nextActor(state: HandState, from: number): number {
  const n = state.seats.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (state.seats[idx].status === "active") return idx;
  }
  return -1;
}

function inHandCount(state: HandState): number {
  return state.seats.filter((s) => s.status !== "folded").length;
}

// ---- chip movement ----

function commit(seat: SeatState, amount: number): number {
  const actual = Math.min(amount, seat.stack);
  seat.stack -= actual;
  seat.committedThisStreet += actual;
  seat.committedTotal += actual;
  if (seat.stack === 0 && seat.status === "active") seat.status = "allin";
  return actual;
}

// ---- hand setup ----

export function createHand(opts: {
  seats: SeatConfig[];
  button: number;
  sb: number;
  bb: number;
  rng: () => number;
}): HandState {
  const deck = makeDeck();
  shuffle(deck, opts.rng);

  const seats: SeatState[] = opts.seats.map((s, i) => ({
    id: i,
    name: s.name,
    stack: s.stack,
    committedThisStreet: 0,
    committedTotal: 0,
    hole: [],
    status: "active",
    isHero: s.isHero,
    botLevel: s.botLevel,
    hasActed: false,
  }));

  const n = seats.length;
  const state: HandState = {
    seats,
    button: opts.button,
    sb: opts.sb,
    bb: opts.bb,
    stage: "preflop",
    board: [],
    deck,
    toAct: -1,
    betToMatch: opts.bb,
    lastRaiseSize: opts.bb,
    log: [],
    rng: opts.rng,
  };

  // Deal two cards each, starting left of the button.
  for (let round = 0; round < 2; round++) {
    let idx = nextOccupied(state, opts.button);
    for (let k = 0; k < n; k++) {
      seats[idx].hole.push(deck.pop() as Card);
      idx = nextOccupied(state, idx);
    }
  }

  // Blinds. Heads-up: button is the small blind.
  const sbSeat = n === 2 ? opts.button : nextOccupied(state, opts.button);
  const bbSeat = nextOccupied(state, sbSeat);
  commit(seats[sbSeat], opts.sb);
  commit(seats[bbSeat], opts.bb);
  state.log.push(`${seats[sbSeat].name} liten blind ${opts.sb}`);
  state.log.push(`${seats[bbSeat].name} stor blind ${opts.bb}`);

  state.toAct = nextActor(state, bbSeat); // UTG (or button heads-up)
  return state;
}

// ---- legal actions ----

export function legalActions(state: HandState): LegalActions {
  const seat = state.seats[state.toAct];
  const toCall = state.betToMatch - seat.committedThisStreet;
  const canCheck = toCall <= 0;
  const callAmount = Math.min(toCall, seat.stack);

  // A raise must reach betToMatch + lastRaiseSize, capped at the stack.
  const minRaiseTo = state.betToMatch + state.lastRaiseSize;
  const maxRaiseTo = seat.committedThisStreet + seat.stack; // all-in
  const canRaise = seat.stack > toCall; // has chips beyond a call

  const sizes: RaiseSize[] = [];
  if (canRaise) {
    const pot = totalPot(state);
    const push = (label: string, to: number) => {
      const clamped = Math.min(Math.max(to, minRaiseTo), maxRaiseTo);
      if (!sizes.some((x) => x.to === clamped)) sizes.push({ label, to: clamped });
    };
    push("Min", minRaiseTo);
    push("½ pott", state.betToMatch + Math.round(pot * 0.5));
    push("¾ pott", state.betToMatch + Math.round(pot * 0.75));
    push("Pott", state.betToMatch + pot);
    push("All-in", maxRaiseTo);
  }

  return {
    canFold: toCall > 0,
    canCheck,
    canCall: toCall > 0,
    callAmount,
    canRaise,
    minRaiseTo,
    maxRaiseTo,
    sizes,
  };
}

export function totalPot(state: HandState): number {
  let p = 0;
  for (const s of state.seats) p += s.committedTotal;
  return p;
}

// ---- applying an action ----

export function applyAction(state: HandState, action: Action): void {
  const seat = state.seats[action.seat];

  if (action.type === "fold") {
    seat.status = "folded";
    seat.hasActed = true;
    state.log.push(`${seat.name} folder`);
  } else if (action.type === "check") {
    seat.hasActed = true;
    state.log.push(`${seat.name} sjekker`);
  } else if (action.type === "call") {
    const toCall = state.betToMatch - seat.committedThisStreet;
    const paid = commit(seat, toCall);
    seat.hasActed = true;
    state.log.push(`${seat.name} caller ${paid}`);
  } else {
    // raise: amount = total committedThisStreet target
    const prevBet = state.betToMatch;
    const target = Math.max(action.amount ?? 0, prevBet);
    commit(seat, target - seat.committedThisStreet);
    const newTotal = seat.committedThisStreet;
    const increment = newTotal - prevBet;
    if (increment >= state.lastRaiseSize) {
      // Full raise: reopens the betting.
      state.lastRaiseSize = increment;
      state.betToMatch = newTotal;
      for (const s of state.seats)
        if (s !== seat && s.status === "active") s.hasActed = false;
      state.log.push(`${seat.name} høyner til ${newTotal}`);
    } else {
      // All-in for less than a full raise: raises the bet but does not reopen.
      if (newTotal > state.betToMatch) state.betToMatch = newTotal;
      state.log.push(`${seat.name} all-in ${newTotal}`);
    }
    seat.hasActed = true;
  }

  advance(state);
}

function streetComplete(state: HandState): boolean {
  const actors = state.seats.filter((s) => s.status === "active");
  for (const s of actors) {
    if (!s.hasActed) return false;
    if (s.committedThisStreet !== state.betToMatch) return false;
  }
  return true;
}

function advance(state: HandState): void {
  if (inHandCount(state) === 1) {
    state.stage = "complete";
    state.toAct = -1;
    return;
  }
  if (streetComplete(state)) {
    nextStreet(state);
    return;
  }
  state.toAct = nextActor(state, state.toAct);
  // No one left to act (all remaining all-in) -> close the street.
  if (state.toAct === -1) nextStreet(state);
}

function nextStreet(state: HandState): void {
  for (const s of state.seats) {
    s.committedThisStreet = 0;
    s.hasActed = false;
  }
  state.betToMatch = 0;
  state.lastRaiseSize = state.bb;

  if (state.stage === "preflop") {
    state.board.push(
      state.deck.pop() as Card,
      state.deck.pop() as Card,
      state.deck.pop() as Card,
    );
    state.stage = "flop";
  } else if (state.stage === "flop") {
    state.board.push(state.deck.pop() as Card);
    state.stage = "turn";
  } else if (state.stage === "turn") {
    state.board.push(state.deck.pop() as Card);
    state.stage = "river";
  } else if (state.stage === "river") {
    state.stage = "showdown";
    state.toAct = -1;
    return;
  }

  const first = nextActor(state, state.button);
  if (first === -1) {
    // Everyone remaining is all-in: deal out the rest and go to showdown.
    nextStreet(state);
    return;
  }
  state.toAct = first;
}

export function isComplete(state: HandState): boolean {
  return state.stage === "complete" || state.stage === "showdown";
}

// ---- showdown / side pots ----

export function buildPots(state: HandState): Pot[] {
  const contrib = state.seats.map((s) => ({
    total: s.committedTotal,
    folded: s.status === "folded",
  }));
  const levels = [
    ...new Set(contrib.filter((c) => c.total > 0).map((c) => c.total)),
  ].sort((a, b) => a - b);

  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    const layer = level - prev;
    const atLevel = contrib.filter((c) => c.total >= level);
    const amount = layer * atLevel.length;
    const eligible: number[] = [];
    state.seats.forEach((s, i) => {
      if (s.committedTotal >= level && s.status !== "folded") eligible.push(i);
    });
    if (amount > 0) pots.push({ amount, eligible });
    prev = level;
  }
  return pots;
}

export function settle(state: HandState): ShowdownResult {
  const pots = buildPots(state);
  const payout = new Array(state.seats.length).fill(0);

  const bestBySeat: (number | null)[] = state.seats.map((s) =>
    s.status === "folded" ? null : evaluate7([...s.hole, ...state.board]),
  );

  for (const pot of pots) {
    if (pot.eligible.length === 0) continue;
    let winners: number[];
    if (pot.eligible.length === 1) {
      winners = [pot.eligible[0]];
    } else {
      let best = -1;
      winners = [];
      for (const i of pot.eligible) {
        const score = bestBySeat[i] as number;
        if (score > best) {
          best = score;
          winners = [i];
        } else if (score === best) {
          winners.push(i);
        }
      }
    }
    // Split, with odd chips going to the first winner left of the button.
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    const ordered = [...winners].sort(
      (a, b) =>
        ((a - state.button + state.seats.length) % state.seats.length) -
        ((b - state.button + state.seats.length) % state.seats.length),
    );
    for (const w of ordered) {
      payout[w] += share;
      if (remainder > 0) {
        payout[w] += 1;
        remainder--;
      }
    }
  }

  for (let i = 0; i < state.seats.length; i++) state.seats[i].stack += payout[i];
  return { pots, payout, bestBySeat };
}
