"use client";

import { useTransition } from "react";
import { deleteGame } from "../../actions";

export default function DeleteGameButton({
  token,
  gameId,
}: {
  token: string;
  gameId: string;
}) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm("Slette dette spillet? Dette kan ikke angres.")) return;
    startTransition(async () => {
      await deleteGame(token, gameId);
    });
  }

  return (
    <button
      onClick={onDelete}
      disabled={pending}
      className="text-xs text-zinc-600 transition hover:text-red-400 disabled:opacity-50"
    >
      {pending ? "Sletter…" : "Slett spill"}
    </button>
  );
}
