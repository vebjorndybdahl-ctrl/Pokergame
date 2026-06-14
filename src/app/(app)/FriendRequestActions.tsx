"use client";

import { useTransition } from "react";
import { acceptFriendRequest, removeFriendship } from "./actions";

// Used for incoming requests (accept / decline) and, with accept hidden, for
// cancelling outgoing requests or unfriending.
export default function FriendRequestActions({
  friendshipId,
  showAccept = true,
  removeLabel = "Avslå",
}: {
  friendshipId: string;
  showAccept?: boolean;
  removeLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex shrink-0 gap-2">
      {showAccept && (
        <button
          onClick={() => startTransition(() => acceptFriendRequest(friendshipId))}
          disabled={pending}
          className="btn-emerald rounded-lg px-3 py-1.5 text-sm font-bold disabled:opacity-50"
        >
          Godta
        </button>
      )}
      <button
        onClick={() => startTransition(() => removeFriendship(friendshipId))}
        disabled={pending}
        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:text-red-300 disabled:opacity-50"
      >
        {removeLabel}
      </button>
    </div>
  );
}
