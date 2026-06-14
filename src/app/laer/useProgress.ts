"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Tracks which lessons the reader has marked complete. Stored in a plain cookie
// so progress survives reloads without needing an account. We use
// useSyncExternalStore so the server snapshot (empty) and the client snapshot
// (from cookie) stay hydration-safe without a setState-in-effect.
const COOKIE = "poker_guide_done";
const MAX_AGE = 60 * 60 * 24 * 365; // one year

function readCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(COOKIE + "="));
  if (!match) return "";
  try {
    return decodeURIComponent(match.slice(COOKIE.length + 1));
  } catch {
    return "";
  }
}

function writeCookie(value: string) {
  document.cookie = `${COOKIE}=${encodeURIComponent(
    value,
  )}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

// Simple subscriber set so multiple components re-render together when the
// cookie changes (e.g. the hub and a lesson card on the same page).
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// The raw comma-joined string is the snapshot. Returning a stable string keeps
// useSyncExternalStore happy (no new object every render).
function getSnapshot(): string {
  return readCookie();
}
function getServerSnapshot(): string {
  return "";
}

export function useProgress() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const done = useMemo(
    () => new Set(raw ? raw.split(",") : []),
    [raw],
  );

  const toggle = useCallback((slug: string) => {
    const current = new Set(readCookie() ? readCookie().split(",") : []);
    if (current.has(slug)) current.delete(slug);
    else current.add(slug);
    writeCookie([...current].join(","));
    emit();
  }, []);

  const isDone = useCallback((slug: string) => done.has(slug), [done]);

  // `ready` is true once mounted on the client; on the server snapshot it's "".
  const ready = typeof document !== "undefined";

  return { done, isDone, toggle, ready };
}
