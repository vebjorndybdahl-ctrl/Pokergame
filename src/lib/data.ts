import "server-only";
import { getSupabaseAdmin } from "./supabase";
import type {
  Series,
  Player,
  Game,
  GameResult,
  Standing,
  GameSummary,
  GameResultRow,
} from "./types";

export async function getSeriesByToken(token: string): Promise<Series | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("series")
    .select("*")
    .eq("invite_token", token)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPlayers(seriesId: string): Promise<Player[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("players")
    .select("*")
    .eq("series_id", seriesId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Everything the series dashboard needs: standings + a summary per game.
export async function getDashboard(series: Series): Promise<{
  players: Player[];
  standings: Standing[];
  games: GameSummary[];
}> {
  const sb = getSupabaseAdmin();

  const [players, gamesRes] = await Promise.all([
    getPlayers(series.id),
    sb
      .from("games")
      .select("*")
      .eq("series_id", series.id)
      .order("played_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (gamesRes.error) throw gamesRes.error;
  const games = (gamesRes.data ?? []) as Game[];

  const gameIds = games.map((g) => g.id);
  let results: GameResult[] = [];
  if (gameIds.length > 0) {
    const { data, error } = await sb
      .from("game_results")
      .select("*")
      .in("game_id", gameIds);
    if (error) throw error;
    results = (data ?? []) as GameResult[];
  }

  const playerName = new Map(players.map((p) => [p.id, p.name]));

  // --- Standings: aggregate every result by player ---
  const standingMap = new Map<string, Standing>();
  for (const p of players) {
    standingMap.set(p.id, {
      playerId: p.id,
      name: p.name,
      gamesPlayed: 0,
      totalBuyIn: 0,
      totalCashOut: 0,
      net: 0,
    });
  }
  for (const r of results) {
    const s = standingMap.get(r.player_id);
    if (!s) continue;
    s.gamesPlayed += 1;
    s.totalBuyIn += Number(r.buy_in);
    s.totalCashOut += Number(r.cash_out);
    s.net += Number(r.cash_out) - Number(r.buy_in);
  }
  const standings = [...standingMap.values()].sort((a, b) => b.net - a.net);

  // --- Per-game summaries ---
  const byGame = new Map<string, GameResult[]>();
  for (const r of results) {
    const list = byGame.get(r.game_id) ?? [];
    list.push(r);
    byGame.set(r.game_id, list);
  }

  const gameSummaries: GameSummary[] = games.map((game) => {
    const rs = byGame.get(game.id) ?? [];
    let pot = 0;
    let topWinner: { name: string; net: number } | null = null;
    for (const r of rs) {
      pot += Number(r.buy_in);
      const net = Number(r.cash_out) - Number(r.buy_in);
      if (!topWinner || net > topWinner.net) {
        topWinner = { name: playerName.get(r.player_id) ?? "?", net };
      }
    }
    return { game, playerCount: rs.length, pot, topWinner };
  });

  return { players, standings, games: gameSummaries };
}

// Detail for a single game: every player's line, sorted by net desc.
export async function getGameDetail(
  series: Series,
  gameId: string,
): Promise<{ game: Game; rows: GameResultRow[] } | null> {
  const sb = getSupabaseAdmin();

  const { data: game, error: gErr } = await sb
    .from("games")
    .select("*")
    .eq("id", gameId)
    .eq("series_id", series.id)
    .maybeSingle();
  if (gErr) throw gErr;
  if (!game) return null;

  const [playersRes, resultsRes] = await Promise.all([
    sb.from("players").select("*").eq("series_id", series.id),
    sb.from("game_results").select("*").eq("game_id", gameId),
  ]);
  if (playersRes.error) throw playersRes.error;
  if (resultsRes.error) throw resultsRes.error;

  const playerName = new Map(
    (playersRes.data as Player[]).map((p) => [p.id, p.name]),
  );

  const rows: GameResultRow[] = (resultsRes.data as GameResult[])
    .map((r) => ({
      playerId: r.player_id,
      name: playerName.get(r.player_id) ?? "?",
      buyIn: Number(r.buy_in),
      cashOut: Number(r.cash_out),
      net: Number(r.cash_out) - Number(r.buy_in),
    }))
    .sort((a, b) => b.net - a.net);

  return { game: game as Game, rows };
}
