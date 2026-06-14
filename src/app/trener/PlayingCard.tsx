"use client";

import {
  RANKS,
  SUIT_GLYPH,
  rankOf,
  suitOf,
  isRed,
  type Card,
} from "@/lib/poker/cards";

export function PlayingCard({
  card,
  hidden,
  small,
}: {
  card?: Card;
  hidden?: boolean;
  small?: boolean;
}) {
  const size = small ? "h-10 w-7 text-sm" : "h-14 w-10 text-base sm:h-16 sm:w-11";

  if (hidden || card === undefined) {
    return (
      <div
        className={`${size} rounded-md border border-emerald-300/20 bg-gradient-to-br from-emerald-800 to-emerald-950 shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${size} flex flex-col items-center justify-center rounded-md border border-zinc-300 bg-white font-bold shadow-sm ${
        isRed(card) ? "text-rose-600" : "text-zinc-900"
      }`}
    >
      <span className="leading-none">{RANKS[rankOf(card)]}</span>
      <span className="leading-none">{SUIT_GLYPH[suitOf(card)]}</span>
    </div>
  );
}
