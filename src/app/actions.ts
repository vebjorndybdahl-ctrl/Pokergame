"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";

// 12-char URL-safe secret, e.g. "Xa9_Kd2bQ-1f"
function makeToken(): string {
  return randomBytes(9).toString("base64url");
}

export async function createSeries(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const currencyRaw = String(formData.get("currency") ?? "kr").trim();
  const currency = currencyRaw.slice(0, 3) || "kr";

  if (!name) throw new Error("Serienavn er påkrevd.");

  const sb = getSupabaseAdmin();
  const token = makeToken();

  const { error } = await sb
    .from("series")
    .insert({ name, currency, invite_token: token });
  if (error) throw error;

  redirect(`/s/${token}`);
}
