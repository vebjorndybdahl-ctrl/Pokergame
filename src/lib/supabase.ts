import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service-role key. This key bypasses
// row-level security, so it must never reach the browser. Every file that
// imports this module is server-side (enforced by "server-only").
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example to .env.local and fill it in.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
