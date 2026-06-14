"use client";

import { useState } from "react";

// Copies `value` to the clipboard. If `isPath` is set, the current origin is
// prepended (so a path like "/s/abc" becomes a full shareable URL).
export default function CopyButton({
  value,
  isPath = false,
  label,
  copiedLabel = "✓ Kopiert",
  className = "",
}: {
  value: string;
  isPath?: boolean;
  label: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text =
      isPath && typeof window !== "undefined"
        ? window.location.origin + value
        : value;
    try {
      await navigator.clipboard.writeText(text);
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
          : "border-white/15 bg-white/5 text-zinc-200 hover:border-white/30 hover:text-white"
      } ${className}`}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
