import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeriesByToken, getGameDetail } from "@/lib/data";
import { formatMoney, formatAmount, netColor, formatDate } from "@/lib/format";
import DeleteGameButton from "./DeleteGameButton";

export default async function GamePage({
  params,
}: {
  params: Promise<{ token: string; gameId: string }>;
}) {
  const { token, gameId } = await params;
  const series = await getSeriesByToken(token);
  if (!series) notFound();

  const detail = await getGameDetail(series, gameId);
  if (!detail) notFound();

  const { game, rows } = detail;
  const cur = series.currency;
  const pot = rows.reduce((sum, r) => sum + r.buyIn, 0);
  const diff = rows.reduce((sum, r) => sum + r.net, 0);

  return (
    <main className="animate-rise mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      <Link
        href={`/s/${token}`}
        className="text-sm font-medium text-zinc-500 transition hover:text-amber-200"
      >
        ← {series.name}
      </Link>

      <header className="mb-6 mt-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black capitalize tracking-tight text-white sm:text-4xl">
          {formatDate(game.played_on)}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          {rows.length} spillere · {formatAmount(pot, cur)} på bordet
          {game.note ? ` · ${game.note}` : ""}
        </p>
      </header>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="py-3 pl-5 pr-2 font-semibold">Spiller</th>
              <th className="px-2 py-3 text-right font-semibold">Innkjøp</th>
              <th className="px-2 py-3 text-right font-semibold">Utbetaling</th>
              <th className="py-3 pl-2 pr-5 text-right font-semibold">Netto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.playerId} className="border-t border-white/5">
                <td className="py-3.5 pl-5 pr-2 font-semibold text-white">
                  {i === 0 && rows.length > 1 && r.net > 0 && (
                    <span className="mr-1.5">👑</span>
                  )}
                  {r.name}
                </td>
                <td className="px-2 py-3.5 text-right tabular-nums text-zinc-400">
                  {formatAmount(r.buyIn, cur)}
                </td>
                <td className="px-2 py-3.5 text-right tabular-nums text-zinc-400">
                  {formatAmount(r.cashOut, cur)}
                </td>
                <td
                  className={`py-3.5 pl-2 pr-5 text-right text-base font-bold tabular-nums ${netColor(
                    r.net,
                  )}`}
                >
                  {formatMoney(r.net, cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs">
          {Math.abs(diff) < 0.005 ? (
            <span className="font-semibold text-emerald-500">
              Bordet er i balanse ✓
            </span>
          ) : (
            <span className="font-semibold text-amber-500">
              Bordet har avvik på {formatMoney(diff, cur)} (innkjøp vs utbetaling)
            </span>
          )}
        </p>
        <DeleteGameButton token={token} gameId={gameId} />
      </div>
    </main>
  );
}
