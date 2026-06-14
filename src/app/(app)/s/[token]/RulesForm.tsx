"use client";

import { useState, useTransition } from "react";
import type { Series } from "@/lib/types";
import { GAME_TYPES } from "@/lib/rules";
import { updateSeriesRules, type RulesInput } from "../../actions";

function str(v: number | null): string {
  return v === null || v === undefined ? "" : String(v);
}

export default function RulesForm({
  series,
  token,
}: {
  series: Series;
  token: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<RulesInput>({
    currency: series.currency,
    defaultBuyIn: str(series.default_buy_in),
    smallBlind: str(series.small_blind),
    bigBlind: str(series.big_blind),
    location: series.location ?? "",
    gameType: series.game_type ?? "",
    notes: series.rules_notes ?? "",
  });

  function set(patch: Partial<RulesInput>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function save() {
    startTransition(async () => {
      await updateSeriesRules(series.id, token, form);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:border-amber-300/40 hover:text-white"
      >
        Rediger regler
      </button>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <Field label="Valuta">
        <input
          value={form.currency}
          onChange={(e) => set({ currency: e.target.value })}
          maxLength={3}
          className="field w-full px-3 py-2"
        />
      </Field>
      <Field label="Standard innkjøp">
        <input
          type="number"
          inputMode="decimal"
          value={form.defaultBuyIn}
          onChange={(e) => set({ defaultBuyIn: e.target.value })}
          className="field w-full px-3 py-2"
        />
      </Field>
      <Field label="Liten blind">
        <input
          type="number"
          inputMode="decimal"
          value={form.smallBlind}
          onChange={(e) => set({ smallBlind: e.target.value })}
          className="field w-full px-3 py-2"
        />
      </Field>
      <Field label="Stor blind">
        <input
          type="number"
          inputMode="decimal"
          value={form.bigBlind}
          onChange={(e) => set({ bigBlind: e.target.value })}
          className="field w-full px-3 py-2"
        />
      </Field>
      <Field label="Spilltype">
        <select
          value={form.gameType}
          onChange={(e) => set({ gameType: e.target.value })}
          className="field w-full px-3 py-2"
        >
          <option value="">—</option>
          {GAME_TYPES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Sted">
        <input
          value={form.location}
          onChange={(e) => set({ location: e.target.value })}
          maxLength={80}
          className="field w-full px-3 py-2"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notater">
          <input
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
            maxLength={200}
            className="field w-full px-3 py-2"
          />
        </Field>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button
          onClick={save}
          disabled={pending}
          className="btn-gold rounded-xl px-5 py-2 font-bold tracking-wide disabled:opacity-50"
        >
          {pending ? "Lagrer…" : "Lagre regler"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={pending}
          className="rounded-xl border border-white/10 px-5 py-2 font-medium text-zinc-300 hover:text-white disabled:opacity-50"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-zinc-300">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
