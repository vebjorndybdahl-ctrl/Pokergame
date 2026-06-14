"use client";

import { useTransition } from "react";
import { logOut } from "../(auth)/actions";

export default function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => logOut())}
      disabled={pending}
      className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:text-white disabled:opacity-50"
    >
      {pending ? "…" : "Logg ut"}
    </button>
  );
}
