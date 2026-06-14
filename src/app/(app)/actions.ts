"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import {
  getMembership,
  requireSeriesMember,
  requireSeriesOwner,
} from "@/lib/guards";
import { ensureMembership } from "@/lib/membership";
import { getSeriesById } from "@/lib/data";

// ---------- Friends ----------

export async function sendFriendRequest(
  addresseeId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (addresseeId === user.id)
    return { error: "Du kan ikke legge til deg selv." };

  const sb = getSupabaseAdmin();
  const { data: existing } = await sb
    .from("friendships")
    .select("id")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`,
    )
    .maybeSingle();
  if (existing)
    return { error: "Dere er allerede venner eller har en forespørsel." };

  const { error } = await sb
    .from("friendships")
    .insert({ requester_id: user.id, addressee_id: addresseeId, status: "pending" });
  if (error && error.code !== "23505") throw error;

  revalidatePath("/friends");
  revalidatePath("/dashboard");
  return {};
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const user = await requireUser();
  const sb = getSupabaseAdmin();
  // Only the addressee of a pending request may accept it.
  await sb
    .from("friendships")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  revalidatePath("/friends");
  revalidatePath("/dashboard");
}

// Decline an incoming request, cancel an outgoing one, or unfriend — any
// friendship row the user is part of.
export async function removeFriendship(friendshipId: string): Promise<void> {
  const user = await requireUser();
  const sb = getSupabaseAdmin();
  await sb
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  revalidatePath("/friends");
  revalidatePath("/dashboard");
}

// ---------- Invitations ----------

export async function inviteToSeries(
  seriesId: string,
  inviteeId: string,
): Promise<{ error?: string }> {
  const { user } = await requireSeriesMember(seriesId); // any member can invite
  const sb = getSupabaseAdmin();

  const already = await getMembership(inviteeId, seriesId);
  if (already) return { error: "Spilleren er allerede medlem." };

  const { error } = await sb.from("series_invitations").insert({
    series_id: seriesId,
    inviter_id: user.id,
    invitee_id: inviteeId,
    status: "pending",
  });
  if (error && error.code !== "23505") throw error; // 23505 = already invited

  return {};
}

export async function acceptInvite(invitationId: string): Promise<void> {
  const user = await requireUser();
  const sb = getSupabaseAdmin();

  const { data: inv } = await sb
    .from("series_invitations")
    .select("id, series_id, invitee_id, status")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv || inv.invitee_id !== user.id || inv.status !== "pending") return;

  const series = await getSeriesById(inv.series_id);
  if (series) await ensureMembership(series, user);

  await sb
    .from("series_invitations")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  revalidatePath("/dashboard");
  if (series) redirect(`/s/${series.invite_token}`);
}

export async function declineInvite(invitationId: string): Promise<void> {
  const user = await requireUser();
  const sb = getSupabaseAdmin();
  await sb
    .from("series_invitations")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("invitee_id", user.id);

  revalidatePath("/dashboard");
}

// ---------- Membership ----------

export async function leaveSeries(seriesId: string): Promise<void> {
  const user = await requireUser();
  const sb = getSupabaseAdmin();

  const { data: membership } = await sb
    .from("series_members")
    .select("id, role")
    .eq("series_id", seriesId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return;

  // Leaving removes only the membership — players/game_results stay so the
  // historical scoreboard is preserved.
  await sb.from("series_members").delete().eq("id", membership.id);

  // If the last owner left, hand ownership to the earliest remaining member.
  if (membership.role === "owner") {
    const { data: otherOwners } = await sb
      .from("series_members")
      .select("id")
      .eq("series_id", seriesId)
      .eq("role", "owner")
      .limit(1);
    if (!otherOwners || otherOwners.length === 0) {
      const { data: next } = await sb
        .from("series_members")
        .select("id, user_id")
        .eq("series_id", seriesId)
        .order("joined_at", { ascending: true })
        .limit(1);
      if (next && next.length > 0) {
        await sb
          .from("series_members")
          .update({ role: "owner" })
          .eq("id", next[0].id);
        await sb
          .from("series")
          .update({ created_by: next[0].user_id })
          .eq("id", seriesId);
      }
    }
  }

  revalidatePath("/dashboard");
}

// ---------- Series rules (owner only) ----------

export type RulesInput = {
  currency: string;
  defaultBuyIn: string;
  smallBlind: string;
  bigBlind: string;
  location: string;
  gameType: string;
  notes: string;
};

function numOrNull(s: string): number | null {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export async function updateSeriesRules(
  seriesId: string,
  token: string,
  input: RulesInput,
): Promise<void> {
  await requireSeriesOwner(seriesId);
  const sb = getSupabaseAdmin();

  await sb
    .from("series")
    .update({
      currency: input.currency.trim().slice(0, 3) || "kr",
      default_buy_in: numOrNull(input.defaultBuyIn),
      small_blind: numOrNull(input.smallBlind),
      big_blind: numOrNull(input.bigBlind),
      location: input.location.trim() || null,
      game_type: input.gameType || null,
      rules_notes: input.notes.trim() || null,
    })
    .eq("id", seriesId);

  revalidatePath(`/s/${token}`);
}
