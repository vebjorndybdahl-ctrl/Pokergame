import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import {
  getUserSeries,
  getPendingInvites,
  getFriendRequests,
} from "@/lib/data";
import { formatMoney, netColor } from "@/lib/format";
import { createSeries } from "../../actions";
import JoinForm from "../../JoinForm";
import InviteActions from "../InviteActions";
import FriendRequestActions from "../FriendRequestActions";
import LeaveButton from "./LeaveButton";

export const metadata: Metadata = { title: "Dashbord · Alpha Poker" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [series, invites, requests] = await Promise.all([
    getUserSeries(user.id),
    getPendingInvites(user.id),
    getFriendRequests(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <header className="animate-rise mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-black tracking-tight text-white">
          Hei, <span className="gold-text">{user.username}</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Seriene dine, invitasjoner og venneforespørsler.
        </p>
      </header>

      {/* Pending series invites */}
      {invites.length > 0 && (
        <section className="animate-rise mb-8">
          <SectionTitle>Invitasjoner</SectionTitle>
          <ul className="space-y-2.5">
            {invites.map((inv) => (
              <li
                key={inv.invitationId}
                className="glass-emerald flex items-center justify-between gap-4 rounded-2xl px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-white">{inv.seriesName}</div>
                  <div className="text-xs text-zinc-400">
                    invitert av @{inv.inviterUsername}
                  </div>
                </div>
                <InviteActions invitationId={inv.invitationId} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Incoming friend requests */}
      {requests.incoming.length > 0 && (
        <section className="animate-rise mb-8">
          <SectionTitle>Venneforespørsler</SectionTitle>
          <ul className="space-y-2.5">
            {requests.incoming.map((req) => (
              <li
                key={req.friendshipId}
                className="glass flex items-center justify-between gap-4 rounded-2xl px-5 py-4"
              >
                <div className="font-semibold text-white">@{req.username}</div>
                <FriendRequestActions friendshipId={req.friendshipId} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Series list */}
      <section className="animate-rise mb-8">
        <SectionTitle>Dine serier</SectionTitle>
        {series.length === 0 ? (
          <p className="glass rounded-2xl px-4 py-8 text-center text-zinc-400">
            Du er ikke med i noen serier ennå. Opprett en, eller bli med med en
            kode.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {series.map((s) => (
              <li
                key={s.series.id}
                className="glass card-rise flex items-center gap-4 rounded-2xl px-5 py-4"
              >
                <Link
                  href={`/s/${s.series.invite_token}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {s.series.name}
                    </span>
                    {s.role === "owner" && (
                      <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                        Eier
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {s.memberCount} medlemmer · {s.gameCount} spill
                  </div>
                </Link>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    din netto
                  </div>
                  <div className={`font-bold tabular-nums ${netColor(s.net)}`}>
                    {formatMoney(s.net, s.series.currency)}
                  </div>
                </div>
                <LeaveButton
                  seriesId={s.series.id}
                  seriesName={s.series.name}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Create + join */}
      <section className="animate-rise grid gap-4 sm:grid-cols-2">
        <details className="glass rounded-2xl p-5 [&_summary]:cursor-pointer">
          <summary className="font-bold text-white">+ Ny serie</summary>
          <form action={createSeries} className="mt-4">
            <label className="block text-sm text-zinc-300">
              Serienavn
              <input
                name="name"
                required
                maxLength={60}
                placeholder="Torsdagspoker"
                className="field mt-1.5 w-full px-3 py-2"
              />
            </label>
            <label className="mt-3 block text-sm text-zinc-300">
              Valuta
              <input
                name="currency"
                defaultValue="kr"
                maxLength={3}
                className="field mt-1.5 w-20 px-3 py-2 text-center"
              />
            </label>
            <button
              type="submit"
              className="btn-gold mt-4 w-full rounded-xl px-4 py-2.5 font-bold tracking-wide"
            >
              Opprett
            </button>
          </form>
        </details>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold text-white">Bli med med kode</h3>
          <div className="mt-4">
            <JoinForm />
          </div>
        </div>
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
