"use client";

import { useState, useTransition } from "react";
import { sendFriendRequest } from "../actions";
import type { DirectoryUser } from "@/lib/types";

export default function DirectoryButton({
  userId,
  relation,
}: {
  userId: string;
  relation: DirectoryUser["relation"];
}) {
  const [state, setState] = useState(relation);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (state === "friends")
    return <span className="text-sm font-medium text-emerald-300">Venner ✓</span>;
  if (state === "outgoing")
    return <span className="text-sm text-zinc-500">Forespurt</span>;
  if (state === "incoming")
    return <span className="text-sm text-amber-300">Venter på deg ↑</span>;

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await sendFriendRequest(userId);
      if (res?.error) setError(res.error);
      else setState("outgoing");
    });
  }

  return (
    <div className="text-right">
      <button
        onClick={add}
        disabled={pending}
        className="btn-emerald rounded-lg px-3 py-1.5 text-sm font-bold disabled:opacity-50"
      >
        {pending ? "…" : "Legg til venn"}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
