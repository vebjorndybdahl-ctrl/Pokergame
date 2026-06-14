"use client";

import { useMemo, useState, useTransition } from "react";
import type { Player } from "@/lib/types";
import { formatAmount, formatMoney } from "@/lib/format";
import { addGame, type GameEntry } from "./actions";

type Row = {
  key: string;
  playerId: string; // "" = none, "__new__" = create a new player
  newName: string;
  buyIn: string;
  cashOut: string;
};

let rowSeq = 0;
function blankRow(): Row {
  rowSeq += 1;
  return { key: `r${rowSeq}`, playerId: "", newName: "", buyIn: "", cashOut: "" };
}

function todayISO(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

export default function AddGameForm({
  token,
  players,
  currency,
}: {
  token: string;
  players: Player[];
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [playedOn, setPlayedOn] = useState(todayISO);
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>(() => [blankRow(), blankRow()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeRow(key: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  // Players already chosen in another row can't be picked twice.
  const chosen = new Set(
    rows.map((r) => r.playerId).filter((id) => id && id !== "__new__"),
  );

  const totals = useMemo(() => {
    let buy = 0;
    let cash = 0;
    for (const r of rows) {
      buy += parseFloat(r.buyIn) || 0;
      cash += parseFloat(r.cashOut) || 0;
    }
    return { buy, cash, diff: cash - buy };
  }, [rows]);

  function submit() {
    setError(null);

    const entries: GameEntry[] = [];
    for (const r of rows) {
      const isNew = r.playerId === "__new__";
      const hasPlayer = isNew ? r.newName.trim() !== "" : r.playerId !== "";
      if (!hasPlayer) continue;
      entries.push({
        playerId: isNew ? undefined : r.playerId,
        newName: isNew ? r.newName.trim() : undefined,
        buyIn: parseFloat(r.buyIn) || 0,
        cashOut: parseFloat(r.cashOut) || 0,
      });
    }

    if (entries.length === 0) {
      setError("Legg til minst én spiller.");
      return;
    }

    startTransition(async () => {
      try {
        await addGame(token, { playedOn, note, entries });
        // On success the action redirects to the new game's page.
      } catch (e) {
        setError(e instanceof Error ? e.message : "Noe gikk galt.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-emerald rounded-xl px-5 py-3 font-bold tracking-wide"
      >
        + Logg et spill
      </button>
    );
  }

  return (
    <div className="glass rounded-3xl p-6">
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium text-zinc-200">
          Dato
          <input
            type="date"
            value={playedOn}
            onChange={(e) => setPlayedOn(e.target.value)}
            className="field mt-1.5 block px-3 py-2 [color-scheme:dark]"
          />
        </label>
        <label className="flex-1 text-sm font-medium text-zinc-200">
          Notat (valgfritt)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={120}
            placeholder="f.eks. hjemme hos Mikkel"
            className="field mt-1.5 block w-full px-3 py-2"
          />
        </label>
      </div>

      <div className="space-y-2.5">
        <div className="hidden grid-cols-[1fr_7rem_7rem_2rem] gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:grid">
          <span>Spiller</span>
          <span>Innkjøp</span>
          <span>Utbetaling</span>
          <span />
        </div>

        {rows.map((r) => (
          <div
            key={r.key}
            className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_7rem_7rem_2rem]"
          >
            <div className="col-span-2 sm:col-span-1">
              <select
                value={r.playerId}
                onChange={(e) => update(r.key, { playerId: e.target.value })}
                className="field w-full px-2.5 py-2"
              >
                <option value="">— velg spiller —</option>
                {players.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={chosen.has(p.id) && r.playerId !== p.id}
                  >
                    {p.name}
                  </option>
                ))}
                <option value="__new__">➕ Ny spiller…</option>
              </select>
              {r.playerId === "__new__" && (
                <input
                  autoFocus
                  value={r.newName}
                  onChange={(e) => update(r.key, { newName: e.target.value })}
                  placeholder="Navn på ny spiller"
                  maxLength={40}
                  className="field mt-2 w-full px-2.5 py-2"
                />
              )}
            </div>

            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={r.buyIn}
              onChange={(e) => update(r.key, { buyIn: e.target.value })}
              placeholder="0"
              className="field w-full px-2.5 py-2"
            />
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={r.cashOut}
              onChange={(e) => update(r.key, { cashOut: e.target.value })}
              placeholder="0"
              className="field w-full px-2.5 py-2"
            />
            <button
              type="button"
              onClick={() => removeRow(r.key)}
              aria-label="Fjern rad"
              className="hidden items-center justify-center rounded-md text-zinc-600 transition hover:text-red-400 sm:flex"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, blankRow()])}
        className="mt-3.5 text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
      >
        + Legg til spillerrad
      </button>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
        <div className="text-zinc-400">
          Bord:{" "}
          <span className="text-zinc-200">{formatAmount(totals.buy, currency)} inn</span>{" "}
          ·{" "}
          <span className="text-zinc-200">{formatAmount(totals.cash, currency)} ut</span>{" "}
          ·{" "}
          {Math.abs(totals.diff) < 0.005 ? (
            <span className="font-semibold text-emerald-400">i balanse ✓</span>
          ) : (
            <span className="font-semibold text-amber-400">
              avvik {formatMoney(totals.diff, currency)}
            </span>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-5 flex gap-2.5">
        <button
          onClick={submit}
          disabled={pending}
          className="btn-gold rounded-xl px-5 py-2.5 font-bold tracking-wide disabled:opacity-50"
        >
          {pending ? "Lagrer…" : "Lagre spill"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={pending}
          className="rounded-xl border border-white/10 px-5 py-2.5 font-medium text-zinc-300 transition hover:border-white/25 hover:text-white disabled:opacity-50"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}
