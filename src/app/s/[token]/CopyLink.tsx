"use client";

import { useState } from "react";

export default function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url =
      typeof window !== "undefined" ? window.location.origin + path : path;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); ignore silently.
    }
  }

  return (
    <button
      onClick={copy}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
        copied
          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
          : "border-amber-300/30 bg-amber-300/5 text-amber-200 hover:border-amber-300/60 hover:bg-amber-300/10"
      }`}
    >
      {copied ? "✓ Kopiert" : "Kopier invitasjonslenke"}
    </button>
  );
}
