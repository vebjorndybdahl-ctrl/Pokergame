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
  DashboardSeries,
  FriendInfo,
  FriendRequests,
  DirectoryUser,
  InviteInfo,
} from "./types";

export async function getSeriesById(id: string): Promise<Series | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("series")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Look up display names for a set of user ids.
async function getUsernames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("users")
    .select("id, username")
    .in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((u) => [u.id, u.username]));
}

export async function getSeriesByJoinCode(code: string): Promise<Series | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("series")
    .select("*")
    .eq("join_code", code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

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

// ---------- Dashboard ----------

// Every series the user belongs to, with role, counts, and the user's own net.
export async function getUserSeries(
  userId: string,
): Promise<DashboardSeries[]> {
  const sb = getSupabaseAdmin();

  const { data: memberships } = await sb
    .from("series_members")
    .select("series_id, role")
    .eq("user_id", userId);
  if (!memberships || memberships.length === 0) return [];

  const seriesIds = memberships.map((m) => m.series_id);
  const roleBySeries = new Map(memberships.map((m) => [m.series_id, m.role]));

  const [seriesRes, membersRes, gamesRes, myPlayersRes] = await Promise.all([
    sb.from("series").select("*").in("id", seriesIds),
    sb.from("series_members").select("series_id").in("series_id", seriesIds),
    sb.from("games").select("series_id").in("series_id", seriesIds),
    sb
      .from("players")
      .select("id, series_id")
      .in("series_id", seriesIds)
      .eq("user_id", userId),
  ]);

  const seriesList = (seriesRes.data ?? []) as Series[];

  const memberCount = new Map<string, number>();
  for (const m of membersRes.data ?? [])
    memberCount.set(m.series_id, (memberCount.get(m.series_id) ?? 0) + 1);

  const gameCount = new Map<string, number>();
  for (const g of gamesRes.data ?? [])
    gameCount.set(g.series_id, (gameCount.get(g.series_id) ?? 0) + 1);

  const myPlayerBySeries = new Map<string, string>();
  for (const p of myPlayersRes.data ?? [])
    myPlayerBySeries.set(p.series_id, p.id);

  // Net for the user's own player rows.
  const myPlayerIds = [...myPlayerBySeries.values()];
  const netByPlayer = new Map<string, number>();
  if (myPlayerIds.length > 0) {
    const { data: results } = await sb
      .from("game_results")
      .select("player_id, buy_in, cash_out")
      .in("player_id", myPlayerIds);
    for (const r of results ?? []) {
      const net = Number(r.cash_out) - Number(r.buy_in);
      netByPlayer.set(r.player_id, (netByPlayer.get(r.player_id) ?? 0) + net);
    }
  }

  return seriesList
    .map((s) => {
      const myPlayer = myPlayerBySeries.get(s.id);
      return {
        series: s,
        role: (roleBySeries.get(s.id) ?? "member") as "owner" | "member",
        memberCount: memberCount.get(s.id) ?? 0,
        gameCount: gameCount.get(s.id) ?? 0,
        net: myPlayer ? (netByPlayer.get(myPlayer) ?? 0) : 0,
      };
    })
    .sort((a, b) => (a.series.created_at < b.series.created_at ? 1 : -1));
}

// ---------- Friends ----------

export async function getFriends(userId: string): Promise<FriendInfo[]> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const rows = data ?? [];
  const names = await getUsernames(
    rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id)),
  );
  return rows
    .map((r) => {
      const other =
        r.requester_id === userId ? r.addressee_id : r.requester_id;
      return { friendshipId: r.id, userId: other, username: names.get(other) ?? "?" };
    })
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function getFriendRequests(
  userId: string,
): Promise<FriendRequests> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .eq("status", "pending")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const rows = data ?? [];
  const names = await getUsernames(
    rows.flatMap((r) => [r.requester_id, r.addressee_id]),
  );

  const incoming: FriendInfo[] = [];
  const outgoing: FriendInfo[] = [];
  for (const r of rows) {
    if (r.addressee_id === userId) {
      incoming.push({
        friendshipId: r.id,
        userId: r.requester_id,
        username: names.get(r.requester_id) ?? "?",
      });
    } else {
      outgoing.push({
        friendshipId: r.id,
        userId: r.addressee_id,
        username: names.get(r.addressee_id) ?? "?",
      });
    }
  }
  return { incoming, outgoing };
}

// Everyone but the viewer, tagged with the viewer's relationship to them.
export async function getUserDirectory(
  userId: string,
): Promise<DirectoryUser[]> {
  const sb = getSupabaseAdmin();
  const [usersRes, friendshipsRes] = await Promise.all([
    sb.from("users").select("id, username").order("username"),
    sb
      .from("friendships")
      .select("requester_id, addressee_id, status")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
  ]);

  const relation = new Map<string, DirectoryUser["relation"]>();
  for (const f of friendshipsRes.data ?? []) {
    const other =
      f.requester_id === userId ? f.addressee_id : f.requester_id;
    if (f.status === "accepted") relation.set(other, "friends");
    else if (f.requester_id === userId) relation.set(other, "outgoing");
    else relation.set(other, "incoming");
  }

  return (usersRes.data ?? [])
    .filter((u) => u.id !== userId)
    .map((u) => ({
      userId: u.id,
      username: u.username,
      relation: relation.get(u.id) ?? "none",
    }));
}

// ---------- Invitations ----------

export async function getPendingInvites(
  userId: string,
): Promise<InviteInfo[]> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("series_invitations")
    .select("id, series_id, inviter_id")
    .eq("invitee_id", userId)
    .eq("status", "pending");

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const [seriesRes, names] = await Promise.all([
    sb.from("series").select("id, name").in(
      "id",
      rows.map((r) => r.series_id),
    ),
    getUsernames(rows.map((r) => r.inviter_id)),
  ]);
  const seriesName = new Map(
    (seriesRes.data ?? []).map((s) => [s.id, s.name]),
  );

  return rows.map((r) => ({
    invitationId: r.id,
    seriesId: r.series_id,
    seriesName: seriesName.get(r.series_id) ?? "?",
    inviterUsername: names.get(r.inviter_id) ?? "?",
  }));
}

// ---------- Series members & invite picker ----------

export async function getSeriesMembers(
  seriesId: string,
): Promise<{ userId: string; username: string; role: "owner" | "member" }[]> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("series_members")
    .select("user_id, role")
    .eq("series_id", seriesId);
  const rows = data ?? [];
  const names = await getUsernames(rows.map((r) => r.user_id));
  return rows
    .map((r) => ({
      userId: r.user_id,
      username: names.get(r.user_id) ?? "?",
      role: r.role as "owner" | "member",
    }))
    .sort((a, b) =>
      a.role === b.role
        ? a.username.localeCompare(b.username)
        : a.role === "owner"
          ? -1
          : 1,
    );
}

// Friends of the user who aren't already members of (or invited to) the series.
export async function getInvitableFriends(
  userId: string,
  seriesId: string,
): Promise<FriendInfo[]> {
  const sb = getSupabaseAdmin();
  const friends = await getFriends(userId);
  if (friends.length === 0) return [];

  const [membersRes, invitesRes] = await Promise.all([
    sb.from("series_members").select("user_id").eq("series_id", seriesId),
    sb
      .from("series_invitations")
      .select("invitee_id")
      .eq("series_id", seriesId)
      .eq("status", "pending"),
  ]);

  const excluded = new Set<string>([
    ...(membersRes.data ?? []).map((m) => m.user_id),
    ...(invitesRes.data ?? []).map((i) => i.invitee_id),
  ]);
  return friends.filter((f) => !excluded.has(f.userId));
}
