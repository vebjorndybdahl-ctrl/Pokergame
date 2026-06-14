"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSeriesByToken } from "@/lib/data";
import { requireSeriesMember } from "@/lib/guards";

// One line of an add-game submission: either an existing player (playerId)
// or a brand-new player to be created (newName).
export type GameEntry = {
  playerId?: string;
  newName?: string;
  buyIn: number;
  cashOut: number;
};

// Optional per-night rule overrides. Empty strings = inherit series default.
export type GameRulesInput = {
  buyIn: string;
  smallBlind: string;
  bigBlind: string;
  location: string;
  gameType: string;
  notes: string;
};

export type AddGameInput = {
  playedOn: string; // YYYY-MM-DD
  note: string;
  entries: GameEntry[];
  rules?: GameRulesInput;
};

function numOrNull(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export async function addGame(token: string, input: AddGameInput) {
  const series = await getSeriesByToken(token);
  if (!series) throw new Error("Fant ikke serien.");
  await requireSeriesMember(series.id); // members only

  const sb = getSupabaseAdmin();

  const playedOn = /^\d{4}-\d{2}-\d{2}$/.test(input.playedOn)
    ? input.playedOn
    : new Date().toISOString().slice(0, 10);

  // Keep only rows that actually have a player.
  const entries = input.entries.filter(
    (e) => e.playerId || (e.newName && e.newName.trim()),
  );
  if (entries.length === 0) {
    throw new Error("Legg til minst én spiller i spillet.");
  }

  // 1) Create any brand-new players and map their names to fresh ids.
  const newNames = [
    ...new Set(
      entries
        .filter((e) => !e.playerId && e.newName)
        .map((e) => e.newName!.trim()),
    ),
  ];
  const nameToId = new Map<string, string>();
  if (newNames.length > 0) {
    const { data, error } = await sb
      .from("players")
      .insert(newNames.map((name) => ({ series_id: series.id, name })))
      .select("id, name");
    if (error) throw error;
    for (const p of data ?? []) nameToId.set(p.name, p.id);
  }

  // 2) Create the game, with any per-night rule overrides.
  const r = input.rules;
  const { data: game, error: gErr } = await sb
    .from("games")
    .insert({
      series_id: series.id,
      played_on: playedOn,
      note: input.note.trim() || null,
      buy_in: numOrNull(r?.buyIn),
      small_blind: numOrNull(r?.smallBlind),
      big_blind: numOrNull(r?.bigBlind),
      location: r?.location?.trim() || null,
      game_type: r?.gameType || null,
      rules_notes: r?.notes?.trim() || null,
    })
    .select("id")
    .single();
  if (gErr) throw gErr;

  // 3) Insert one result per entry (dedupe by player so the unique
  //    (game_id, player_id) constraint can't trip).
  const seen = new Set<string>();
  const rows = [];
  for (const e of entries) {
    const playerId = e.playerId ?? nameToId.get(e.newName!.trim());
    if (!playerId || seen.has(playerId)) continue;
    seen.add(playerId);
    rows.push({
      game_id: game.id,
      player_id: playerId,
      buy_in: Number.isFinite(e.buyIn) ? e.buyIn : 0,
      cash_out: Number.isFinite(e.cashOut) ? e.cashOut : 0,
    });
  }

  const { error: rErr } = await sb.from("game_results").insert(rows);
  if (rErr) throw rErr;

  revalidatePath(`/s/${token}`);
  redirect(`/s/${token}/g/${game.id}`);
}

export async function deleteGame(token: string, gameId: string) {
  const series = await getSeriesByToken(token);
  if (!series) throw new Error("Fant ikke serien.");
  await requireSeriesMember(series.id); // members only

  const sb = getSupabaseAdmin();
  // Scope the delete to this series so a wrong token can't nuke another game.
  const { error } = await sb
    .from("games")
    .delete()
    .eq("id", gameId)
    .eq("series_id", series.id);
  if (error) throw error;

  revalidatePath(`/s/${token}`);
  redirect(`/s/${token}`);
}
