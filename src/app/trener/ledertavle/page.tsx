import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  getLeaderboard,
  getTrainerStats,
  TRAINER_MIN_DECISIONS,
} from "@/lib/data";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  const [rows, mine] = await Promise.all([
    getLeaderboard(50),
    user ? getTrainerStats(user.id) : Promise.resolve(null),
  ]);

  const onBoard = user && rows.some((r) => r.username === user.username);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      <header className="animate-rise mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-black tracking-tight text-white">
          Ledertavle
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Rangert etter ferdighet — kvaliteten på avgjørelsene dine, ikke flaks
          eller antall hender.
        </p>
      </header>

      {/* Your standing */}
      {user && (
        <div className="glass mb-6 rounded-2xl p-4 text-sm">
          {!mine || mine.gradedDecisions === 0 ? (
            <span className="text-zinc-300">
              Spill i treneren for å få en rangering.
            </span>
          ) : onBoard ? (
            <span className="text-zinc-300">
              Du er på tavla med{" "}
              <span className="font-bold text-emerald-300">
                {Math.round(mine.rating)}%
              </span>{" "}
              i ferdighet.
            </span>
          ) : (
            <span className="text-zinc-300">
              Din ferdighet:{" "}
              <span className="font-bold text-emerald-300">
                {Math.round(mine.rating)}%
              </span>{" "}
              · spill{" "}
              {Math.max(0, TRAINER_MIN_DECISIONS - mine.gradedDecisions)} flere
              avgjørelser for å komme på tavla.
            </span>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="glass rounded-2xl px-4 py-10 text-center text-zinc-400">
          Ingen har kvalifisert seg ennå. Bli den første —{" "}
          <Link href="/trener" className="text-amber-300 hover:text-amber-200">
            spill i treneren
          </Link>
          .
        </p>
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="py-3 pl-5 pr-2 font-semibold">#</th>
                <th className="px-2 py-3 font-semibold">Spiller</th>
                <th className="hidden px-2 py-3 text-center font-semibold sm:table-cell">
                  Hender
                </th>
                <th className="py-3 pl-2 pr-5 text-right font-semibold">
                  Ferdighet
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isMe = user && r.username === user.username;
                return (
                  <tr
                    key={r.rank}
                    className={`border-t border-white/5 ${
                      isMe ? "bg-emerald-400/[0.07]" : ""
                    }`}
                  >
                    <td className="py-3.5 pl-5 pr-2">
                      {MEDALS[r.rank - 1] ?? (
                        <span className="text-zinc-600">{r.rank}</span>
                      )}
                    </td>
                    <td className="px-2 py-3.5 font-semibold text-white">
                      @{r.username}
                      {isMe && (
                        <span className="ml-1.5 text-[10px] text-emerald-300">
                          (deg)
                        </span>
                      )}
                    </td>
                    <td className="hidden px-2 py-3.5 text-center text-zinc-400 sm:table-cell">
                      {r.handsPlayed}
                    </td>
                    <td className="py-3.5 pl-2 pr-5 text-right text-base font-bold tabular-nums text-emerald-300">
                      {r.rating}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!user && (
        <p className="mt-5 text-center text-sm text-zinc-500">
          <Link href="/login" className="text-amber-300 hover:text-amber-200">
            Logg inn
          </Link>{" "}
          for å lagre rangeringen din og bli med på tavla.
        </p>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/trener"
          className="btn-emerald inline-block rounded-xl px-5 py-3 font-bold tracking-wide"
        >
          Til treneren
        </Link>
      </div>
    </main>
  );
}
