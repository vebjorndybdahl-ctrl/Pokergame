import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import { getSupabaseAdmin } from "./supabase";
import type { User } from "./types";

export const SESSION_COOKIE = "ap_session";
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Issue a new session: store only the token hash server-side, hand the raw
// token to the browser in an httpOnly cookie.
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MS);

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("sessions").insert({
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const sb = getSupabaseAdmin();
    await sb.from("sessions").delete().eq("token_hash", hashToken(token));
    jar.delete(SESSION_COOKIE);
  }
}

// Resolve the logged-in user from the session cookie. Cached per request so
// multiple server components don't each hit the DB.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sb = getSupabaseAdmin();
  const { data: session } = await sb
    .from("sessions")
    .select("user_id, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const { data: user } = await sb
    .from("users")
    .select("id, username, created_at")
    .eq("id", session.user_id)
    .maybeSingle();

  return (user as User) ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
