import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trener · Alpha Poker",
  description:
    "Øv på poker mot maskinen, få coaching på avgjørelsene dine, og klatre på ferdighets-ledertavlen.",
};

export default function TrenerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-5 py-3">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-black tracking-tight"
          >
            <span className="gold-text">♠ Alpha</span>{" "}
            <span className="text-white">Poker</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/laer"
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              Lær
            </Link>
            <Link
              href="/trener/ledertavle"
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              Ledertavle
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
