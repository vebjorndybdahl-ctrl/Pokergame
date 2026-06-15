"use client";

import type { Cell } from "@/lib/poker/grid";

export default function HandGrid({
  grid,
  selected,
  onToggle,
}: {
  grid: Cell[][];
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div
      className="select-none"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(13, minmax(0, 1fr))",
        gap: "2px",
      }}
    >
      {grid.flatMap((row) =>
        row.map((cell) => {
          const on = selected.has(cell.key);
          const base = on
            ? "bg-emerald-500 text-emerald-950"
            : cell.kind === "pair"
              ? "bg-zinc-700/80 text-zinc-200"
              : cell.kind === "suited"
                ? "bg-zinc-800 text-zinc-400"
                : "bg-zinc-900 text-zinc-500";
          return (
            <button
              key={cell.key}
              onClick={() => onToggle(cell.key)}
              className={`flex aspect-square items-center justify-center rounded-[3px] text-[8px] font-bold leading-none transition-colors sm:text-[10px] ${base}`}
            >
              {cell.key}
            </button>
          );
        }),
      )}
    </div>
  );
}
