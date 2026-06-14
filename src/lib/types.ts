export type Series = {
  id: string;
  name: string;
  currency: string;
  invite_token: string;
  join_code: string | null;
  created_at: string;
};

export type Player = {
  id: string;
  series_id: string;
  name: string;
  created_at: string;
};

export type Game = {
  id: string;
  series_id: string;
  played_on: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
};

export type GameResult = {
  id: string;
  game_id: string;
  player_id: string;
  buy_in: number;
  cash_out: number;
};

// A player's running totals across a whole series.
export type Standing = {
  playerId: string;
  name: string;
  gamesPlayed: number;
  totalBuyIn: number;
  totalCashOut: number;
  net: number;
};

// One game enriched with the data needed for the games list.
export type GameSummary = {
  game: Game;
  playerCount: number;
  pot: number; // total bought in
  topWinner: { name: string; net: number } | null;
};

// A single line of a game's detail view.
export type GameResultRow = {
  playerId: string;
  name: string;
  buyIn: number;
  cashOut: number;
  net: number;
};
