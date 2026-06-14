import Link from "next/link";
import { requireUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-5 py-3">
          <Link
            href="/dashboard"
            className="font-[family-name:var(--font-display)] text-lg font-black tracking-tight"
          >
            <span className="gold-text">♠ Alpha</span>{" "}
            <span className="text-white">Poker</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              Dashbord
            </Link>
            <Link
              href="/friends"
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              Venner
            </Link>
            <Link
              href="/laer"
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              Lær
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-zinc-400 sm:inline">
              @{user.username}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
