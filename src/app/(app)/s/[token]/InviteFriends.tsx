"use client";

import { useState, useTransition } from "react";
import type { FriendInfo } from "@/lib/types";
import { inviteToSeries } from "../../actions";

export default function InviteFriends({
  seriesId,
  friends,
}: {
  seriesId: string;
  friends: FriendInfo[];
}) {
  const [open, setOpen] = useState(false);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (friends.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Ingen venner å invitere. Legg til venner under «Venner» først.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-emerald rounded-lg px-4 py-2 text-sm font-bold"
      >
        Inviter venner
      </button>
    );
  }

  function invite(userId: string) {
    setPendingId(userId);
    startTransition(async () => {
      await inviteToSeries(seriesId, userId);
      setInvited((s) => new Set(s).add(userId));
      setPendingId(null);
    });
  }

  return (
    <ul className="space-y-2">
      {friends.map((f) => (
        <li
          key={f.userId}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-2.5"
        >
          <span className="font-medium text-white">@{f.username}</span>
          {invited.has(f.userId) ? (
            <span className="text-sm text-emerald-300">Invitert ✓</span>
          ) : (
            <button
              onClick={() => invite(f.userId)}
              disabled={pendingId === f.userId}
              className="rounded-lg border border-emerald-400/30 px-3 py-1.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/10 disabled:opacity-50"
            >
              {pendingId === f.userId ? "…" : "Inviter"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
