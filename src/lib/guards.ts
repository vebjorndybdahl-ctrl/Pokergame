import "server-only";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "./supabase";
import { requireUser } from "./auth";
import type { User } from "./types";

export type Role = "owner" | "member";

export async function getMembership(
  userId: string,
  seriesId: string,
): Promise<{ role: Role } | null> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("series_members")
    .select("role")
    .eq("series_id", seriesId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { role: data.role as Role } : null;
}

// Series-scoped mutations go through these. Since the service-role key bypasses
// RLS, this app-level check IS the access control — never mutate a series
// without it. notFound() avoids leaking whether a series exists.
export async function requireSeriesMember(
  seriesId: string,
): Promise<{ user: User; role: Role }> {
  const user = await requireUser();
  const membership = await getMembership(user.id, seriesId);
  if (!membership) notFound();
  return { user, role: membership.role };
}

export async function requireSeriesOwner(
  seriesId: string,
): Promise<{ user: User }> {
  const { user, role } = await requireSeriesMember(seriesId);
  if (role !== "owner") notFound();
  return { user };
}
