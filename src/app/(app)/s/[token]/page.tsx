import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMembership } from "@/lib/guards";
import {
  getSeriesByToken,
  getDashboard,
  getSeriesMembers,
  getInvitableFriends,
} from "@/lib/data";
import { formatMoney, formatAmount, netColor, formatDate } from "@/lib/format";
import { seriesDefaults, blindsLabel, gameTypeLabel } from "@/lib/rules";
import CopyButton from "./CopyButton";
import AddGameForm from "./AddGameForm";
import JoinSeriesPrompt from "./JoinSeriesPrompt";
import RulesForm from "./RulesForm";
import InviteFriends from "./InviteFriends";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await requireUser();
  const series = await getSeriesByToken(token);
  if (!series) notFound();

  const membership = await getMembership(user.id, series.id);

  // Non-member with a valid link → offer to join.
  if (!membership) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16 text-center">
        <div className="animate-rise">
          <div className="text-5xl text-emerald-500/20">♠</div>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-black text-white">
            {series.name}
          </h1>
          <p className="mt-2 text-zinc-400">
            Du er ikke medlem av denne serien ennå.
          </p>
          <div className="mt-6 flex justify-center">
            <JoinSeriesPrompt token={token} seriesName={series.name} />
          </div>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← Til dashbordet
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = membership.role === "owner";
  const [{ players, standings, games }, members, invitable] = await Promise.all(
    [
      getDashboard(series),
      getSeriesMembers(series.id),
      getInvitableFriends(user.id, series.id),
    ],
  );

  const cur = series.currency;
  const ranked = standings.filter((s) => s.gamesPlayed > 0);
  const biggestPot = games.reduce((m, g) => Math.max(m, g.pot), 0);
  const defaults = seriesDefaults(series);
  const ruleChips = [
    defaults.buyIn != null
      ? { label: "Innkjøp", value: formatAmount(defaults.buyIn, cur) }
      : null,
    blindsLabel(defaults)
      ? { label: "Blinds", value: `${blindsLabel(defaults)} ${cur}` }
      : null,
    gameTypeLabel(defaults.gameType)
      ? { label: "Type", value: gameTypeLabel(defaults.gameType)! }
      : null,
    defaults.location ? { label: "Sted", value: defaults.location } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <header className="animate-rise mb-8">
        <Link
          href="/dashboard"
          className="text-xs font-medium text-zinc-500 transition hover:text-amber-200"
        >
          ← Dashbord
        </Link>
        <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-4xl font-black tracking-tight text-white sm:text-5xl">
          {series.name}
        </h1>

        <div className="mt-5 flex flex-wrap gap-2.5 text-sm">
          <Stat label="Spill" value={String(games.length)} />
          <Stat label="Medlemmer" value={String(members.length)} />
          {biggestPot > 0 && (
            <Stat label="Største pott" value={formatAmount(biggestPot, cur)} />
          )}
        </div>

        {/* Share card */}
        <div className="glass mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Bli med-kode
            </div>
            {series.join_code ? (
              <div className="mt-0.5 font-mono text-3xl font-black tracking-[0.25em]">
                <span className="gold-text">{series.join_code}</span>
              </div>
            ) : (
              <div className="mt-0.5 text-sm text-zinc-500">—</div>
            )}
          </div>
          <div className="flex gap-2">
            {series.join_code && (
              <CopyButton value={series.join_code} label="Kopier kode" />
            )}
            <CopyButton value={`/s/${token}`} isPath label="Kopier lenke" />
          </div>
        </div>
      </header>

      {/* Rules */}
      <section className="animate-rise mb-8">
        <SectionTitle>Regler</SectionTitle>
        <div className="glass rounded-2xl p-5">
          {ruleChips.length === 0 && !defaults.notes ? (
            <p className="text-sm text-zinc-500">
              Ingen husregler satt{isOwner ? " ennå." : "."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ruleChips.map((c) => (
                <span
                  key={c.label}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm"
                >
                  <span className="text-zinc-500">{c.label}:</span>{" "}
                  <span className="font-medium text-zinc-100">{c.value}</span>
                </span>
              ))}
            </div>
          )}
          {defaults.notes && (
            <p className="mt-3 text-sm text-zinc-400">{defaults.notes}</p>
          )}
          {isOwner && (
            <div className="mt-4">
              <RulesForm series={series} token={token} />
            </div>
          )}
        </div>
      </section>

      {/* Members + invite */}
      <section className="animate-rise mb-8">
        <SectionTitle>Medlemmer</SectionTitle>
        <div className="glass rounded-2xl p-5">
          <ul className="flex flex-wrap gap-2">
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm"
              >
                <span className="font-medium text-zinc-100">@{m.username}</span>
                {m.role === "owner" && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    eier
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <InviteFriends seriesId={series.id} friends={invitable} />
          </div>
        </div>
      </section>

      {/* Scoreboard */}
      <section className="animate-rise mb-10">
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
      <section className="animate-rise mb-10">
        <SectionTitle>Logg et spill</SectionTitle>
        <AddGameForm token={token} players={players} series={series} />
      </section>

      {/* Games list */}
      <section className="animate-rise">
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
