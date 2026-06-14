"use client";

import { useState } from "react";

type Hand = {
  name: string;
  desc: string;
  cards: string[]; // e.g. "A♠"
  frequency: string; // human description of rarity
};

// Rank value 1 (strongest) -> 10 (weakest). Card strings use suit glyphs so we
// can color red/black without images.
const HANDS: Hand[] = [
  {
    name: "Royal flush",
    desc: "A-K-D-J-10 i samme sort. Den uslåelige hånden.",
    cards: ["A♠", "K♠", "D♠", "J♠", "10♠"],
    frequency: "1 av 31 000 hender",
  },
  {
    name: "Straight flush",
    desc: "Fem på rad i samme sort.",
    cards: ["9♥", "8♥", "7♥", "6♥", "5♥"],
    frequency: "1 av 3 600 hender",
  },
  {
    name: "Fire like",
    desc: "Fire kort av samme verdi.",
    cards: ["D♣", "D♠", "D♥", "D♦", "7♣"],
    frequency: "1 av 595 hender",
  },
  {
    name: "Hus (fullt hus)",
    desc: "Tre like + to like.",
    cards: ["K♠", "K♥", "K♦", "9♣", "9♠"],
    frequency: "1 av 38 hender",
  },
  {
    name: "Flush",
    desc: "Fem i samme sort, ikke på rad.",
    cards: ["A♦", "J♦", "8♦", "5♦", "2♦"],
    frequency: "1 av 32 hender",
  },
  {
    name: "Straight (rekke)",
    desc: "Fem på rad i blandede sorter.",
    cards: ["10♠", "9♥", "8♣", "7♦", "6♠"],
    frequency: "1 av 21 hender",
  },
  {
    name: "Tre like",
    desc: "Tre kort av samme verdi.",
    cards: ["7♣", "7♥", "7♠", "K♦", "2♣"],
    frequency: "1 av 20 hender",
  },
  {
    name: "To par",
    desc: "To ulike par.",
    cards: ["A♠", "A♣", "9♥", "9♦", "4♠"],
    frequency: "1 av 4 hender",
  },
  {
    name: "Ett par",
    desc: "To kort av samme verdi.",
    cards: ["J♥", "J♠", "K♣", "6♦", "3♠"],
    frequency: "1 av 2,4 hender",
  },
  {
    name: "Høyt kort",
    desc: "Ingenting traff – høyeste kort avgjør.",
    cards: ["A♥", "Q♣", "8♠", "5♦", "2♣"],
    frequency: "Vanligst av alle",
  },
];

function isRed(card: string): boolean {
  return card.includes("♥") || card.includes("♦");
}

function PlayingCard({ card }: { card: string }) {
  // Split rank and suit (suit is always the last char).
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  return (
    <div
      className={`flex h-14 w-10 flex-col items-center justify-center rounded-md border bg-white font-semibold shadow-sm sm:h-16 sm:w-11 ${
        isRed(card) ? "text-rose-600" : "text-zinc-900"
      } border-zinc-300`}
    >
      <span className="text-sm leading-none sm:text-base">{rank}</span>
      <span className="text-base leading-none sm:text-lg">{suit}</span>
    </div>
  );
}

export default function HandRankings() {
  const [active, setActive] = useState(0);
  const hand = HANDS[active];

  return (
    <div className="glass not-prose my-6 overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-0 sm:flex-row">
        {/* Rank list */}
        <ul className="flex shrink-0 flex-row overflow-x-auto border-b border-white/10 sm:w-52 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r">
          {HANDS.map((h, i) => (
            <li key={h.name} className="shrink-0">
              <button
                onClick={() => setActive(i)}
                className={`flex w-full items-center gap-2.5 whitespace-nowrap px-4 py-3 text-left text-sm transition sm:whitespace-normal ${
                  i === active
                    ? "bg-amber-300/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    i === active
                      ? "bg-amber-300 text-zinc-900"
                      : "bg-white/10 text-zinc-400"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="font-medium">{h.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Detail */}
        <div className="flex flex-1 flex-col justify-center p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="font-[family-name:var(--font-display)] text-2xl font-black text-white">
              {hand.name}
            </h4>
            <span className="shrink-0 text-xs text-zinc-500">#{active + 1}</span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">{hand.desc}</p>

          <div className="mt-5 flex gap-2">
            {hand.cards.map((c, idx) => (
              <PlayingCard key={idx} card={c} />
            ))}
          </div>

          <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/5 px-3 py-1 text-xs text-emerald-200/80">
            <span className="text-emerald-300">♦</span> Sjeldenhet: {hand.frequency}
          </div>
        </div>
      </div>
    </div>
  );
}
