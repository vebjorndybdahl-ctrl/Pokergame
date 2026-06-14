import "server-only";
import { getSupabaseAdmin } from "./supabase";
import type { Series, User } from "./types";

// Ensure the user is a member of the series with a linked player row. Claims
// ownership of a legacy/ownerless series. Idempotent (safe to call twice).
export async function ensureMembership(
  series: Series,
  user: User,
): Promise<void> {
  const sb = getSupabaseAdmin();

  const { data: owners } = await sb
    .from("series_members")
    .select("id")
    .eq("series_id", series.id)
    .eq("role", "owner")
    .limit(1);
  const role = owners && owners.length > 0 ? "member" : "owner";

  const { error: mErr } = await sb
    .from("series_members")
    .insert({ series_id: series.id, user_id: user.id, role });
  if (mErr && mErr.code !== "23505") throw mErr; // 23505 = already a member

  const { data: existingPlayer } = await sb
    .from("players")
    .select("id")
    .eq("series_id", series.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existingPlayer) {
    const { error: pErr } = await sb
      .from("players")
      .insert({ series_id: series.id, name: user.username, user_id: user.id });
    if (pErr && pErr.code !== "23505") throw pErr;
  }

  if (role === "owner") {
    await sb
      .from("series")
      .update({ created_by: user.id })
      .eq("id", series.id)
      .is("created_by", null);
  }
}
