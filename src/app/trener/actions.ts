"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import type { SessionResult } from "@/lib/types";

// Record a played session for the logged-in user. The user is derived from the
// session (never trusted from the client). The client aggregate is clamped to
// sane bounds before it touches the rating.
export async function recordSession(input: SessionResult): Promise<void> {
  const user = await requireUser();

  const hands = Math.max(0, Math.min(50, Math.floor(input.hands || 0)));
  const decisions = Math.max(0, Math.min(200, Math.floor(input.decisions || 0)));
  const qualitySum = Math.max(0, Math.min(decisions * 100, input.qualitySum || 0));
  if (decisions === 0) return;

  const bucket =
    input.difficulty === "lett"
      ? "easy"
      : input.difficulty === "vanskelig"
        ? "hard"
        : "med";

  const sb = getSupabaseAdmin();
  const { data: cur } = await sb
    .from("trainer_stats")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const prev = cur ?? {
    hands_played: 0,
    graded_decisions: 0,
    quality_sum: 0,
    easy_decisions: 0,
    easy_quality_sum: 0,
    med_decisions: 0,
    med_quality_sum: 0,
    hard_decisions: 0,
    hard_quality_sum: 0,
  };

  const gradedDecisions = Number(prev.graded_decisions) + decisions;
  const qualitySumTotal = Number(prev.quality_sum) + qualitySum;

  const row = {
    user_id: user.id,
    hands_played: Number(prev.hands_played) + hands,
    graded_decisions: gradedDecisions,
    quality_sum: qualitySumTotal,
    rating: gradedDecisions > 0 ? qualitySumTotal / gradedDecisions : 0,
    easy_decisions:
      Number(prev.easy_decisions) + (bucket === "easy" ? decisions : 0),
    easy_quality_sum:
      Number(prev.easy_quality_sum) + (bucket === "easy" ? qualitySum : 0),
    med_decisions:
      Number(prev.med_decisions) + (bucket === "med" ? decisions : 0),
    med_quality_sum:
      Number(prev.med_quality_sum) + (bucket === "med" ? qualitySum : 0),
    hard_decisions:
      Number(prev.hard_decisions) + (bucket === "hard" ? decisions : 0),
    hard_quality_sum:
      Number(prev.hard_quality_sum) + (bucket === "hard" ? qualitySum : 0),
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from("trainer_stats")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw error;

  revalidatePath("/trener/ledertavle");
}
