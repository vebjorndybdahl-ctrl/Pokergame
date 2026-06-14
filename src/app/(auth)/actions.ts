"use server";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/auth";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function signUp(formData: FormData): Promise<{ error: string }> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!USERNAME_RE.test(username)) {
    return { error: "Brukernavn må være 3–20 tegn: bokstaver, tall eller _." };
  }
  if (password.length < 6) {
    return { error: "Passordet må være minst 6 tegn." };
  }

  const sb = getSupabaseAdmin();
  const password_hash = await hashPassword(password);
  const { data, error } = await sb
    .from("users")
    .insert({ username, username_ci: username.toLowerCase(), password_hash })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Brukernavnet er opptatt." };
    throw error;
  }

  await createSession(data.id);
  redirect("/dashboard");
}

export async function logIn(formData: FormData): Promise<{ error: string }> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Fyll inn brukernavn og passord." };
  }

  const sb = getSupabaseAdmin();
  const { data: user } = await sb
    .from("users")
    .select("id, password_hash")
    .eq("username_ci", username.toLowerCase())
    .maybeSingle();

  if (!user) {
    // Burn comparable time so a missing username isn't detectable by timing.
    await hashPassword(password);
    return { error: "Feil brukernavn eller passord." };
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return { error: "Feil brukernavn eller passord." };

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logOut(): Promise<void> {
  await destroySession();
  redirect("/");
}
