import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getFriends, getFriendRequests, getUserDirectory } from "@/lib/data";
import FriendRequestActions from "../FriendRequestActions";
import DirectoryButton from "./DirectoryButton";

export const metadata: Metadata = { title: "Venner · Alpha Poker" };

export default async function FriendsPage() {
  const user = await requireUser();
  const [friends, requests, directory] = await Promise.all([
    getFriends(user.id),
    getFriendRequests(user.id),
    getUserDirectory(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <header className="animate-rise mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-black tracking-tight text-white">
          Venner
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Legg til hvem som helst og inviter dem til seriene dine.
        </p>
      </header>

      {requests.incoming.length > 0 && (
        <section className="animate-rise mb-8">
          <SectionTitle>Forespørsler til deg</SectionTitle>
          <ul className="space-y-2.5">
            {requests.incoming.map((req) => (
              <li
                key={req.friendshipId}
                className="glass flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5"
              >
                <span className="font-semibold text-white">@{req.username}</span>
                <FriendRequestActions friendshipId={req.friendshipId} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {requests.outgoing.length > 0 && (
        <section className="animate-rise mb-8">
          <SectionTitle>Sendte forespørsler</SectionTitle>
          <ul className="space-y-2.5">
            {requests.outgoing.map((req) => (
              <li
                key={req.friendshipId}
                className="glass flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5"
              >
                <span className="font-semibold text-zinc-300">
                  @{req.username}
                </span>
                <FriendRequestActions
                  friendshipId={req.friendshipId}
                  showAccept={false}
                  removeLabel="Avbryt"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="animate-rise mb-8">
        <SectionTitle>Vennene dine ({friends.length})</SectionTitle>
        {friends.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Ingen venner ennå — legg til noen fra listen nedenfor.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {friends.map((f) => (
              <li
                key={f.friendshipId}
                className="glass flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5"
              >
                <span className="font-semibold text-white">@{f.username}</span>
                <FriendRequestActions
                  friendshipId={f.friendshipId}
                  showAccept={false}
                  removeLabel="Fjern"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="animate-rise">
        <SectionTitle>Alle spillere</SectionTitle>
        {directory.length === 0 ? (
          <p className="text-sm text-zinc-500">Ingen andre brukere ennå.</p>
        ) : (
          <ul className="space-y-2.5">
            {directory.map((u) => (
              <li
                key={u.userId}
                className="glass flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5"
              >
                <span className="font-semibold text-white">@{u.username}</span>
                <DirectoryButton userId={u.userId} relation={u.relation} />
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
