"use client";

import { useTransition } from "react";
import { acceptInvite, declineInvite } from "./actions";

export default function InviteActions({ invitationId }: { invitationId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex shrink-0 gap-2">
      <button
        onClick={() => startTransition(() => acceptInvite(invitationId))}
        disabled={pending}
        className="btn-emerald rounded-lg px-3 py-1.5 text-sm font-bold disabled:opacity-50"
      >
        Bli med
      </button>
      <button
        onClick={() => startTransition(() => declineInvite(invitationId))}
        disabled={pending}
        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:text-white disabled:opacity-50"
      >
        Avslå
      </button>
    </div>
  );
}
