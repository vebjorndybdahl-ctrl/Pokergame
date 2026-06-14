export type User = {
  id: string;
  username: string;
  created_at: string;
};

export type Series = {
  id: string;
  name: string;
  currency: string;
  invite_token: string;
  join_code: string | null;
  created_by: string | null;
  created_at: string;
  // House-rule defaults
  default_buy_in: number | null;
  small_blind: number | null;
  big_blind: number | null;
  location: string | null;
  game_type: string | null;
  rules_notes: string | null;
};

export type Player = {
  id: string;
  series_id: string;
  name: string;
  user_id: string | null;
  created_at: string;
};

export type Game = {
  id: string;
  series_id: string;
  played_on: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
  // Per-night rule overrides (null = inherit series default)
  buy_in: number | null;
  small_blind: number | null;
  big_blind: number | null;
  location: string | null;
  game_type: string | null;
  rules_notes: string | null;
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

// ----- Social / dashboard views -----

// A series as shown on a user's dashboard.
export type DashboardSeries = {
  series: Series;
  role: "owner" | "member";
  memberCount: number;
  gameCount: number;
  net: number; // the viewing user's running net in this series
};

// A friend or friend-request, from the viewer's perspective.
export type FriendInfo = {
  friendshipId: string;
  userId: string;
  username: string;
};

export type FriendRequests = {
  incoming: FriendInfo[]; // people who asked to be your friend
  outgoing: FriendInfo[]; // requests you sent, still pending
};

// A directory entry with the viewer's relationship to that user.
export type DirectoryUser = {
  userId: string;
  username: string;
  relation: "self" | "friends" | "incoming" | "outgoing" | "none";
};

// A pending series invitation shown to the invitee.
export type InviteInfo = {
  invitationId: string;
  seriesId: string;
  seriesName: string;
  inviterUsername: string;
};
