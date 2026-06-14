import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeriesByToken, getDashboard } from "@/lib/data";
import { formatMoney, formatAmount, netColor, formatDate } from "@/lib/format";
import CopyLink from "./CopyLink";
import AddGameForm from "./AddGameForm";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const series = await getSeriesByToken(token);
  if (!series) notFound();

  const { players, standings, games } = await getDashboard(series);
  const cur = series.currency;
  const ranked = standings.filter((s) => s.gamesPlayed > 0);
  const biggestPot = games.reduce((m, g) => Math.max(m, g.pot), 0);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      {/* Header */}
      <header className="animate-rise mb-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-xs font-medium tracking-wide text-zinc-500 transition hover:text-amber-200"
            >
              <span className="gold-text">♠ Alpha</span> Poker
            </Link>
            <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-4xl font-black tracking-tight text-white sm:text-5xl">
              {series.name}
            </h1>
          </div>
          <CopyLink path={`/s/${token}`} />
        </div>

        {/* Stat chips */}
        <div className="mt-5 flex flex-wrap gap-2.5 text-sm">
          <Stat label="Spill" value={String(games.length)} />
          <Stat label="Spillere" value={String(players.length)} />
          {biggestPot > 0 && (
            <Stat label="Største pott" value={formatAmount(biggestPot, cur)} />
          )}
        </div>
      </header>

      {/* Scoreboard */}
      <section className="animate-rise mb-10" style={{ animationDelay: "0.05s" }}>
        <SectionTitle>Stilling</SectionTitle>
        {ranked.length === 0 ? (
          <p className="glass rounded-2xl px-4 py-10 text-center text-zinc-400">
            Ingen spill logget ennå. Legg til det første nedenfor.
          </p>
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="py-3 pl-5 pr-2 font-semibold">#</th>
                  <th className="px-2 py-3 font-semibold">Spiller</th>
                  <th className="px-2 py-3 text-center font-semibold">Spill</th>
                  <th className="hidden px-2 py-3 text-right font-semibold sm:table-cell">
                    Kjøpt inn
                  </th>
                  <th className="py-3 pl-2 pr-5 text-right font-semibold">
                    Netto
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((s, i) => (
                  <tr
                    key={s.playerId}
                    className={`border-t border-white/5 ${
                      i === 0 ? "bg-amber-300/[0.06]" : ""
                    }`}
                  >
                    <td className="py-3.5 pl-5 pr-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center text-base">
                        {MEDALS[i] ?? (
                          <span className="text-zinc-600">{i + 1}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 font-semibold text-white">
                      {s.name}
                    </td>
                    <td className="px-2 py-3.5 text-center text-zinc-400">
                      {s.gamesPlayed}
                    </td>
                    <td className="hidden px-2 py-3.5 text-right tabular-nums text-zinc-400 sm:table-cell">
                      {formatAmount(s.totalBuyIn, cur)}
                    </td>
                    <td
                      className={`py-3.5 pl-2 pr-5 text-right text-base font-bold tabular-nums ${netColor(
                        s.net,
                      )}`}
                    >
                      {formatMoney(s.net, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add game */}
      <section className="animate-rise mb-10" style={{ animationDelay: "0.1s" }}>
        <SectionTitle>Logg et spill</SectionTitle>
        <AddGameForm token={token} players={players} currency={cur} />
      </section>

      {/* Games list */}
      <section className="animate-rise" style={{ animationDelay: "0.15s" }}>
        <SectionTitle>Spill</SectionTitle>
        {games.length === 0 ? (
          <p className="text-sm text-zinc-500">Ingenting her ennå.</p>
        ) : (
          <ul className="space-y-2.5">
            {games.map(({ game, playerCount, pot, topWinner }) => (
              <li key={game.id}>
                <Link
                  href={`/s/${token}/g/${game.id}`}
                  className="glass card-rise flex items-center justify-between gap-4 rounded-2xl px-5 py-4 hover:border-amber-300/30"
                >
                  <div className="min-w-0">
                    <div className="font-semibold capitalize text-white">
                      {formatDate(game.played_on)}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {playerCount} spillere · {formatAmount(pot, cur)} pott
                      {game.note ? ` · ${game.note}` : ""}
                    </div>
                  </div>
                  {topWinner && (
                    <div className="shrink-0 text-right text-xs">
                      <div className="text-zinc-500">kveldens vinner</div>
                      <div className="font-semibold text-zinc-200">
                        {topWinner.name}{" "}
                        <span className={netColor(topWinner.net)}>
                          {formatMoney(topWinner.net, cur)}
                        </span>
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center gap-3">
      <h2 className="text-lg font-bold text-white">{children}</h2>
      <div className="gold-rule h-px flex-1" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl px-4 py-2">
      <span className="font-bold text-white">{value}</span>{" "}
      <span className="text-zinc-400">{label}</span>
    </div>
  );
}
