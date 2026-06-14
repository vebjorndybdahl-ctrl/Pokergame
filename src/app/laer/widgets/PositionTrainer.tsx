"use client";

import { useState } from "react";

type Seat = {
  pos: string;
  full: string;
  note: string;
  // 0 = worst (early), higher = better (late). Drives the strength bar.
  strength: number;
};

// A simplified 6-handed table, ordered by how good the position is to act in.
const SEATS: Seat[] = [
  {
    pos: "UTG",
    full: "Under the gun",
    note: "Først ut, etter blindene. Verste posisjon – alle handler etter deg. Spill bare de sterkeste hendene.",
    strength: 1,
  },
  {
    pos: "MP",
    full: "Midt-posisjon",
    note: "Litt bedre. Noen har allerede handlet, men mange sitter fortsatt bak deg. Hold deg stram.",
    strength: 2,
  },
  {
    pos: "CO",
    full: "Cutoff",
    note: "Nest beste sete. Bare knappen handler etter deg – du kan åpne langt flere hender her.",
    strength: 4,
  },
  {
    pos: "BTN",
    full: "Knappen (dealer)",
    note: "Beste posisjon ved bordet. Du handler sist i hver runde etter floppen. Mest informasjon, flest spillbare hender.",
    strength: 5,
  },
  {
    pos: "SB",
    full: "Liten blind",
    note: "Du satset blindt og handler tidlig etter floppen. Ser billig ut, men er en vanskelig posisjon å spille.",
    strength: 1,
  },
  {
    pos: "BB",
    full: "Stor blind",
    note: "Du har allerede penger i potten, så du forsvarer ofte – men spiller resten av hånden ut av posisjon.",
    strength: 2,
  },
];

export default function PositionTrainer() {
  const [active, setActive] = useState(3); // default to the button

  const seat = SEATS[active];

  return (
    <div className="glass not-prose my-6 rounded-2xl p-6">
      {/* The felt */}
      <div className="relative mx-auto flex aspect-[16/9] max-w-md items-center justify-center">
        <div
          className="absolute inset-x-4 inset-y-2 rounded-[50%] border-2"
          style={{
            background:
              "radial-gradient(ellipse at center, #0c5238 0%, #083626 80%)",
            borderColor: "rgba(245, 212, 114, 0.25)",
          }}
        />
        <span className="relative z-10 select-none text-3xl text-emerald-200/20">
          ♠
        </span>

        {/* Seats positioned around the ellipse */}
        {SEATS.map((s, i) => {
          const angle = (i / SEATS.length) * 2 * Math.PI - Math.PI / 2;
          const left = 50 + 44 * Math.cos(angle);
          const top = 50 + 42 * Math.sin(angle);
          const isActive = i === active;
          return (
            <button
              key={s.pos}
              onClick={() => setActive(i)}
              style={{ left: `${left}%`, top: `${top}%` }}
              className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                isActive
                  ? "scale-110 border-amber-300 bg-amber-300 text-zinc-900 shadow-lg"
                  : "border-white/20 bg-zinc-900/80 text-zinc-300 hover:border-amber-300/50 hover:text-white"
              }`}
            >
              {s.pos}
            </button>
          );
        })}
      </div>

      {/* Detail */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="font-[family-name:var(--font-display)] text-xl font-black text-white">
            {seat.pos} <span className="text-zinc-500">·</span>{" "}
            <span className="text-base font-semibold text-zinc-400">
              {seat.full}
            </span>
          </h4>
        </div>
        <p className="mt-1.5 text-sm text-zinc-400">{seat.note}</p>

        {/* Strength bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Hender du kan spille</span>
            <span>{["", "Svært få", "Få", "Noen", "Mange", "Flest"][seat.strength]}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-300 transition-all"
              style={{ width: `${(seat.strength / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
