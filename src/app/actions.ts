"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { getSeriesByToken, getSeriesByJoinCode } from "@/lib/data";
import { ensureMembership } from "@/lib/membership";

// 12-char URL-safe secret for the invite link.
function makeToken(): string {
  return randomBytes(9).toString("base64url");
}

// Short, human-typeable join code without ambiguous characters (no I/O/0/1).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}
function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function createSeries(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const currencyRaw = String(formData.get("currency") ?? "kr").trim();
  const currency = currencyRaw.slice(0, 3) || "kr";

  if (!name) throw new Error("Serienavn er påkrevd.");

  const sb = getSupabaseAdmin();

  for (let attempt = 0; attempt < 6; attempt++) {
    const token = makeToken();
    const join_code = makeCode();
    const { data: series, error } = await sb
      .from("series")
      .insert({ name, currency, invite_token: token, join_code, created_by: user.id })
      .select("id, invite_token")
      .single();

    if (!error && series) {
      await sb
        .from("series_members")
        .insert({ series_id: series.id, user_id: user.id, role: "owner" });
      await sb
        .from("players")
        .insert({ series_id: series.id, name: user.username, user_id: user.id });
      redirect(`/s/${series.invite_token}`);
    }
    if (error && error.code !== "23505") throw error;
  }

  throw new Error("Kunne ikke opprette serie. Prøv igjen.");
}

// Join by short code (from the dashboard).
export async function joinSeries(rawCode: string): Promise<{ error: string }> {
  const user = await requireUser();
  const code = normalizeCode(rawCode);
  if (!code) return { error: "Skriv inn en kode." };

  const series = await getSeriesByJoinCode(code);
  if (!series) return { error: "Fant ingen serie med koden " + code + "." };

  await ensureMembership(series, user);
  redirect(`/s/${series.invite_token}`);
}

// Join via a secret invite link the user already opened.
export async function joinSeriesByToken(token: string): Promise<void> {
  const user = await requireUser();
  const series = await getSeriesByToken(token);
  if (!series) redirect("/dashboard");
  await ensureMembership(series, user);
  redirect(`/s/${token}`);
}
