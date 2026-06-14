import type { Card } from "./cards";

export type BotLevel = "lett" | "middels" | "vanskelig";

export type Stage =
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "complete";

export type SeatStatus = "active" | "folded" | "allin";

export type SeatState = {
  id: number;
  name: string;
  stack: number;
  committedThisStreet: number;
  committedTotal: number;
  hole: Card[];
  status: SeatStatus;
  isHero: boolean;
  botLevel?: BotLevel;
  hasActed: boolean; // acted since the last full raise this street
};

export type ActionType = "fold" | "check" | "call" | "raise";

// `amount` for a raise is the total chips the seat will have in this street
// after the raise (the "raise to" amount).
export type Action = { seat: number; type: ActionType; amount?: number };

export type RaiseSize = { label: string; to: number };

export type LegalActions = {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number; // chips needed to call
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number; // all-in
  sizes: RaiseSize[]; // suggested discrete raise-to amounts
};

export type Pot = { amount: number; eligible: number[] };

export type ShowdownResult = {
  pots: Pot[];
  payout: number[]; // chips won per seat index
  bestBySeat: (number | null)[]; // packed rank per seat, null if folded
};

export type HandState = {
  seats: SeatState[];
  button: number;
  sb: number;
  bb: number;
  stage: Stage;
  board: Card[];
  deck: Card[];
  toAct: number; // seat index to act, or -1
  betToMatch: number; // committedThisStreet to match this street
  lastRaiseSize: number; // size of the last full raise increment
  log: string[];
  rng: () => number;
};
