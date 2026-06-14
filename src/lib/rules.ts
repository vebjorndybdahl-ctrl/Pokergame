// House rules for a series, and per-night overrides. Plain module (no
// server-only) so client forms and display components can import it too.
import type { Series, Game } from "./types";

export const GAME_TYPES = [
  { value: "nlhe", label: "No-Limit Hold'em" },
  { value: "plo", label: "Pot-Limit Omaha" },
  { value: "limit", label: "Limit Hold'em" },
  { value: "mixed", label: "Mixed game" },
  { value: "other", label: "Annet" },
] as const;

export type Rules = {
  currency: string;
  buyIn: number | null;
  smallBlind: number | null;
  bigBlind: number | null;
  location: string | null;
  gameType: string | null;
  notes: string | null;
};

export function gameTypeLabel(value: string | null): string | null {
  if (!value) return null;
  return GAME_TYPES.find((g) => g.value === value)?.label ?? value;
}

function num(v: number | null | undefined): number | null {
  return v === null || v === undefined ? null : Number(v);
}

// A series' default house rules.
export function seriesDefaults(series: Series): Rules {
  return {
    currency: series.currency,
    buyIn: num(series.default_buy_in),
    smallBlind: num(series.small_blind),
    bigBlind: num(series.big_blind),
    location: series.location ?? null,
    gameType: series.game_type ?? null,
    notes: series.rules_notes ?? null,
  };
}

// Rules for one game night: each field is the game's override, falling back to
// the series default.
export function resolveGameRules(series: Series, game: Game): Rules {
  const base = seriesDefaults(series);
  return {
    currency: base.currency,
    buyIn: num(game.buy_in) ?? base.buyIn,
    smallBlind: num(game.small_blind) ?? base.smallBlind,
    bigBlind: num(game.big_blind) ?? base.bigBlind,
    location: game.location ?? base.location,
    gameType: game.game_type ?? base.gameType,
    notes: game.rules_notes ?? base.notes,
  };
}

// Human "10/20" blinds string, or null if not set.
export function blindsLabel(rules: Rules): string | null {
  if (rules.smallBlind == null && rules.bigBlind == null) return null;
  const sb = rules.smallBlind ?? "?";
  const bb = rules.bigBlind ?? "?";
  return `${sb}/${bb}`;
}
