"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";

// 12-char URL-safe secret for the invite link, e.g. "Xa9_Kd2bQ-1f"
function makeToken(): string {
  return randomBytes(9).toString("base64url");
}

// Short, human-typeable join code without ambiguous characters (no I/O/0/1).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars
function makeCode(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

// Normalize whatever the user typed into a clean code (uppercase, A-Z/2-9 only).
function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function createSeries(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const currencyRaw = String(formData.get("currency") ?? "kr").trim();
  const currency = currencyRaw.slice(0, 3) || "kr";

  if (!name) throw new Error("Serienavn er påkrevd.");

  const sb = getSupabaseAdmin();

  // Retry on the rare chance a generated token/code already exists.
  for (let attempt = 0; attempt < 6; attempt++) {
    const token = makeToken();
    const join_code = makeCode();
    const { error } = await sb
      .from("series")
      .insert({ name, currency, invite_token: token, join_code });

    if (!error) redirect(`/s/${token}`); // throws NEXT_REDIRECT on success
    if (error.code !== "23505") throw error; // 23505 = unique violation
  }

  throw new Error("Kunne ikke opprette serie. Prøv igjen.");
}

// Join an existing series by its short code. Returns an error message on miss;
// redirects into the series on a hit.
export async function joinSeries(rawCode: string): Promise<{ error: string }> {
  const code = normalizeCode(rawCode);
  if (!code) return { error: "Skriv inn en kode." };

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("series")
    .select("invite_token")
    .eq("join_code", code)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { error: "Fant ingen serie med koden " + code + "." };

  redirect(`/s/${data.invite_token}`); // throws NEXT_REDIRECT
}
